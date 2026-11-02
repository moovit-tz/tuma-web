import "server-only";

/**
 * Hudumika FinOps adapter (section 9.4). The only ledger in the platform.
 * STUB until the FinOps contract and sandbox exist: standing checks return a healthy prepaid
 * balance, except for accounts whose id contains "lowbal" (lets QA exercise FR-FIN-03).
 */
export type Standing = { ok: boolean; kind: "prepaid" | "credit"; available: number; currency: "TZS"; stale: boolean };

export async function checkStanding(accountId: string, amount: number): Promise<Standing> {
  const available = accountId.includes("lowbal") ? 5_000 : 5_000_000;
  return { ok: available >= amount, kind: "prepaid", available, currency: "TZS", stale: false };
}
