"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { ZodError } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { agentBook, agentCancel, agentMove, agentParcel, agentPaymentStatus, agentRequestPayment, collectionPoints } from "@/server/services/agent-parcels";
import { agentCustomers, deleteCustomer, dismissDuplicates, mergeCustomers, reportCustomer, updateCustomer } from "@/server/services/customers";
import { requestMomoSetup, updatePaymentSettings } from "@/server/services/agent-payments";
import { updateWorkflow } from "@/server/services/agent-settings";
import { priceDropOff, tumaPoints } from "@/server/services/sender";
import { createManifest, offloadParcel } from "@/server/services/manifests";
import { requestTrackingOtp } from "@/server/services/tracking";
import type { ActionResult } from "./shipments";

/**
 * The agent's parcel desk on the web: the same moves the Tuma app makes at the counter (receive and price, ready for
 * collection, hand over with the receiver's code, a failed attempt, cancel), through the same services, which check
 * the person's permissions next to the data.
 */
async function run<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new DomainError("UNAUTHENTICATED", "Your session has ended. Sign in again.", 401);
    const data = await fn(user);
    refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    if (e instanceof ZodError) return { ok: false, error: await tErr(e.issues[0]?.message ?? "Check the details and try again.") };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

export type MoveInput = { to: string; reasonCode?: string; note?: string; receiverName?: string; code?: string; collectMethod?: "cash" | "mobile_money" };

export async function agentMoveAction(waybill: string, input: MoveInput) {
  return run(async (u) => {
    await agentMove(u, waybill, input);
    return null;
  });
}

export async function agentCancelAction(waybill: string, input: { reasonCode: string; note?: string }) {
  return run(async (u) => {
    const r = await agentCancel(u, waybill, input);
    return { refundDue: r.refundDue, refundedToWallet: r.refundedToWallet };
  });
}

/** A parcel booked ahead from someone's phone, priced now it's on the counter; then paid (or waiting for payment). */
export async function agentPriceAction(waybill: string, input: { price: number; weightKg?: number }) {
  return run(async (u) => {
    const r = await priceDropOff(u, waybill, input);
    return { awaitingPayment: Boolean(r.parcel.awaitingPayment), state: r.parcel.state as string };
  });
}

/** Cash taken at the counter, or a mobile-money prompt to a phone (then poll [agentPayStatusAction]). */
export async function agentPayAction(waybill: string, input: { method: "cash" } | { method: "mobile_money"; phone: string }) {
  return run(async (u) => {
    const r = await agentRequestPayment(u, waybill, input);
    return { payment: r.payment ? { id: r.payment.id, status: r.payment.status, failureMessage: r.payment.failureMessage } : null };
  });
}

/** Counter staff asking whoever manages payments to turn mobile money on. */
export async function requestMomoSetupAction() {
  return run((u) => requestMomoSetup(u));
}

export async function agentPayStatusAction(waybill: string, id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false as const, error: "Your session has ended. Sign in again." };
    const r = await agentPaymentStatus(user, waybill, id);
    if (r.payment.status !== "pending") refresh();
    return { ok: true as const, data: { status: r.payment.status, failureMessage: r.payment.failureMessage } };
  } catch (e) {
    return { ok: false as const, error: await tErr(e instanceof DomainError ? e.message : "Something went wrong. Try again.") };
  }
}

/** Text the receiver a fresh code: they read it out at the counter to take the parcel. */
export async function agentSendCodeAction(waybill: string) {
  return run(async (u) => {
    if (!u.permissions.has("shipment.deliver")) throw new DomainError("FORBIDDEN", "You can't hand over parcels.", 403);
    // Only for one of this office's parcels (throws NOT_FOUND otherwise).
    await agentParcel(u, waybill);
    const r = await requestTrackingOtp(waybill);
    if (!r.ok) throw new DomainError("CODE_NOT_SENT", r.retryInSec ? `Wait ${r.retryInSec}s before sending another code.` : "We couldn't send a code. Try again.");
    return { maskedPhone: r.maskedPhone, devCode: r.devCode };
  });
}

