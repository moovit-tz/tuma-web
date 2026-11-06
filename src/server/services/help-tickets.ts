import "server-only";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import { BlissError, createTicket, getTicket, listTickets, replyToTicket } from "../adapters/bliss";
import { DomainError } from "./shipments";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";

/** What a ticket is about. The app shows these; Bliss gets the English label as the category. */
export const TICKET_TOPICS = {
  parcel: "Parcel or delivery",
  payment: "Payments and float",
  printer: "Printer or labels",
  account: "Account and business",
  app: "App problem",
  other: "Other",
} as const;

export const newTicketSchema = z.object({
  topic: z.enum(Object.keys(TICKET_TOPICS) as [keyof typeof TICKET_TOPICS, ...(keyof typeof TICKET_TOPICS)[]]),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(4000),
  waybill: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const { waybill } = normaliseWaybill(v);
      if (!isValidWaybill(waybill)) {
        ctx.addIssue({ code: "custom", message: "waybill" });
        return z.NEVER;
      }
      return waybill;
    }),
  urgent: z.boolean().optional(),
});
export const replySchema = z.object({ message: z.string().trim().min(1).max(4000) });

/** Bliss is down or refused: say so plainly, and keep its 404/409 meaning. */
async function viaBliss<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    if (e instanceof BlissError) {
      if (e.status === 404) throw new DomainError("NOT_FOUND", "We couldn't find that ticket.", 404);
      if (e.status === 409) throw new DomainError("CLOSED", e.message, 409);
    }
    console.error("[bliss]", e);
    throw new DomainError("SUPPORT_UNAVAILABLE", "Support tickets are unavailable right now. Call or WhatsApp us instead.", 503);
  }
}

async function contact(user: CurrentUser) {
  const [u] = await db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, user.id));
  return { email: u?.email ?? undefined, phone: u?.phone ?? undefined };
}

export async function openTicket(user: CurrentUser, raw: unknown) {
  const b = newTicketSchema.parse(raw);
  const c = await contact(user);
  return viaBliss(() =>
    createTicket({
      ondiUserId: user.id,
      name: user.name,
      ...c,
      subject: b.subject,
      category: TICKET_TOPICS[b.topic],
      message: b.message,
      priority: b.urgent ? "HIGH" : "NORMAL",
      relatedRef: b.waybill,
    }),
  );
}

export const myTickets = async (user: CurrentUser) => ({ tickets: await viaBliss(() => listTickets(user.id)) });
export const myTicket = (user: CurrentUser, id: string) => viaBliss(() => getTicket(user.id, id));
export async function replyTicket(user: CurrentUser, id: string, raw: unknown) {
  const { message } = replySchema.parse(raw);
  await viaBliss(() => replyToTicket(user.id, user.name, id, message));
  return myTicket(user, id);
}
