/**
 * Waybill lifecycle — SRS 4.4 and FR-WB-04.
 * A transition is allowed only when the current state permits it AND the actor's role may set it.
 * Anything else is rejected and logged by the caller.
 */
import type { Permission } from "./roles";

export const PARCEL_STATES = [
  "DRAFT",
  "CREATED",
  "AWAITING_HANDOVER",
  "RECEIVED",
  "AT_HUB",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "ATTEMPT_FAILED",
  "READY_FOR_COLLECTION",
  "DELIVERED",
  "RETURNING",
  "RETURNED",
  "CANCELLED",
] as const;

export const CARGO_STATES = [
  "REQUESTED",
  "QUOTED",
  "BOOKED",
  "ALLOCATED",
  "LOADING",
  "IN_TRANSIT",
  "AT_CHECKPOINT",
  "ARRIVED",
  "OFFLOADING",
  "DELIVERED",
  "CLOSED",
  "DISPUTED",
  "CANCELLED",
] as const;

export type ParcelState = (typeof PARCEL_STATES)[number];
export type CargoState = (typeof CARGO_STATES)[number];
export type ShipmentState = ParcelState | CargoState;

/** Main-line progression shown as the stepper on the tracking page. */
export const PARCEL_MAIN_LINE: ParcelState[] = [
  "CREATED",
  "RECEIVED",
  "AT_HUB",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const TERMINAL_STATES: ShipmentState[] = ["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"];

const PARCEL_TRANSITIONS: Record<ParcelState, ParcelState[]> = {
  DRAFT: ["CREATED", "CANCELLED"],
  CREATED: ["AWAITING_HANDOVER", "RECEIVED", "CANCELLED"],
  AWAITING_HANDOVER: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["AT_HUB", "IN_TRANSIT", "OUT_FOR_DELIVERY", "READY_FOR_COLLECTION", "CANCELLED"],
  AT_HUB: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "READY_FOR_COLLECTION", "RETURNING", "CANCELLED"],
  IN_TRANSIT: ["AT_HUB", "OUT_FOR_DELIVERY", "READY_FOR_COLLECTION"],
  OUT_FOR_DELIVERY: ["DELIVERED", "ATTEMPT_FAILED"],
  ATTEMPT_FAILED: ["OUT_FOR_DELIVERY", "AT_HUB", "READY_FOR_COLLECTION", "RETURNING"],
  READY_FOR_COLLECTION: ["DELIVERED", "RETURNING"],
  DELIVERED: [],
  RETURNING: ["AT_HUB", "IN_TRANSIT", "RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

/**
 * "Set by" column of the states table, expressed as permissions so admins decide which roles
 * may set each state. "system" marks states only the platform sets.
 */
const REQUIRED: Partial<Record<ParcelState, Permission | "system">> = {
  CREATED: "system",
  AWAITING_HANDOVER: "system",
  RECEIVED: "shipment.receive",
  AT_HUB: "shipment.hub_scan",
  IN_TRANSIT: "shipment.dispatch",
  OUT_FOR_DELIVERY: "shipment.dispatch",
  ATTEMPT_FAILED: "shipment.fail_attempt",
  READY_FOR_COLLECTION: "shipment.collection",
  DELIVERED: "shipment.deliver",
  RETURNING: "shipment.return",
  RETURNED: "shipment.return",
  CANCELLED: "shipment.cancel",
};

export function requiredPermission(to: ShipmentState): Permission | "system" | undefined {
  return REQUIRED[to as ParcelState];
}

/** Transitions a person (not a scan) makes from the console must carry a reason code (section 7, "Manual"). */
export const MANUAL_NEEDS_REASON = true;

export function nextStates(from: ShipmentState): ShipmentState[] {
  return (PARCEL_TRANSITIONS as Record<string, ShipmentState[]>)[from] ?? [];
}

export type TransitionCheck = { ok: true } | { ok: false; code: "STATE_NOT_ALLOWED" | "ROLE_NOT_ALLOWED"; message: string };

/**
 * @param actor "system" for platform transitions, otherwise the actor's resolved permission set.
 * A user holding shipment.override may also set system-only states (manual correction, audited).
 */
export function canTransition(
  from: ShipmentState,
  to: ShipmentState,
  actor: ReadonlySet<Permission> | "system",
): TransitionCheck {
  if (!nextStates(from).includes(to)) {
    return { ok: false, code: "STATE_NOT_ALLOWED", message: `A shipment cannot move from ${from} to ${to}.` };
  }
  const needed = REQUIRED[to as ParcelState];
  const permitted =
    actor === "system"
      ? needed === "system" || needed !== undefined
      : needed !== undefined && (needed === "system" ? actor.has("shipment.override") : actor.has(needed) || actor.has("shipment.override"));
  if (!permitted) {
    return { ok: false, code: "ROLE_NOT_ALLOWED", message: `Your role cannot set ${to}.` };
  }
  return { ok: true };
}

export function isTerminal(state: ShipmentState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** FR-PCL-12: free cancellation until the first handover scan. */
export function isBeforeHandover(state: ShipmentState): boolean {
  return state === "DRAFT" || state === "CREATED" || state === "AWAITING_HANDOVER";
}

/** FR-WB-06: consignee details can change until out for delivery. */
export function consigneeEditable(state: ShipmentState): boolean {
  return ["DRAFT", "CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "IN_TRANSIT", "ATTEMPT_FAILED"].includes(state);
}

/** Event type written to the ledger for each state. */
export function eventTypeFor(state: ShipmentState): string {
  return `shipment.${state.toLowerCase()}`;
}
