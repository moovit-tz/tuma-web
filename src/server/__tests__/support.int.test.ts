import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { outbox, supportRequests } from "../db/schema";
import { businessSchema, contactSchema, lostItemSchema, submitSupportRequest } from "../services/support";

afterAll(async () => {
  await db.$client.end();
});

describe("public support requests", () => {
  it("records a lost-item report and queues a high-priority Bliss case", async () => {
    const data = lostItemSchema.parse({ name: "Rehema M", phone: "0712 000 111", itemDescription: "Blue box with shoes", waybill: "" });
    const ref = await submitSupportRequest("lost_item", data, "sw");
    expect(ref).toMatch(/^LI-\d{4}-[0-9A-Z]{5}$/);
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
});
