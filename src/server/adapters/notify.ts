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

/**
 * A counter parcel was paid for: the sender gets the receipt and the receiver hears a parcel is coming, each by SMS
 * and WhatsApp, with the tracking link.
 */
export async function notifyPaid(tx: Tx, s: { id: string; waybill: string; shipper: Party; consignee: Party; totalCharge: number }, vars: { amount: string; method: string }) {
  const track = `${process.env.APP_URL ?? "https://tuma.hudumika.tz"}/track/${s.waybill}`;
  const sends = [
    { to: s.shipper, template: "parcel.receipt", variables: { waybill: s.waybill, amount: vars.amount, method: vars.method, receiver: s.consignee.name, track } },
    { to: s.consignee, template: "parcel.sent_to_you", variables: { waybill: s.waybill, sender: s.shipper.name, track } },
  ];
  for (const m of sends) {
    const language = m.to.language ?? "sw";
    for (const channel of ["sms", "whatsapp"] as const) {
      await enqueue(tx, {
        target: "hudufeed",
        topic: "notification.request",
        idempotencyKey: `paid:${s.id}:${m.template}:${channel}`,
        waybill: s.waybill,
        payload: { template: m.template, language, channel, to: m.to.phone, variables: m.variables },
      });
      await tx.insert(notifications).values({ shipmentId: s.id, template: m.template, language, channel, recipientMasked: maskPhone(m.to.phone) });
    }
  }
}
