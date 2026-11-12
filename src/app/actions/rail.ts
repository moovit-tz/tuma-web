"use server";
import { ZodError } from "zod";
import { tErr } from "@/server/action-errors";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { agentNotifications, type AgentNotification } from "@/server/services/agent-parcels";
import { myTickets, openTicket } from "@/server/services/help-tickets";
import type { TicketSummary } from "@/server/adapters/bliss";
import type { ActionResult } from "./shipments";

/** The right rail's data: the same services the pages use, which check permissions next to the data. */
async function run<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new DomainError("UNAUTHENTICATED", "Your session has ended. Sign in again.", 401);
    return { ok: true, data: await fn(user) };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    if (e instanceof ZodError)
      return {
        ok: false,
        error: await tErr(e.issues[0]?.message ?? "Check the details and try again."),
      };
    console.error("[rail]", e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

/** Only an office or business with a workspace has notifications; everyone else gets an empty list. */
export async function railNotifications(): Promise<ActionResult<AgentNotification[]>> {
  return run(async (user) => (user.permissions.has("agent.workspace") && user.accountId ? (await agentNotifications(user)).notifications : []));
}

export async function railTickets(): Promise<ActionResult<TicketSummary[]>> {
  return run(async (user) => (await myTickets(user)).tickets);
}

export async function railOpenTicket(input: { topic: string; subject: string; message: string; waybill?: string; urgent?: boolean }): Promise<ActionResult<{ ref: string }>> {
  return run(async (user) => {
    const t = await openTicket(user, input);
    return { ref: t.ref };
  });
}
