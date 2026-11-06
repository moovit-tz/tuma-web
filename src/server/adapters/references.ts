import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { generatedReferences, referenceAllocator, referenceIdempotency, referencePrefixes, referenceTypes } from "../db/schema";
import { DomainError } from "../errors";
import {
  REF_FORMAT_VERSION,
  REF_SERIES,
  REFERENCE_TYPES,
  SEQ_MAX,
  BLOCKED_PREFIXES,
  capacity,
  formatReference,
  nextIssuablePrefix,
  prefixAt,
  type ReferenceType,
} from "@/domain/reference-number";

/**
 * Hudumika Reference Number Service client. Every parcel, cargo shipment and support case Tuma creates gets its
 * number here. Each kind has its own sequence and tag (parcels AAA001, cargo CG-AAA001, cases CS-AAA001), so a
 * number says what it is.
 *
 *   REFERENCE_MODE=http   call the shared service (REFERENCE_API_URL, REFERENCE_API_TOKEN) — production
 *   REFERENCE_MODE=local  run the same allocator against Tuma's own database — development, tests, and until the
 *                         shared service is live (the default)
 *
 * Callers pass the record's own UUID as `entityId`; asking twice for the same record returns the same number, and a
 * retry with the same idempotency key never issues a second one. A number is never reused, even if the record that
 * asked for it is then rolled back or cancelled.
 */

export const SOURCE_SYSTEM = "TRANSX";

export type IssueRequest = {
  type: ReferenceType;
  entityId: string;
  tenantId?: string | null;
  /** Defaults to `${SOURCE_SYSTEM}-${type}-${entityId}`. */
  idempotencyKey?: string;
  /** User or service identity, for the registry's audit trail. */
  createdBy?: string;
};

export type IssuedReference = {
  referenceNumber: string;
  referenceType: ReferenceType;
  sourceSystem: string;
  entityId: string;
  formatVersion: number;
  issuedAt: Date;
};

export function referenceMode(): "local" | "http" {
  return process.env.REFERENCE_MODE === "http" ? "http" : "local";
}

/**
 * Issue (or return the already-issued) reference for a record. In local mode, pass the open transaction so the
 * number and the record commit together; http mode ignores it (the service has its own transaction).
 */
export async function issueReference(req: IssueRequest, tx?: Tx): Promise<IssuedReference> {
  const full = { ...req, idempotencyKey: req.idempotencyKey ?? `${SOURCE_SYSTEM}-${req.type}-${req.entityId}`, createdBy: req.createdBy ?? "tuma" };
  if (referenceMode() === "http") return issueHttp(full);
  return tx ? allocateLocal(tx, full) : db.transaction((t) => allocateLocal(t, full));
}

/* ------------------------------------------------------------------ http: the shared service (spec §6) */

