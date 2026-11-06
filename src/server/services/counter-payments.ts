import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { invoices, parcelPayments, shipments } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { notifyPaid } from "../adapters/notify";
import { audit } from "../audit";
import { transition } from "./shipments";
import { commissionBpsFor } from "./agent-payments";
import { nextInvoiceNumber } from "./invoice-numbers";

/**
 * What happens when a counter parcel is paid for, and the invoice a company sender gets. Cash is paid when the
 * parcel is booked; mobile money when HuduPay confirms the push payment. Either way the parcel is marked paid,
 * a company's invoice is settled, FinOps gets the ledger entry, and sender and receiver are told by SMS and
 * WhatsApp. The app prints the receipt.
 */

type Shipment = typeof shipments.$inferSelect;

/** VAT-inclusive charges; the VAT share is shown on the invoice. FinOps produces the fiscal documents. */
const VAT = 0.18;

/** The invoice for a company's counter parcel, issued at booking. Prepaid ones are due at once. */
export async function issueCompanyInvoice(tx: Tx, s: Shipment, p: { customerId: string | null; actorId: string }) {
  const company = s.shipper.company;
  const now = new Date();
  const number = await nextInvoiceNumber(tx, s.accountId, now);
  const total = s.totalCharge;
  const tax = Math.round((total * VAT) / (1 + VAT));
  // Due at once unless it's on the company's account (paid on the invoice later).
  const prepaid = s.paymentTerms !== "account";
  const [inv] = await tx
    .insert(invoices)
    .values({
      accountId: s.accountId,
      customerId: p.customerId,
      shipmentId: s.id,
      number,
      billTo: { name: s.shipper.name, tin: company?.tin, phone: s.shipper.phone, contactName: company?.contactName, email: s.shipper.email },
      issueDate: now,
      dueDate: new Date(now.getTime() + (prepaid ? 0 : 14) * 86400_000),
      lines: [
        {
          waybill: s.waybill,
          description: `Delivery of ${s.goodsDescription} to ${s.consignee.address.district}, ${s.consignee.address.region}`,
          amount: total - s.extras.reduce((n, e) => n + e.amount, 0),
        },
        ...s.extras.map((e) => ({ waybill: s.waybill, description: e.label, amount: e.amount })),
      ],
      subtotal: total - tax,
      tax,
      total,
      createdBy: p.actorId,
    })
    .onConflictDoNothing({ target: invoices.shipmentId })
    .returning();
  if (!inv) return;
  await enqueue(tx, {
    target: "finops",
    topic: "agent.invoice.issued",
    idempotencyKey: `inv:${inv.id}`,
    waybill: s.waybill,
    payload: { accountId: s.accountId, number, customer: inv.billTo, total, tax, currency: "TZS", dueDate: inv.dueDate.toISOString(), waybills: [s.waybill] },
  });
  await audit(tx, { actorId: p.actorId, action: "invoice.issue", entity: "invoice", entityId: inv.id, after: { number, total, waybill: s.waybill } });
}

/** The sender paid: mark the parcel, settle its invoice, post to FinOps and tell both people. Runs once. */
export async function markPaid(tx: Tx, s: Shipment, p: { method: "cash" | "mobile_money"; reference?: string; actorId: string }) {
  const [paid] = await tx
    .update(shipments)
    .set({ paidAt: new Date(), prepayMethod: p.method })
    .where(and(eq(shipments.id, s.id), sql`${shipments.paidAt} is null`))
    .returning({ id: shipments.id });
  if (!paid) return false;
  const commission = Math.round((s.totalCharge * (await commissionBpsFor(s.accountId))) / 10_000);
  await tx
    .update(invoices)
    .set({ status: "paid", amountPaid: s.totalCharge, paidWith: p.method })
    .where(eq(invoices.shipmentId, s.id));
  await enqueue(tx, {
    target: "finops",
    topic: "agent.parcel.paid",
    idempotencyKey: `paid:${s.id}`,
    waybill: s.waybill,
    payload: {
      accountId: s.accountId,
      waybill: s.waybill,
      amount: s.totalCharge,
      currency: "TZS",
      method: p.method,
      reference: p.reference ?? null,
      // Mobile money: Tuma's commission comes off the takings before they're paid out. Cash: from the float.
      commission,
      commissionFrom: p.method === "mobile_money" ? "collection" : "float",
      payout: p.method === "mobile_money" ? s.totalCharge - commission : 0,
    },
  });
  await notifyPaid(tx, s, { amount: s.totalCharge.toLocaleString("en-US"), method: p.method });
  await audit(tx, { actorId: p.actorId, action: "parcel.paid", entity: "shipment", entityId: s.id, after: { method: p.method, amount: s.totalCharge, reference: p.reference } });
  return true;
}

/** Records HuduPay's outcome for one request; a success pays the parcel (once). */
export async function settlePayment(reference: string, status: "SUCCESS" | "FAILED" | "PENDING", failureMessage: string | null) {
  if (status === "PENDING") return null;
  const out = await db.transaction(async (tx) => {
    const [pay] = await tx.select().from(parcelPayments).where(eq(parcelPayments.reference, reference)).for("update");
    if (!pay) return null;
    if (pay.status !== "pending") return pay;
    const [updated] = await tx
      .update(parcelPayments)
      .set({ status: status === "SUCCESS" ? "paid" : "failed", failureMessage, completedAt: new Date() })
      .where(eq(parcelPayments.id, pay.id))
      .returning();
    if (status === "SUCCESS") {
      const [s] = await tx.select().from(shipments).where(eq(shipments.id, pay.shipmentId));
      if (s) await markPaid(tx, s, { method: "mobile_money", reference: pay.providerId ?? pay.reference, actorId: pay.requestedBy });
    }
    return updated;
  });
  if (out?.status === "paid") await receiveOnceFor(out.shipmentId);
  return out;
}

/** A parcel held back for payment is received the moment it's paid (from the app's poll or HuduPay's callback). */
export async function receiveOnceFor(shipmentIdOrWaybill: string) {
  const byId = /^[0-9a-f-]{36}$/i.test(shipmentIdOrWaybill);
  const [s] = await db
    .select({ waybill: shipments.waybill, state: shipments.state, wait: shipments.receiveOnPayment, paidAt: shipments.paidAt })
    .from(shipments)
    .where(byId ? eq(shipments.id, shipmentIdOrWaybill) : eq(shipments.waybill, shipmentIdOrWaybill));
  if (!s?.wait || !s.paidAt || s.state !== "AWAITING_HANDOVER") return;
  await transition("system", s.waybill, "RECEIVED", { source: "system", note: "Paid by mobile money" });
}
