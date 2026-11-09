"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { cancelApproval, decideApproval, requestWalletAdjustment } from "@/server/services/admin/approvals";
import { reviewAccess } from "@/server/services/admin/access-reviews";
import { revealCustomerField, searchCustomers, updateSupportCase } from "@/server/services/admin/support-desk";
import { recheckPayment } from "@/server/services/admin/finance";
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
    if (e instanceof DomainError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
    console.error(e);
    return { ok: false, error: "Something went wrong. Try again." };
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
