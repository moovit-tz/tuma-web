"use server";
import { refresh } from "next/cache";
import { tErr } from "@/server/action-errors";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { addDriver, addDriverSchema, cancelJob, createJob, createJobSchema, setDriverStatus } from "@/server/services/dispatch";

export type DispatchResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fields?: Record<string, string> };

async function run<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<T>): Promise<DispatchResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
    const data = await fn(user);
    refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: await tErr(e.message) };
    if (e instanceof z.ZodError) return { ok: false, error: await tErr(e.issues[0]?.message ?? "Check the details.") };
    console.error(e);
    return { ok: false, error: await tErr("Something went wrong. Try again.") };
  }
}

const fieldErrors = (e: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
};

export async function addDriverAction(input: unknown): Promise<DispatchResult<string>> {
  const p = addDriverSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(p.error) };
  return run((u) => addDriver(u, p.data));
}

export async function setDriverStatusAction(id: string, status: "approved" | "suspended") {
  return run((u) => setDriverStatus(u, id, status));
}

export async function createJobAction(input: z.input<typeof createJobSchema>) {
  return run((u) => createJob(u, input));
}

export async function cancelJobAction(id: string, reason: string) {
  if (reason.trim().length < 2) return { ok: false as const, error: "Say why the job is cancelled." };
  return run((u) => cancelJob(u, id, reason.trim()));
}
