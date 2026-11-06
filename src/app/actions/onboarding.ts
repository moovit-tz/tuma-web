"use server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/errors";
import { kybSchema, lookupBusiness, submitKyb } from "@/server/services/kyb";
import { allowLookup } from "@/server/services/tracking";
import type { RegistryRecord } from "@/domain/brela";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: "signed_out" | "invalid" | "has_account" | "closed" | "server"; fields?: string[] };

/** Self-onboarding from the web: submit (or resubmit) the signed-in person's business application. */
export async function submitOnboardingAction(input: unknown): Promise<OnboardingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "signed_out" };
  const parsed = kybSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))] };
  try {
    await submitKyb({ user, driver: null }, input);
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: "invalid", fields: [...new Set(e.issues.map((i) => i.path.join(".")))] };
    if (e instanceof DomainError) return { ok: false, error: e.code === "HAS_ACCOUNT" ? "has_account" : "closed" };
    console.error(e);
    return { ok: false, error: "server" };
  }
}

export type LookupResult = { ok: true; results: RegistryRecord[] } | { ok: false; error: "signed_out" | "short" | "unavailable" | "busy" };

/** Company lookup in the BRELA register (through ComplyOS) for step one of the web application. */
export async function lookupBusinessAction(input: { kind?: "company" | "business_name"; query: string }): Promise<LookupResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "signed_out" };
  if (!allowLookup(`brela:${user.id}`)) return { ok: false, error: "busy" };
  try {
    const { results } = await lookupBusiness(input);
    return { ok: true, results };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: "short" };
    return { ok: false, error: "unavailable" };
  }
}
