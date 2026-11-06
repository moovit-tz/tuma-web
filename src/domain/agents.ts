/**
 * Parcel agents: businesses that receive, hold and hand over parcels for Tuma from their own office.
 * Each agent chooses the steps their office runs. The order is fixed; the choice is theirs.
 */
export const WORKFLOW_STEPS = ["receive", "dispatch", "offload", "deliver"] as const;
export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

/** Common set-ups offered as one tap in the app; "custom" lets the agent tick steps one by one. */
export const WORKFLOW_PRESETS: Record<string, WorkflowStep[]> = {
  dropoff: ["receive", "dispatch"], // customers drop parcels; the agent sends them on
  collection: ["offload", "deliver"], // parcels arrive; the agent hands them to receivers
  full: ["receive", "dispatch", "offload", "deliver"],
};

export const BUSINESS_TYPES = ["sole_trader", "partnership", "company"] as const;

/** Keeps the agent's choice in the operating order, without duplicates. */
export function normaliseWorkflow(steps: readonly string[]): WorkflowStep[] {
  return WORKFLOW_STEPS.filter((s) => steps.includes(s));
}

/** TRA TIN: nine digits, often written 123-456-789. */
export function normaliseTin(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  return /^\d{9}$/.test(d) ? d : null;
}

export const formatTin = (tin: string) => `${tin.slice(0, 3)}-${tin.slice(3, 6)}-${tin.slice(6)}`;

/** PLACEHOLDER: Tuma's commission on parcels an agent handles, until pricing is agreed. */
export const DEFAULT_AGENT_COMMISSION_BPS = 1000;
