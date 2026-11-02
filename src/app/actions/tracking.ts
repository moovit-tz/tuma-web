"use server";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { allowLookup, requestTrackingOtp, verifyTrackingOtp, type OtpRequestResult } from "@/server/services/tracking";

async function ipAllowed(prefix: string) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return allowLookup(`${prefix}:${ip}`);
}

/** Text a one-time code to the receiver's phone. */
export async function requestOtpAction(waybill: string): Promise<OtpRequestResult> {
  if (!(await ipAllowed("otp-send"))) return { ok: false, error: "too_many" };
  return requestTrackingOtp(waybill);
}

/** Check the code; on success remember the proof for 30 minutes and re-render with full details. */
export async function verifyOtpAction(waybill: string, code: string): Promise<{ ok: true } | { ok: false; error: "invalid" | "expired" | "locked" }> {
  if (!(await ipAllowed("otp-check"))) return { ok: false, error: "locked" };
  const r = await verifyTrackingOtp(waybill, code);
  if (!r.ok) return r;
  (await cookies()).set(`tuma_trk_${waybill}`, r.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1800, path: "/" });
  refresh();
  return { ok: true };
}
