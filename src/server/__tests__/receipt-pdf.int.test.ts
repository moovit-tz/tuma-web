import { describe, expect, it, vi } from "vitest";
import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "../db/client";
import { shipments } from "../db/schema";

const user = { id: "receipt-test", accountId: "acc_moovit_ops", permissions: new Set(["shipment.read.all"]), grants: new Map(), roles: [] };
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => user }));

describe("receipt PDF route", () => {
  it("returns the shared receipt as a PDF in either language", async () => {
    const [s] = await db.select({ waybill: shipments.waybill }).from(shipments).orderBy(desc(shipments.createdAt)).limit(1);
    expect(s).toBeTruthy();
    const { GET } = await import("@/app/api/receipts/[waybill]/route");
    for (const lang of ["en", "sw"]) {
      const res = await GET(new NextRequest(`http://localhost/api/receipts/${s.waybill}?lang=${lang}`), { params: Promise.resolve({ waybill: s.waybill }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      const head = Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString();
      expect(head).toBe("%PDF-");
    }
  }, 30_000);

  it("is a 404 for a parcel nobody can see", async () => {
    const { GET } = await import("@/app/api/receipts/[waybill]/route");
    const res = await GET(new NextRequest("http://localhost/api/receipts/TM-NOPE-0000"), { params: Promise.resolve({ waybill: "TM-NOPE-0000" }) });
    expect(res.status).toBe(404);
  });
});
