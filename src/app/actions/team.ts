"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { ZodError } from "zod";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/errors";
import { acceptInvite, createInvite, declineInvite, resendInvite, revokeInvite } from "@/server/services/team-invites";
import type { ActionResult } from "./shipments";

/** Runs fn for the signed-in user; maps domain and validation errors to a result the form can show. */
async function run<T>(fn: (user: CurrentUser) => Promise<T>): Promise<ActionResult<T> & { code?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again.", code: "SIGNED_OUT" };
    const data = await fn(user);
    refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of e.issues) fieldErrors[i.path.join(".")] ??= i.message;
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message), code: e.code };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

export async function inviteStaffAction(input: unknown) {
  return run((user) => createInvite(user, input));
}

export async function resendInviteAction(id: string) {
  return run((user) => resendInvite(user, id));
}

export async function revokeInviteAction(id: string) {
  return run((user) => revokeInvite(user, id));
}

/** The invited person: by the link's token, or by id for an invitation matched to their phone or email. */
export async function respondToInviteAction(ref: { token: string } | { id: string }, answer: "accept" | "decline") {
  return run(async (user) => {
    if (answer === "accept") await acceptInvite(user, ref);
    else await declineInvite(user, ref);
  });
}
