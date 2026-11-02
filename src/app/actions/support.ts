"use server";
import { headers } from "next/headers";
import { allowLookup } from "@/server/services/tracking";
import { businessSchema, contactSchema, lostItemSchema, submitSupportRequest, type SupportKind } from "@/server/services/support";

export type SupportResult = { ok: true; ref: string } | { ok: false; error: "invalid" | "limited" | "server"; fields?: string[] };

const SCHEMAS = { lost_item: lostItemSchema, contact: contactSchema, business: businessSchema } as const;

export async function submitSupportAction(kind: SupportKind, input: Record<string, unknown>, locale: string): Promise<SupportResult> {
  // Honeypot: real people never fill the hidden "website" field.
  if (input.website) return { ok: true, ref: "OK" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowLookup(`form:${ip}`)) return { ok: false, error: "limited" };
  const parsed = SCHEMAS[kind].safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  try {
    const ref = await submitSupportRequest(kind, parsed.data as never, locale === "sw" ? "sw" : "en");
    return { ok: true, ref };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "server" };
  }
}
