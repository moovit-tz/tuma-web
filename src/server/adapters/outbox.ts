import "server-only";
import { outbox } from "../db/schema";
import type { Tx } from "../db/client";

export type OutboxTarget = "finops" | "hudufeed" | "bliss" | "crm" | "engine" | "complyos" | "seal" | "hudubi";

/**
 * Queue an integration message in the same transaction as the change that caused it (section 9.1).
 * A dispatcher delivers it at least once; the idempotency key makes the receiver handle it once.
 */
export async function enqueue(
  tx: Tx,
  msg: { target: OutboxTarget; topic: string; idempotencyKey: string; waybill?: string; payload: Record<string, unknown> },
) {
  await tx.insert(outbox).values(msg).onConflictDoNothing({ target: outbox.idempotencyKey });
}