/* ----------------------------------------------------------------- booking */

/** Book a parcel over the counter (the app's counter form): booked and, normally, received in one go. */
export async function agentBookAction(input: unknown) {
  return run(async (u) => {
    const r = await agentBook(u, input);
    return { waybill: r.parcel.waybill, awaitingPayment: Boolean(r.parcel.awaitingPayment) };
  });
}

/** Saved customers matching a phone or name, for the booking form (phone first, as at the counter). */
export async function agentCustomerSearchAction(q: string, kind?: "individual" | "company") {
  try {
    const user = await getCurrentUser();
    if (!user || q.trim().length < 3) return [];
    const r = await agentCustomers(user, { q, kind, limit: 6 });
    return r.customers.map((c) => ({
      id: c.id,
      kind: c.kind as "individual" | "company",
      name: c.name,
      phone: c.phone,
      email: c.email,
      tin: c.tin,
      regNo: c.regNo,
      contactName: c.contactName,
      region: c.region,
      district: c.district,
      landmark: c.landmark,
      flagged: c.flagged,
    }));
  } catch {
    return [];
  }
}

/** Where the receiver can collect in that region: this business's other offices, then Tuma's points. */
export async function agentCollectionPointsAction(region: string, district?: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.permissions.has("agent.workspace")) return { offices: [], points: [] };
    const r = await collectionPoints(user, region, district);
    return {
      offices: r.offices.map((o) => ({ id: o.id, name: o.name, district: o.district, inDistrict: o.inDistrict })),
      points: r.points.map((p) => ({ id: p.id, name: p.name, district: p.district, landmark: p.landmark, inDistrict: p.inDistrict })),
    };
  } catch {
    return { offices: [], points: [] };
  }
}

/* --------------------------------------------------------------- manifests */

/** Send parcels on under one manifest: to the doors (own courier or a Tuma courier) or to a Tuma point. */
export async function createManifestAction(input: unknown) {
  return run(async (u) => {
    const m = await createManifest(u, input);
    return { id: m.id, ref: m.ref };
  });
}

/** Check one parcel in at this office from a manifest coming to it (scanned or typed). */
export async function offloadAction(manifestId: string, waybill: string) {
  return run(async (u) => {
    const r = await offloadParcel(u, manifestId, { waybill });
    return { waybill: r.checkedIn.waybill, state: r.checkedIn.state as string, receiver: r.checkedIn.receiver, done: r.manifest.status === "arrived" };
  });
}

/** Tuma points to send a run to (other agents' offices and the business's own), for the manifest form. */
export async function tumaPointsAction(q: string, region?: string) {
  try {
    const r = await tumaPoints({ q: q.trim() || undefined, region });
    return r.points.map((p) => ({ id: p.id, name: p.name, business: p.business, region: p.region, district: p.district }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------ money and customers */

/** Mobile money (with where takings are paid out) and pay on delivery. Whoever manages the float. */
export async function paymentSettingsAction(input: unknown) {
  return run(async (u) => {
    await updatePaymentSettings(u, input);
    return null;
  });
}

export async function customerUpdateAction(id: string, input: unknown) {
  return run(async (u) => (await updateCustomer(u, id, input)).customer);
}

export async function customerDeleteAction(id: string) {
  return run(async (u) => deleteCustomer(u, id));
}

export async function customerReportAction(id: string, input: { reason: string; note?: string }) {
  return run(async (u) => {
    await reportCustomer(u, id, input);
    return null;
  });
}

export async function customerMergeAction(keepId: string, mergeIds: string[]) {
  return run(async (u) => {
    await mergeCustomers(u, { keepId, mergeIds });
    return null;
  });
}

export async function customerNotSameAction(ids: string[]) {
  return run(async (u) => {
    await dismissDuplicates(u, { ids });
    return null;
  });
}

/** What the office does with parcels (agent.workflow.manage). */
export async function workflowAction(workflow: string[]) {
  return run(async (u) => (await updateWorkflow(u, { workflow })).preset);
}
