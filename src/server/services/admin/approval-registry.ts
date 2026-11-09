import "server-only";
import type { Tx } from "../../db/client";
import type { approvalRequests } from "../../db/schema";

/**
 * What approving a request of each kind does, registered by the module that owns the kind (payouts, risk releases,
 * claim settlements, price publishing). Keeps the approvals desk from importing every feature.
 */
export type ApprovalApplier = (tx: Tx, r: typeof approvalRequests.$inferSelect, approverId: string) => Promise<void>;
export const approvalAppliers = new Map<string, ApprovalApplier>();
/** What rejecting (or withdrawing) a request of each kind undoes. */
export const approvalRejecters = new Map<string, ApprovalApplier>();
