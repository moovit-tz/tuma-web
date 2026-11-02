import "server-only";
import { createHash } from "node:crypto";
import { desc, sql } from "drizzle-orm";
import { auditLog } from "./db/schema";
import type { Tx } from "./db/client";

export type AuditEntry = {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  device?: string;
};

/**
 * Append to the tamper-evident audit log (FR-PLT-04, NFR-15).
 * Each row stores sha256(prevHash + row), so editing or deleting any row breaks the chain.
 * An advisory lock serialises writers so the chain stays linear.
 */
export async function audit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
  const [last] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.id)).limit(1);
  const prevHash = last?.hash ?? "GENESIS";
  const at = new Date();
  const body = JSON.stringify({ ...entry, at: at.toISOString() });
  const hash = createHash("sha256").update(prevHash).update(body).digest("hex");
  await tx.insert(auditLog).values({
    at,
    actorId: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
    device: entry.device,
    prevHash,
    hash,
  });
}
