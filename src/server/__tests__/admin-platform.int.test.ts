import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { outbox, platformPartners } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import type { Permission } from "@/domain/roles";
import { integrations, retryFailed } from "../services/admin/integrations";
import { createPartner, listPartners, updatePartner } from "../services/admin/partners";

const as = (perms: Permission[]): CurrentUser => ({ id: "admin-platform-test", name: "Platform Admin", accountId: null, roles: [], permissions: new Set(perms), locale: "en" }) as CurrentUser;
const admin = as(["settings.manage"]);
const finance = as(["finance.view"]);
const counter = as(["agent.workspace"]);
const KEYS = ["itest-feed-fresh", "itest-feed-old", "itest-feed-expired"];

beforeAll(async () => {
  await db.delete(platformPartners).where(eq(platformPartners.createdBy, admin.id));
  await db.delete(outbox).where(inArray(outbox.idempotencyKey, KEYS));
});
afterAll(async () => {
  await db.delete(platformPartners).where(eq(platformPartners.createdBy, admin.id));
  await db.delete(outbox).where(inArray(outbox.idempotencyKey, KEYS));
  await db.$client.end();
});

describe("super-admin integrations", () => {
  it("lists every service with its mode and which settings are present, never their values", async () => {
    await expect(integrations(counter)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { items } = await integrations(admin);
    expect(items.map((i) => i.key)).toEqual(expect.arrayContaining(["hudufeed", "hudupay", "ondi", "complyos", "finops", "bliss", "hudubi", "maps", "storage"]));
    for (const i of items) {
      expect(["live", "simulated", "off"]).toContain(i.mode);
      for (const s of i.settings) expect(Object.keys(s).sort()).toEqual(["name", "set"]);
    }
    // Nothing on the page carries a configured value.
    const json = JSON.stringify(items);
    for (const k of ["HUDUFEED_SERVICE_KEY", "HUDUPAY_SERVICE_KEY", "ONDI_CLIENT_SECRET", "GOOGLE_MAPS_API_KEY"]) {
      const v = process.env[k];
      if (v && v.length > 6) expect(json).not.toContain(v);
    }
  });

  it("sends recent failed messages again, but not old or expired ones", async () => {
    const day = 24 * 3600_000;
    await db.insert(outbox).values([
      { target: "hudufeed", topic: "notification.request", idempotencyKey: KEYS[0], payload: {}, status: "failed", attempts: 5, lastError: "HTTP 502" },
      { target: "hudufeed", topic: "notification.request", idempotencyKey: KEYS[1], payload: {}, status: "failed", attempts: 5, lastError: "HTTP 502", createdAt: new Date(Date.now() - 2 * day) },
      { target: "hudufeed", topic: "notification.request", idempotencyKey: KEYS[2], payload: {}, status: "failed", attempts: 5, lastError: "expired" },
    ]);
    const feed = (await integrations(admin)).items.find((i) => i.key === "hudufeed")!;
    expect(feed.outbox!.failed).toBeGreaterThanOrEqual(3);
    await expect(retryFailed(admin, "finops")).rejects.toMatchObject({ code: "NOT_RETRYABLE" });
    await retryFailed(admin, "hudufeed");
    const rows = await db.select({ key: outbox.idempotencyKey, status: outbox.status, attempts: outbox.attempts }).from(outbox).where(inArray(outbox.idempotencyKey, KEYS));
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by[KEYS[0]]).toMatchObject({ status: "pending", attempts: 0 });
    expect(by[KEYS[1]].status).toBe("failed");
    expect(by[KEYS[2]].status).toBe("failed");
  });
});

describe("super-admin partners", () => {
  it("keeps packaging, insurance and other partners; finance can read, only the platform team changes them", async () => {
    await expect(createPartner(finance, { kind: "packaging", name: "Boxes Ltd" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listPartners(counter, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createPartner(admin, { kind: "packaging", name: "Boxes Ltd", website: "boxes.co.tz" })).rejects.toThrow();

    const box = await createPartner(admin, {
      kind: "packaging",
      name: "Boxes Ltd",
      contactName: "Neema",
      phone: "0712 345 678",
      website: "https://boxes.co.tz",
      regions: ["Dar es Salaam", "Arusha"],
      offer: "Cartons from TZS 800, minimum 200",
    });
    expect(box).toMatchObject({ kind: "packaging", phone: "+255712345678", regions: ["Dar es Salaam", "Arusha"], status: "active", renewSoon: false });
    await createPartner(admin, { kind: "insurance", name: "Safe Cover", contractEndsAt: new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10) });

    const all = await listPartners(finance, {});
    const mine = all.partners.filter((p) => p.createdBy === admin.id);
    expect(mine.map((p) => p.name).sort()).toEqual(["Boxes Ltd", "Safe Cover"]);
    expect(mine.find((p) => p.name === "Safe Cover")!.renewSoon).toBe(true);
    expect(all.canManage).toBe(false);
    expect((await listPartners(admin, { kind: "insurance" })).partners.every((p) => p.kind === "insurance")).toBe(true);
    expect((await listPartners(admin, { q: "cartons" })).partners.some((p) => p.id === box.id)).toBe(true);

    const paused = await updatePartner(admin, box.id, { kind: "packaging", name: "Boxes Ltd", status: "paused", regions: [] });
    expect(paused).toMatchObject({ status: "paused", regions: [], phone: null });
  });
});
