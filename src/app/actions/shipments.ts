"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  DomainError,
  cancelShipment,
  createParcel,
  quoteParcel,
  raiseException,
  resolveException,
  transition,
  updateConsignee,
} from "@/server/services/shipments";
import { parcelOrderSchema } from "@/domain/order-schema";
import { toE164TZ } from "@/domain/phone";
import type { ShipmentState } from "@/domain/states";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Every action re-reads the session and authorises itself; the service re-checks permissions next to the data. */
async function run<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data, message };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

async function me() {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("UNAUTHENTICATED", "Your session has ended. Sign in again.", 401);
  return user;
}

function flatten(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.join(".");
    out[key] ??= i.message;
  }
  return out;
}

/* ------------------------------------------------------------------ order */

export async function quoteAction(input: unknown) {
  if (!(await getCurrentUser())?.permissions.has("shipment.create")) return null;
  const parsed = parcelOrderSchema.safeParse(input);
  if (!parsed.success) return null;
  const q = await quoteParcel(parsed.data);
  return q;
}

export async function createParcelAction(input: unknown): Promise<ActionResult<{ waybill: string; duplicateRef: boolean }>> {
  const parsed = parcelOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: flatten(parsed.error.issues) };
  try {
    const user = await me();
    const { shipment, duplicateRef } = await createParcel(user, parsed.data, "portal");
    return { ok: true, data: { waybill: shipment.waybill, duplicateRef } };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

/* -------------------------------------------------------------- lifecycle */

export async function cancelAction(waybill: string, reason: string) {
  return run(async () => cancelShipment(await me(), waybill, reason.trim() || "Cancelled by user"));
}

const transitionSchema = z.object({
  waybill: z.string(),
  to: z.string(),
  reasonCode: z.string().optional(),
  note: z.string().max(500).optional(),
  simulate: z.boolean().optional(),
  collectMethod: z.enum(["cash", "mobile_money", "card"]).optional(),
});

export async function transitionAction(input: z.input<typeof transitionSchema>) {
  const p = transitionSchema.parse(input);
  return run(async () => {
    const user = await me();
    // Simulated field events stand in for the field app and still go through the same rules.
    const source = p.simulate ? "scan" : "manual";
    if (p.simulate && !user.permissions.has("dev.simulate")) throw new DomainError("FORBIDDEN", "Simulation is not allowed for your role.", 403);
    return transition(user, p.waybill, p.to as ShipmentState, {
      source,
      reasonCode: p.reasonCode || undefined,
      note: p.note || undefined,
      pod: p.to === "DELIVERED" ? { method: "otp" } : undefined,
      collectMethod: p.collectMethod,
    });
  });
}

export async function raiseExceptionAction(waybill: string, reasonCode: string, note: string) {
  return run(async () => raiseException(await me(), waybill, reasonCode, note || undefined));
}

export async function resolveExceptionAction(exceptionId: string, resolution: string) {
  return run(async () => resolveException(await me(), exceptionId, resolution || "Resolved"));
}

export async function updateConsigneeAction(waybill: string, patch: { name?: string; phone?: string; landmark?: string; instructions?: string }) {
  if (patch.phone) {
    const e164 = toE164TZ(patch.phone);
    if (!e164) return { ok: false as const, error: "Enter a Tanzanian mobile number, e.g. 0712 345 678" };
    patch.phone = e164;
  }
  return run(async () => updateConsignee(await me(), waybill, patch));
}
