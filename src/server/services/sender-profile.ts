import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";

/**
 * Setting up to send and receive parcels (the app's sender sign-up): the person's area, so the nearest Tuma points
 * come first; their language for messages; and a phone number when Ondi doesn't have one (parcels need it, and
 * parcels coming to that number show up in the app).
 */
const schema = z.object({
  region: z.enum(TZ_REGIONS as unknown as [string, ...string[]], { message: "Choose your region" }),
  district: z.string().trim().min(2).max(60).optional(),
  language: z.enum(["en", "sw"]).optional(),
  phone: z.string().trim().min(9).max(20).optional(),
});

export async function setUpSender(user: CurrentUser, raw: unknown) {
  const b = schema.parse(raw);
  const [me] = await db.select({ phone: users.phone, sender: users.senderProfile }).from(users).where(eq(users.id, user.id));
  let phone: string | undefined;
  if (!me?.phone) {
    const e164 = b.phone ? toE164(b.phone) : null;
    if (!e164) throw new DomainError("PHONE_REQUIRED", "Add your phone number: Tuma points and receivers need it.");
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.phone, e164));
    if (taken && taken.id !== user.id) throw new DomainError("PHONE_TAKEN", "That number is on another Tuma account. Sign in with that account, or use another number.", 409);
    phone = e164;
  }
  const profile = { region: b.region, ...(b.district ? { district: b.district } : {}), since: me?.sender?.since ?? new Date().toISOString() };
  await db
    .update(users)
    .set({ senderProfile: profile, ...(phone ? { phone } : {}), ...(b.language ? { locale: b.language } : {}) })
    .where(eq(users.id, user.id));
  return { sender: profile, phone: phone ?? me?.phone ?? null };
}
