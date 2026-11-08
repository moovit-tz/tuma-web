import "server-only";
import { z } from "zod";
import { db } from "../../db/client";
import { audit } from "../../audit";
import { DomainError } from "../shipments";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Personal details in the admin console are masked unless the viewer holds pii.view: "+255 71• ••• 600",
 * "Neema R.". Revealing one (support calling a customer back) needs a reason and is written to the audit trail.
 */

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^\d+]/g, "");
  if (d.length < 7) return "•••";
  return `${d.slice(0, 6)}${"•".repeat(Math.max(3, d.length - 9))}${d.slice(-3)}`;
}

export function maskName(name: string | null | undefined): string | null {
  if (!name) return null;
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest.map((w) => `${w[0]}.`).join(" ")}` : first;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [u, d] = email.split("@");
  return `${u.slice(0, 1)}•••@${d ?? ""}`;
}

/** What this viewer may see: the real value with pii.view, the masked one otherwise. */
export function shown(user: CurrentUser) {
  const all = user.permissions.has("pii.view");
  return {
    unmasked: all,
    phone: (p: string | null | undefined) => (all ? (p ?? null) : maskPhone(p)),
    name: (n: string | null | undefined) => (all ? (n ?? null) : maskName(n)),
    email: (e: string | null | undefined) => (all ? (e ?? null) : maskEmail(e)),
  };
}

export const revealSchema = z.object({
  entity: z.enum(["user", "shipment", "support_request"]),
  entityId: z.string().min(1).max(120),
  field: z.enum(["phone", "name", "email", "address"]),
  reason: z.string().trim().min(5, "Say why you need it (at least 5 characters)").max(300),
});

/**
 * Logs that someone without pii.view saw one detail, and why. The caller then returns the value. Support staff
 * (support.view) may reveal what they need for a case; the trail is reviewed in the access reviews.
 */
export async function logReveal(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("support.view") && !user.permissions.has("pii.view")) throw new DomainError("FORBIDDEN", "You can't see personal details.", 403);
  const r = revealSchema.parse(raw);
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "pii.reveal", entity: r.entity, entityId: r.entityId, after: { field: r.field, reason: r.reason } }));
  return r;
}
