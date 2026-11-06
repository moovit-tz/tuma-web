import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { generatedReferences, referenceAllocator, referencePrefixes } from "../db/schema";
import { allocatorStatus, issueReference, resolveReference } from "../adapters/references";
import { formatReference, isReference, prefixOrder, referenceTypeOf } from "@/domain/reference-number";

const next = (ref: string) => {
  const p = ref.slice(0, 3);
  const n = Number(ref.slice(3));
  return { p, n };
};

describe("reference allocator (local mode)", () => {
  it("gives each kind its own sequence and tag, so a case never looks like a parcel", async () => {
    const a = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    const a2 = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    const b = await issueReference({ type: "CASE", entityId: randomUUID() });
    const c = await issueReference({ type: "CARGO", entityId: randomUUID() });
    for (const r of [a, a2, b, c]) expect(isReference(r.referenceNumber)).toBe(true);
    expect(a.referenceNumber).toMatch(/^[A-Z]{3}\d{3}$/);
    expect(b.referenceNumber).toMatch(/^CS-[A-Z]{3}\d{3}$/);
    expect(c.referenceNumber).toMatch(/^CG-[A-Z]{3}\d{3}$/);
    expect(referenceTypeOf(b.referenceNumber)).toBe("CASE");
    expect(referenceTypeOf(c.referenceNumber)).toBe("CARGO");
    // Parcels count on their own: a case or cargo in between doesn't take a parcel number.
    const ord = (r: string) => prefixOrder(next(r).p) * 1000 + next(r).n;
    const p3 = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    expect(ord(p3.referenceNumber) - ord(a2.referenceNumber)).toBe(1);
    expect(await resolveReference(b.referenceNumber)).toMatchObject({ referenceType: "CASE", entityId: b.entityId, status: "ISSUED" });
  });

  it("gives a record the same number every time, and never two for one request", async () => {
    const entityId = randomUUID();
    const first = await issueReference({ type: "PARCEL", entityId });
    expect((await issueReference({ type: "PARCEL", entityId })).referenceNumber).toBe(first.referenceNumber);
    expect((await issueReference({ type: "PARCEL", entityId, idempotencyKey: "retry-key-" + entityId })).referenceNumber).toBe(first.referenceNumber);
    await expect(issueReference({ type: "PARCEL", entityId: randomUUID(), idempotencyKey: `TRANSX-PARCEL-${entityId}` })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
  });

  it("stays unique and gap-free under concurrent requests", async () => {
    const got = await Promise.all(Array.from({ length: 40 }, () => issueReference({ type: "PARCEL", entityId: randomUUID() })));
    const nums = got.map((g) => g.referenceNumber);
    expect(new Set(nums).size).toBe(40);
    const ords = nums.map((r) => prefixOrder(r.slice(0, 3)) * 999 + Number(r.slice(3))).sort((p, q) => p - q);
    // 40 consecutive positions in the global order (prefix rollover included).
    expect(ords[39] - ords[0]).toBe(39);
  });

  it("exhausts a prefix at 999 and opens the next one at 001", async () => {
    await issueReference({ type: "PARCEL", entityId: randomUUID() }); // make sure the cursor exists
    const [cur] = await db.select().from(referenceAllocator).where(eq(referenceAllocator.id, 1));
    if (cur.nextSequence < 999) await db.update(referenceAllocator).set({ nextSequence: 999 }).where(eq(referenceAllocator.id, 1));
    const [prefix] = await db.select().from(referencePrefixes).where(eq(referencePrefixes.id, cur.activePrefixId));
    const last = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    expect(last.referenceNumber).toBe(formatReference(prefix.prefix, 999));
    const firstOfNext = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    expect(firstOfNext.referenceNumber.slice(3)).toBe("001");
    expect(prefixOrder(firstOfNext.referenceNumber.slice(0, 3))).toBeGreaterThan(prefix.prefixOrder);
    const [old] = await db.select().from(referencePrefixes).where(eq(referencePrefixes.id, prefix.id));
    expect(old.status).toBe("EXHAUSTED");
    const status = await allocatorStatus();
    expect(status.activePrefix).toBe(firstOfNext.referenceNumber.slice(0, 3));
    expect(status.nextSequence).toBe(2);
  });

  it("refuses to change or delete issued references, reactivate a prefix, or rewind the cursor", async () => {
    const r = await issueReference({ type: "PARCEL", entityId: randomUUID() });
    await expect(db.update(generatedReferences).set({ referenceNumber: "ZZZ999" }).where(eq(generatedReferences.referenceNumber, r.referenceNumber))).rejects.toThrow();
    await expect(db.delete(generatedReferences).where(eq(generatedReferences.referenceNumber, r.referenceNumber))).rejects.toThrow();
    const [ex] = await db.select().from(referencePrefixes).where(eq(referencePrefixes.status, "EXHAUSTED")).limit(1);
    if (ex) await expect(db.update(referencePrefixes).set({ status: "ACTIVE" }).where(eq(referencePrefixes.id, ex.id))).rejects.toThrow();
    await expect(db.execute(sql`update reference_allocator set next_sequence = 1 where id = 1`)).rejects.toThrow();
  });
});
