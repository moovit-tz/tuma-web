"use server";
import { headers } from "next/headers";
import { allowLookup } from "@/server/services/tracking";
import { DomainError } from "@/server/services/shipments";
import { submitRating } from "@/server/services/ratings";

/** The receiver rates the Tuma point from the link in their SMS. */
export async function rateAction(token: string, input: { stars: number; issue?: string; comment?: string }): Promise<{ ok: true } | { ok: false; error: "rated" | "expired" | "not_found" | "failed" }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowLookup(`rate:${ip}`)) return { ok: false, error: "failed" };
  try {
    await submitRating(token, input);
    return { ok: true };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.code === "ALREADY_RATED" ? "rated" : e.code === "EXPIRED" ? "expired" : e.code === "NOT_FOUND" ? "not_found" : "failed" };
    return { ok: false, error: "failed" };
  }
}
