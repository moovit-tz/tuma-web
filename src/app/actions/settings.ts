"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { ZodError } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/errors";
import { putSetting } from "@/server/settings";
import type { ActionResult } from "./shipments";

/** Save the parcels a business under review may handle. */
export async function savePendingAllowanceAction(value: number): Promise<ActionResult<{ value: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    const v = await putSetting(user, "pendingParcelAllowance", value);
    refresh();
    return { ok: true, data: { value: v } };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: await tErr("Enter a whole number from 0 to 10,000.") };
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

/** Save how people reach Tuma support (phone, WhatsApp, email, hours), shown in the app's Help screen. */
export async function saveSupportContactsAction(value: unknown): Promise<ActionResult<{ saved: true }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
  try {
    await putSetting(user, "supportContacts", value);
    refresh();
    return { ok: true, data: { saved: true } };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: await tErr(e.issues[0]?.message ?? "Check the details.") };
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}
