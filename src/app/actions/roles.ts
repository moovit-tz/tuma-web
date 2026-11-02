"use server";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/services/shipments";
import { addTeamMember, createRole, deleteRole, memberSchema, memberUpdateSchema, roleInputSchema, setMemberActive, setRoleActive, setUserRoles, updateMember, updateRole } from "@/server/services/roles";
import type { ActionResult } from "./shipments";

async function guarded(fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<unknown>): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
    await fn(user);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

export async function saveRoleAction(mode: "create" | "update", input: unknown): Promise<ActionResult<string>> {
  const parsed = roleInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  if (mode === "create") {
    try {
      const user = await getCurrentUser();
      if (!user) return { ok: false, error: "Your session has ended. Sign in again." };
      const key = await createRole(user, parsed.data);
      refresh();
      return { ok: true, data: key };
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, error: e.message };
      console.error(e);
      return { ok: false, error: "Something went wrong. Try again." };
    }
  }
  return guarded((user) => updateRole(user, parsed.data.key, parsed.data));
}

export async function setRoleActiveAction(key: string, active: boolean) {
  return guarded((user) => setRoleActive(user, key, active));
}

export async function deleteRoleAction(key: string) {
  return guarded((user) => deleteRole(user, key));
}

export async function setUserRolesAction(userId: string, roleKeys: string[]) {
  return guarded((user) => setUserRoles(user, userId, roleKeys));
}

export async function addTeamMemberAction(input: unknown): Promise<ActionResult> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  return guarded((user) => addTeamMember(user, parsed.data));
}

export async function updateMemberAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }
  return guarded((user) => updateMember(user, id, parsed.data));
}

export async function setMemberActiveAction(id: string, active: boolean) {
  return guarded((user) => setMemberActive(user, id, active));
}
