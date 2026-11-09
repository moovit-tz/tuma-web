"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import {
  assignVehicle,
  clientSchema,
  createInvoice,
  matchCandidates,
  paymentSchema,
  reconcile,
  recordPayment,
  saveClient,
  setClientActive,
  saveVehicle,
  uninvoicedShipments,
  vehicleSchema,
} from "@/server/services/partner";
import { branchSchema, saveBranch } from "@/server/services/branches";

export type PartnerResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fields?: Record<string, string> };

async function run<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<T>, doRefresh = true): Promise<PartnerResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
    const data = await fn(user);
    if (doRefresh) refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export async function assignVehicleAction(waybill: string, vehicleId: string | null) {
  return run((u) => assignVehicle(u, waybill, vehicleId));
}

export async function saveVehicleAction(input: unknown): Promise<PartnerResult<unknown>> {
  const p = vehicleSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(p.error) };
  return run((u) => saveVehicle(u, p.data));
}

export async function saveClientAction(input: unknown): Promise<PartnerResult<unknown>> {
  const p = clientSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(p.error) };
  return run((u) => saveClient(u, p.data));
}

export async function saveBranchAction(input: unknown): Promise<PartnerResult<unknown>> {
  const p = branchSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(p.error) };
  return run((u) => saveBranch(u, p.data));
}

export async function setClientActiveAction(id: string, active: boolean) {
  return run((u) => setClientActive(u, id, active));
}

export async function uninvoicedAction(clientId: string) {
  return run((u) => uninvoicedShipments(u, clientId), false);
}

export async function createInvoiceAction(clientId: string, waybills: string[]) {
  return run(async (u) => (await createInvoice(u, clientId, waybills)).number);
}

export async function recordPaymentAction(input: unknown): Promise<PartnerResult<{ matched: string | null }>> {
  const p = paymentSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(p.error) };
  return run((u) => recordPayment(u, p.data));
}

export async function matchCandidatesAction(paymentId: string) {
  return run((u) => matchCandidates(u, paymentId), false);
}

export async function reconcileAction(paymentId: string, invoiceId: string) {
  return run((u) => reconcile(u, paymentId, invoiceId));
}
