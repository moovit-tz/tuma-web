"use server";
import { refresh } from "next/cache";
import { ZodError } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { agentCancel, agentMove, agentParcel, agentPaymentStatus, agentRequestPayment } from "@/server/services/agent-parcels";
import { priceDropOff } from "@/server/services/sender";
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
    if (e instanceof DomainError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the details and try again." };
    console.error(e);
    return { ok: false, error: "Something went wrong. Try again." };
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

export async function agentPayStatusAction(waybill: string, id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false as const, error: "Your session has ended. Sign in again." };
    const r = await agentPaymentStatus(user, waybill, id);
    if (r.payment.status !== "pending") refresh();
    return { ok: true as const, data: { status: r.payment.status, failureMessage: r.payment.failureMessage } };
  } catch (e) {
    return { ok: false as const, error: e instanceof DomainError ? e.message : "Something went wrong. Try again." };
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
