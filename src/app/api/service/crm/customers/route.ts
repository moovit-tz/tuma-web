import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, customers } from "@/server/db/schema";

/**
 * CRM by Hudumika → this account's Tuma customers (read-only). Gated by `x-service-key` against
 * CRM_SERVICE_KEY, the same shared-secret-per-relationship shape feed-api uses for requireServiceKey —
 * not Ondi's ADMIN_KEY, so a leaked key only exposes customer lists, never identity data.
 * GET ?sub=<ondi_subject>
 */
function keyMatches(got: string | null, want: string) {
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const want = process.env.CRM_SERVICE_KEY;
  if (!want) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  if (!keyMatches(req.headers.get("x-service-key"), want)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sub = req.nextUrl.searchParams.get("sub");
  if (!sub) return NextResponse.json({ error: "sub is required" }, { status: 400 });

  const [row] = await db.select({ accountId: users.accountId }).from(users).where(eq(users.id, sub)).limit(1);
  if (!row?.accountId) return NextResponse.json({ customers: [] });

  const rows = await db
    .select({
      id: customers.id,
      kind: customers.kind,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      region: customers.region,
      sent: customers.sent,
      received: customers.received,
      lastSeenAt: customers.lastSeenAt,
    })
    .from(customers)
    .where(and(eq(customers.accountId, row.accountId)))
    .orderBy(desc(customers.lastSeenAt))
    .limit(200);

  return NextResponse.json({ customers: rows });
}
