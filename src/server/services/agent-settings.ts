import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { agents, kybApplications } from "../db/schema";
import { audit } from "../audit";
import { DomainError } from "../errors";
import type { CurrentUser } from "../auth/current-user";
import { normaliseWorkflow, WORKFLOW_PRESETS, WORKFLOW_STEPS } from "@/domain/agents";

/**
 * What the office does with parcels (receive, dispatch, offload, deliver): chosen when applying, changed here by whoever
 * may (agent.workflow.manage). While the business is still being reviewed, the application holds it.
 */

function businessOf(user: CurrentUser) {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
  return user.accountId;
}

/** Which preset a set of steps is, or "custom". */
export function presetOf(steps: readonly string[]) {
  const s = normaliseWorkflow(steps).join();
  return Object.entries(WORKFLOW_PRESETS).find(([, v]) => v.join() === s)?.[0] ?? "custom";
}

export async function workflowFor(user: CurrentUser) {
  const acct = businessOf(user);
  const [[a], [k]] = await Promise.all([
    db.select({ workflow: agents.workflow }).from(agents).where(eq(agents.accountId, acct)),
    db.select({ workflow: kybApplications.workflow }).from(kybApplications).where(eq(kybApplications.accountId, acct)).limit(1),
  ]);
  const workflow = normaliseWorkflow(a?.workflow ?? k?.workflow ?? []);
  return { workflow, preset: presetOf(workflow), approved: !!a, canManage: user.permissions.has("agent.workflow.manage") };
}

const workflowSchema = z.object({ workflow: z.array(z.enum(WORKFLOW_STEPS)).min(1, "Choose at least one step.") });

export async function updateWorkflow(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  if (!user.permissions.has("agent.workflow.manage")) throw new DomainError("FORBIDDEN", "You can't change what this office does.", 403);
  const workflow = normaliseWorkflow(workflowSchema.parse(raw).workflow);
  await db.transaction(async (tx) => {
    const [a] = await tx.select({ workflow: agents.workflow }).from(agents).where(eq(agents.accountId, acct)).for("update");
    const [k] = await tx.select({ id: kybApplications.id, workflow: kybApplications.workflow }).from(kybApplications).where(eq(kybApplications.accountId, acct)).limit(1);
    if (!a && !k) throw new DomainError("NO_BUSINESS", "Set up your business first.", 409);
    if (a) await tx.update(agents).set({ workflow }).where(eq(agents.accountId, acct));
    // The application keeps the latest too, so a resubmission or a later approval carries it.
    if (k) await tx.update(kybApplications).set({ workflow }).where(eq(kybApplications.id, k.id));
    await audit(tx, { actorId: user.id, action: "agent.workflow", entity: "account", entityId: acct, before: { workflow: a?.workflow ?? k?.workflow }, after: { workflow } });
  });
  return workflowFor(user);
}
