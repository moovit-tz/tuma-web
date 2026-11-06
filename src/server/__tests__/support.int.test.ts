import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { outbox, supportRequests } from "../db/schema";
import { applyCaseUpdate, businessSchema, contactSchema, lostItemSchema, publicCase, submitSupportRequest } from "../services/support";

afterAll(async () => {
  await db.$client.end();
});

describe("public support requests", () => {
  it("records a lost-item report and queues a high-priority Bliss case", async () => {
    const data = lostItemSchema.parse({ name: "Rehema M", phone: "0712 000 111", itemDescription: "Blue box with shoes", waybill: "" });
    const ref = await submitSupportRequest("lost_item", data, "sw");
    expect(ref).toMatch(/^CS-[A-Z]{3}\d{3}$/); // a case number, tagged so it can't pass for a parcel
    const [row] = await db.select().from(supportRequests).where(eq(supportRequests.ref, ref));
    expect(row).toMatchObject({ kind: "lost_item", phone: "+255712000111", locale: "sw" });
    const [msg] = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `case:${ref}`));
    expect(msg).toMatchObject({ target: "bliss", topic: "case.create" });
    expect(msg.payload).toMatchObject({ priority: "high" });
  });

  it("sends business enquiries to CRM as leads", async () => {
    const data = businessSchema.parse({ company: "Duka Bora", name: "Ali K", phone: "0754123456", email: "ali@duka.co.tz", monthlyVolume: "100_1000", services: ["parcel", "cod"] });
    const ref = await submitSupportRequest("business", data, "en");
    const [msg] = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `lead:${ref}`));
    expect(msg).toMatchObject({ target: "crm", topic: "lead.create" });
  });

  it("rejects bad phones and bad waybill numbers", () => {
    expect(contactSchema.safeParse({ name: "A B", phone: "123", topic: "other", message: "hello there" }).success).toBe(false);
    expect(lostItemSchema.safeParse({ name: "A B", phone: "0712000111", itemDescription: "a box", waybill: "TMP-2611-AAAAAAA" }).success).toBe(false);
  });

  it("lets a guest follow their lost-item case with the case number and phone", async () => {
    const data = lostItemSchema.parse({ name: "Asha K", phone: "0713 222 333", itemDescription: "Red suitcase with a blue ribbon" });
    const ref = await submitSupportRequest("lost_item", data, "en");

    // Confirmation SMS with the case number.
    const [sms] = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `case-received:${ref}`));
    expect(sms).toMatchObject({ target: "hudufeed" });
    expect(sms.payload).toMatchObject({ template: "support.case_received", to: "+255713222333", variables: { ref } });

    const c = await publicCase(ref.toLowerCase(), "0713222333");
    expect(c).toMatchObject({ ref, status: "new", final: false, item: "Red suitcase with a blue ribbon" });
    expect(c.updates).toHaveLength(1);
    // Wrong phone looks exactly like a wrong case number.
    await expect(publicCase(ref, "0713999999")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(publicCase("ZZZ998", "0713222333")).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Bliss moves the case; the customer is texted once, a redelivery is ignored.
    const ev = { eventId: `t-${ref}`, ref, status: "found", note: "Found at the Ubungo hub. Collect with your ID." };
    expect(await applyCaseUpdate(ev)).toMatchObject({ duplicate: false });
    expect(await applyCaseUpdate(ev)).toMatchObject({ duplicate: true });
    const after = await publicCase(ref, "+255713222333");
    expect(after).toMatchObject({ status: "found", final: true });
    expect(after.updates.at(-1)).toMatchObject({ status: "found", note: ev.note });
    const texts = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `case-updated:${ev.eventId}`));
    expect(texts).toHaveLength(1);

    // Unknown Bliss statuses show as "in review" rather than leaking internal names.
    await applyCaseUpdate({ eventId: `t2-${ref}`, ref, status: "escalated_l2" });
    expect((await publicCase(ref, "0713222333")).status).toBe("in_review");
  });
});
