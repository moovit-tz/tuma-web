import "server-only";
import { enqueue } from "./outbox";
import { notifications, type Party } from "../db/schema";
import { maskPhone } from "@/domain/phone";
import type { Tx } from "../db/client";

/**
 * Notification decisions (section 7.3). Tuma decides when and with which variables; HuduFeed sends.
 * Template keys match the table in 7.3.
 */
const RECEIVER_TEMPLATES: Record<string, string> = {
  RECEIVED: "parcel.received",
  OUT_FOR_DELIVERY: "parcel.out_for_delivery",
  ATTEMPT_FAILED: "parcel.attempt_failed",
  READY_FOR_COLLECTION: "parcel.ready",
  DELIVERED: "parcel.delivered",
  RETURNED: "parcel.returned",
};

export async function notifyOnState(
  tx: Tx,
  s: { id: string; waybill: string; consignee: Party },
  state: string,
  eventId: string,
  vars: Record<string, string> = {},
) {
  const template = RECEIVER_TEMPLATES[state];
  if (!template) return;
  const language = s.consignee.language ?? "en";
  await enqueue(tx, {
    target: "hudufeed",
    topic: "notification.request",
    idempotencyKey: `notify:${eventId}`,
    waybill: s.waybill,
    payload: { template, language, channel: "sms", to: s.consignee.phone, variables: { waybill: s.waybill, ...vars } },
  });
  await tx.insert(notifications).values({
    shipmentId: s.id,
    template,
    language,
    channel: "sms",
    recipientMasked: maskPhone(s.consignee.phone),
  });
}
