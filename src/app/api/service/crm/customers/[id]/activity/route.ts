import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, or, desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, customers, shipments } from "@/server/db/schema";

/**
 * CRM by Hudumika → one customer's recent Tuma shipment activity (read-only). Same x-service-key
 * gate as the sibling GET ../route.ts (CRM_SERVICE_KEY). Scoped to the requesting account twice
 * over: the customer row itself must belong to this account, and every shipment returned is
 * additionally filtered by accountId, so a guessed customer id from another account never leaks
 * shipment data even if the id happened to collide.
 */
function keyMatches(got: string | null, want: string) {
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const want = process.env.CRM_SERVICE_KEY;
  if (!want) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  if (!keyMatches(req.headers.get("x-service-key"), want)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: customerId } = await params;
  const sub = req.nextUrl.searchParams.get("sub");
  if (!sub) return NextResponse.json({ error: "sub is required" }, { status: 400 });

  const [row] = await db.select({ accountId: users.accountId }).from(users).where(eq(users.id, sub)).limit(1);
  if (!row?.accountId) return NextResponse.json({ activity: [] });

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.accountId, row.accountId)))
    .limit(1);
  if (!customer) return NextResponse.json({ activity: [] });

  const rows = await db
    .select({
      id: shipments.id,
      waybill: shipments.waybill,
      state: shipments.state,
      shipperCustomerId: shipments.shipperCustomerId,
      consigneeCustomerId: shipments.consigneeCustomerId,
      shipper: shipments.shipper,
      consignee: shipments.consignee,
      createdAt: shipments.createdAt,
      deliveredAt: shipments.deliveredAt,
    })
    .from(shipments)
    .where(
      and(
        eq(shipments.accountId, row.accountId),
        or(eq(shipments.shipperCustomerId, customerId), eq(shipments.consigneeCustomerId, customerId)),
      ),
    )
    .orderBy(desc(shipments.createdAt))
    .limit(25);

  return NextResponse.json({
    activity: rows.map((s) => {
      const direction: "sent" | "received" = s.shipperCustomerId === customerId ? "sent" : "received";
      const counterparty = direction === "sent" ? s.consignee?.name : s.shipper?.name;
      return {
        id: s.id,
        waybill: s.waybill,
        state: s.state,
        direction,
        counterpartyName: counterparty ?? null,
        createdAt: s.createdAt,
        deliveredAt: s.deliveredAt,
      };
    }),
  });
}
