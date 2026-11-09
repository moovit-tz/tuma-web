"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { cancelApproval, decideApproval, requestWalletAdjustment } from "@/server/services/admin/approvals";
import { reviewAccess } from "@/server/services/admin/access-reviews";
import { revealCustomerField, searchCustomers, updateSupportCase } from "@/server/services/admin/support-desk";
import { recheckPayment } from "@/server/services/admin/finance";
import { retryFailed } from "@/server/services/admin/integrations";
import { createPartner, updatePartner } from "@/server/services/admin/partners";
import type { ActionResult } from "./shipments";

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Each admin action re-reads the session; the service checks the permission next to the data. */
async function run<T>(fn: (user: User) => Promise<T>, opts: { refresh?: boolean } = { refresh: true }): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
    const data = await fn(user);
    if (opts.refresh !== false) refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    if (e instanceof z.ZodError) return { ok: false, error: await tErr(e.issues[0]?.message ?? "Check the form.") };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

export async function decideApprovalAction(id: string, approve: boolean, note?: string) {
  return run((u) => decideApproval(u, id, { approve, note: note || undefined }));
}

export async function cancelApprovalAction(id: string) {
  return run((u) => cancelApproval(u, id));
}

export async function reviewAccessAction(userId: string, decision: "keep" | "revoke", note?: string) {
  return run((u) => reviewAccess(u, userId, { decision, note: note || undefined }));
}

export async function updateSupportCaseAction(id: string, status: string, note?: string) {
  return run((u) => updateSupportCase(u, id, { status, note: note || undefined }));
}

export async function searchCustomersAction(q: string) {
  return run((u) => searchCustomers(u, q), { refresh: false });
}

export async function revealCustomerFieldAction(key: string, field: "phone" | "name" | "email", reason: string) {
  return run((u) => revealCustomerField(u, { key, field, reason }), { refresh: false });
}

export async function recheckPaymentAction(source: "momo" | "topup", reference: string) {
  return run((u) => recheckPayment(u, { source, reference }));
}

export async function walletAdjustmentAction(input: { userId: string; amount: number; reason: string; waybill?: string }) {
  return run((u) => requestWalletAdjustment(u, { ...input, waybill: input.waybill || undefined }));
}

/* -------------------------------------------------- grants and break-glass */

export async function grantChangeAction(roleKey: string, permission: string, v: Record<string, string>) {
  const { requestGrantChange } = await import("@/server/services/admin/grants");
  return run((u) => requestGrantChange(u, { roleKey, permission, scope: v.scope, maxAmount: v.maxAmount, reason: v.reason }));
}

export async function breakglassAction(v: Record<string, string>) {
  const { requestElevation } = await import("@/server/services/admin/breakglass");
  return run((u) => requestElevation(u, v));
}

export async function endBreakglassAction(id: string) {
  const { endElevation } = await import("@/server/services/admin/breakglass");
  return run((u) => endElevation(u, id));
}

export async function reviewBreakglassAction(id: string) {
  const { reviewElevation } = await import("@/server/services/admin/breakglass");
  return run((u) => reviewElevation(u, id));
}

/* ------------------------------------------------------------ phase 2: trust */

const claimsSvc = () => import("@/server/services/admin/claims");
const riskSvc = () => import("@/server/services/admin/risk");
const compSvc = () => import("@/server/services/admin/compliance");
const payoutSvc = () => import("@/server/services/admin/payouts");

export async function openClaimAction(v: Record<string, string>) {
  const { openClaim } = await claimsSvc();
  return run((u) => openClaim(u, { ...v, claimantPhone: v.claimantPhone || undefined }));
}
export async function addEvidenceAction(id: string, v: Record<string, string>) {
  const { addEvidence } = await claimsSvc();
  return run((u) => addEvidence(u, id, v));
}
export async function setLiabilityAction(id: string, v: Record<string, string>) {
  const { setLiability } = await claimsSvc();
  return run((u) => setLiability(u, id, { liableParty: v.liableParty, liableId: v.liableId || undefined }));
}
export async function decideClaimAction(id: string, v: Record<string, string>) {
  const { decideClaim } = await claimsSvc();
  return run((u) => decideClaim(u, id, { outcome: v.outcome, amount: v.amount || undefined, note: v.note }));
}
export async function recoveryAction(id: string, v: Record<string, string>) {
  const { recordRecovery } = await claimsSvc();
  return run((u) => recordRecovery(u, id, v));
}

/** [done] is the page's message with {n} for how many new alerts. */
export async function runRiskAction(done: string) {
  const { runChecksNow } = await riskSvc();
  const r = await run((u) => runChecksNow(u));
  return r.ok ? { ...r, message: done.replace("{n}", String(r.data?.created ?? 0)) } : r;
}
export async function dismissAlertAction(id: string) {
  const { dismissAlert } = await riskSvc();
  return run((u) => dismissAlert(u, id));
}
export async function openCaseAction(alertId: string) {
  const { openCase } = await riskSvc();
  return run((u) => openCase(u, alertId));
}
export async function caseNoteAction(id: string, v: Record<string, string>) {
  const { addCaseNote } = await riskSvc();
  return run((u) => addCaseNote(u, id, v));
}
export async function closeCaseAction(id: string, v: Record<string, string>) {
  const { closeCase } = await riskSvc();
  return run((u) => closeCase(u, id, v));
}
export async function freezeAction(v: Record<string, string>) {
  const { placeHold } = await riskSvc();
  return run((u) => placeHold(u, { ...v, caseId: v.caseId || undefined }));
}
export async function releaseAction(holdId: string, v: Record<string, string>) {
  const { requestRelease } = await riskSvc();
  return run((u) => requestRelease(u, holdId, v));
}
export async function ruleAction(key: string, v: Record<string, string>) {
  const { updateRule } = await riskSvc();
  return run((u) => updateRule(u, key, v));
}

export async function submitKycAction(v: Record<string, string>) {
  const { submitKyc } = await compSvc();
  return run((u) => submitKyc(u, { ...v, note: v.note || undefined }));
}
export async function reviewKycAction(id: string, approve: boolean) {
  const { reviewKyc } = await compSvc();
  return run((u) => reviewKyc(u, id, approve));
}
export async function screenAction(v: Record<string, string>) {
  const { screenName } = await compSvc();
  return run((u) => screenName(u, v));
}
export async function reviewScreeningAction(id: string, v: Record<string, string>) {
  const { reviewScreening } = await compSvc();
  return run((u) => reviewScreening(u, id, v));
}
export async function watchlistAction(v: Record<string, string>) {
  const { addWatchlist } = await compSvc();
  return run((u) => addWatchlist(u, { ...v, country: v.country || undefined, note: v.note || undefined }));
}
export async function openDsrAction(v: Record<string, string>) {
  const { openDsr } = await compSvc();
  return run((u) => openDsr(u, { ...v, detail: v.detail || undefined }));
}
export async function closeDsrAction(id: string, v: Record<string, string>) {
  const { closeDsr } = await compSvc();
  return run((u) => closeDsr(u, id, v));
}

export async function proposePayoutsAction(v: Record<string, string>) {
  const { proposePayouts } = await payoutSvc();
  return run((u) => proposePayouts(u, v));
}
export async function markPaidAction(id: string, v: Record<string, string>) {
  const { markPayoutPaid } = await payoutSvc();
  return run((u) => markPayoutPaid(u, id, v));
}

export async function retryIntegrationAction(key: string) {
  return run((u) => retryFailed(u, key));
}

export async function savePartnerAction(id: string | null, input: unknown) {
  return run((u) => (id ? updatePartner(u, id, input) : createPartner(u, input)));
}