async function issueHttp(req: Required<Pick<IssueRequest, "idempotencyKey" | "createdBy">> & IssueRequest): Promise<IssuedReference> {
  const base = process.env.REFERENCE_API_URL;
  const token = process.env.REFERENCE_API_TOKEN;
  if (!base || !token) throw new DomainError("ALLOCATOR_UNAVAILABLE", "Reference service is not configured.", 503);
  // A timeout must never lead to a replacement number: retry with the same key, and the service answers with the
  // reference it already issued.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(new URL("references", base.endsWith("/") ? base : base + "/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": req.idempotencyKey },
        body: JSON.stringify({
          referenceType: req.type,
          sourceSystem: SOURCE_SYSTEM,
          entityId: req.entityId,
          tenantId: req.tenantId ?? undefined,
          idempotencyKey: req.idempotencyKey,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: IssuedReference & { issuedAt: string }; error?: { code?: string; message?: string } };
      if (res.ok && body.data) return { ...body.data, issuedAt: new Date(body.data.issuedAt) };
      // 409 ENTITY_REFERENCE_EXISTS / IDEMPOTENCY_CONFLICT, 4xx: not retryable.
      if (res.status < 500 && res.status !== 429) {
        throw new DomainError(body.error?.code ?? "REFERENCE_FAILED", body.error?.message ?? `Reference service answered ${res.status}.`, res.status);
      }
      lastErr = new DomainError(body.error?.code ?? "ALLOCATOR_UNAVAILABLE", body.error?.message ?? "Reference service unavailable.", 503);
    } catch (e) {
      if (e instanceof DomainError && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  if (lastErr instanceof DomainError) throw lastErr;
  throw new DomainError("ALLOCATOR_UNAVAILABLE", "Reference service unavailable. Try again.", 503);
}

/* ------------------------------------------------------------------ local: the allocator (spec §5) */

const requestHash = (r: IssueRequest) =>
  createHash("sha256").update(JSON.stringify([r.type, SOURCE_SYSTEM, r.entityId, r.tenantId ?? null])).digest("hex");

async function typeId(tx: Tx, code: ReferenceType): Promise<string> {
  const def = REFERENCE_TYPES.find((t) => t.code === code);
  if (!def) throw new DomainError("INVALID_REFERENCE_TYPE", `Unsupported reference type ${code}.`, 400);
  await tx.insert(referenceTypes).values(def).onConflictDoNothing({ target: referenceTypes.code });
  const [t] = await tx.select({ id: referenceTypes.id, active: referenceTypes.active }).from(referenceTypes).where(eq(referenceTypes.code, code));
  if (!t.active) throw new DomainError("REFERENCE_TYPE_FORBIDDEN", `${code} references are switched off.`, 403);
  return t.id;
}

function view(row: typeof generatedReferences.$inferSelect, type: ReferenceType): IssuedReference {
  return { referenceNumber: row.referenceNumber, referenceType: type, sourceSystem: row.sourceSystem, entityId: row.entityId, formatVersion: row.formatVersion, issuedAt: row.issuedAt };
}

/** Record blocked prefixes before `order` as RETIRED, so the history shows every prefix the allocator stepped over. */
async function retireBlocked(tx: Tx, series: ReferenceType, fromOrder: number, toOrder: number) {
  const rows = [];
  for (let o = fromOrder; o < toOrder; o++) {
    const p = prefixAt(o);
    if (BLOCKED_PREFIXES.has(p)) rows.push({ series, prefix: p, prefixOrder: o, status: "RETIRED", exhaustedAt: new Date() });
  }
  if (rows.length) await tx.insert(referencePrefixes).values(rows).onConflictDoNothing();
}

async function activatePrefix(tx: Tx, series: ReferenceType, fromOrder: number) {
  const next = nextIssuablePrefix(fromOrder);
  if (!next) throw new DomainError("REFERENCE_CAPACITY_EXHAUSTED", "Every reference in this format has been issued.", 507);
  await retireBlocked(tx, series, fromOrder, next.order);
  const [p] = await tx.insert(referencePrefixes).values({ series, prefix: next.prefix, prefixOrder: next.order, status: "ACTIVE" }).returning();
  return p;
}

async function allocateLocal(tx: Tx, req: IssueRequest & { idempotencyKey: string; createdBy: string }): Promise<IssuedReference> {
  const tId = await typeId(tx, req.type);
  const hash = requestHash(req);

  // 1. Same request again → same answer; same key with a different request → conflict.
  const [seen] = await tx
    .select({ hash: referenceIdempotency.requestHash, ref: generatedReferences })
    .from(referenceIdempotency)
    .innerJoin(generatedReferences, eq(generatedReferences.id, referenceIdempotency.generatedReferenceId))
    .where(and(eq(referenceIdempotency.sourceSystem, SOURCE_SYSTEM), eq(referenceIdempotency.idempotencyKey, req.idempotencyKey)));
  if (seen) {
    if (seen.hash !== hash) throw new DomainError("IDEMPOTENCY_CONFLICT", "That idempotency key was used for a different request.", 409);
    return view(seen.ref, req.type);
  }

  // 3. Lock this kind's cursor (created on first use). Everything below runs one allocation at a time per kind.
  const series = req.type;
  const cursorId = REF_SERIES[series].cursor;
  let [cur] = await tx.select().from(referenceAllocator).where(eq(referenceAllocator.id, cursorId)).for("update");
  if (!cur) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`reference_allocator_init:${series}`}))`);
    [cur] = await tx.select().from(referenceAllocator).where(eq(referenceAllocator.id, cursorId)).for("update");
    if (!cur) {
      const first = await activatePrefix(tx, series, 0);
      [cur] = await tx.insert(referenceAllocator).values({ id: cursorId, series, activePrefixId: first.id, nextSequence: 1, formatVersion: REF_FORMAT_VERSION }).returning();
    }
  }

  // 2. (after the lock, so two requests for one record can't both pass) A record keeps the number it already has.
  const [existing] = await tx
    .select()
    .from(generatedReferences)
    .where(and(eq(generatedReferences.sourceSystem, SOURCE_SYSTEM), eq(generatedReferences.referenceTypeId, tId), eq(generatedReferences.entityId, req.entityId)));
  if (existing) {
    await tx.insert(referenceIdempotency).values({ sourceSystem: SOURCE_SYSTEM, idempotencyKey: req.idempotencyKey, requestHash: hash, generatedReferenceId: existing.id }).onConflictDoNothing();
    return view(existing, req.type);
  }

  // 4–6. Read the cursor and build the number.
  const [prefix] = await tx.select().from(referencePrefixes).where(eq(referencePrefixes.id, cur.activePrefixId));
  const seq = cur.nextSequence;
  const referenceNumber = formatReference(prefix.prefix, seq, series);

  // 7. Persist it against the record.
  const [row] = await tx
    .insert(generatedReferences)
    .values({
      referenceNumber,
      referenceTypeId: tId,
      entityId: req.entityId,
      sourceSystem: SOURCE_SYSTEM,
      tenantId: req.tenantId ?? null,
      prefixId: prefix.id,
      sequenceNumber: seq,
      formatVersion: cur.formatVersion,
      createdBy: req.createdBy.slice(0, 100),
    })
    .returning();

  // 8. Advance; the 999th number exhausts the prefix and opens the next one straight away.
  if (seq >= SEQ_MAX) {
    await tx.update(referencePrefixes).set({ status: "EXHAUSTED", exhaustedAt: new Date() }).where(eq(referencePrefixes.id, prefix.id));
    const next = await activatePrefix(tx, series, prefix.prefixOrder + 1);
    await tx.update(referenceAllocator).set({ activePrefixId: next.id, nextSequence: 1, updatedAt: new Date() }).where(eq(referenceAllocator.id, cursorId));
  } else {
    await tx.update(referenceAllocator).set({ nextSequence: seq + 1, updatedAt: new Date() }).where(eq(referenceAllocator.id, cursorId));
  }

  // 9. Remember the request.
  await tx.insert(referenceIdempotency).values({ sourceSystem: SOURCE_SYSTEM, idempotencyKey: req.idempotencyKey, requestHash: hash, generatedReferenceId: row.id });
  return view(row, req.type);
}

/* ------------------------------------------------------------------ lookups */

/** Registry lookup (spec §6.2): what a reference is and which record owns it. Local mode only reads Tuma's registry. */
export async function resolveReference(referenceNumber: string) {
  const [r] = await db
    .select({ referenceNumber: generatedReferences.referenceNumber, referenceType: referenceTypes.code, sourceSystem: generatedReferences.sourceSystem, entityId: generatedReferences.entityId, issuedAt: generatedReferences.issuedAt })
    .from(generatedReferences)
    .innerJoin(referenceTypes, eq(referenceTypes.id, generatedReferences.referenceTypeId))
    .where(eq(generatedReferences.referenceNumber, referenceNumber));
  return r ? { ...r, status: "ISSUED" as const } : null;
}

/** Allocator status (spec §6.4) for one kind's sequence (parcels by default), for the capacity dashboard and alerts. */
export async function allocatorStatus(type: ReferenceType = "PARCEL") {
  const [cur] = await db
    .select({ prefix: referencePrefixes.prefix, next: referenceAllocator.nextSequence, formatVersion: referenceAllocator.formatVersion })
    .from(referenceAllocator)
    .innerJoin(referencePrefixes, eq(referencePrefixes.id, referenceAllocator.activePrefixId))
    .where(eq(referenceAllocator.id, REF_SERIES[type].cursor));
  const [{ n }] = await db
    .select({ n: count() })
    .from(generatedReferences)
    .innerJoin(referencePrefixes, eq(referencePrefixes.id, generatedReferences.prefixId))
    .where(eq(referencePrefixes.series, type));
  const cap = capacity(Number(n));
  return {
    formatVersion: cur?.formatVersion ?? REF_FORMAT_VERSION,
    activePrefix: cur?.prefix ?? null,
    nextSequence: cur?.next ?? 1,
    activePrefixRemaining: cur ? SEQ_MAX - cur.next + 1 : SEQ_MAX,
    totalCapacity: cap.total,
    totalIssued: cap.issued,
    remainingCapacity: cap.remaining,
    capacityPercentageUsed: cap.percentUsed,
  };
}
