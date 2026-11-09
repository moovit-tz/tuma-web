import { type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShipment } from "@/server/services/shipments";
import { counterAgent } from "@/server/services/agent-parcels";
import { db } from "@/server/db/client";
import { accounts, branches } from "@/server/db/schema";
import { receiptPdf } from "@/server/receipt-pdf";
import { fmt, getDict } from "@/i18n";
import { dateTime, money } from "@/lib/format";

/** The shared receipt (or proforma) for a parcel the user can see, as a PDF in the same layout the app shares. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/receipts/[waybill]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { waybill } = await ctx.params;
  const s = await getShipment(user, waybill);
  if (!s) return new Response("Not found", { status: 404 });
  const locale = req.nextUrl.searchParams.get("lang") === "sw" ? "sw" : "en";
  const t = getDict(locale).receiptPdf;

  const ids = [s.handlingBranchId, s.deliveryBranchId].filter((x): x is string => !!x);
  const [agent, offices] = await Promise.all([
    counterAgent(s),
    ids.length ? db.select({ id: branches.id, name: branches.name, business: accounts.name }).from(branches).innerJoin(accounts, eq(accounts.id, branches.accountId)).where(inArray(branches.id, ids)) : Promise.resolve([]),
  ]);
  const office = offices.find((o) => o.id === s.handlingBranchId);
  const dropAt = offices.find((o) => o.id === s.deliveryBranchId)?.name ?? s.deliveryLocation?.name ?? null;

  const paid = !!s.paidAt || ["collected", "deposited", "remitted"].includes(s.cod?.status ?? "");
  const snap = s.charges;
  const total = snap?.total ?? s.totalCharge;
  const method = s.prepayMethod ?? (paid && s.cod ? "cash" : null);
  const lines: [string, string][] = [
    ...(snap?.lines.length ? snap.lines.map((l): [string, string] => [l.label, money(l.amount, locale)]) : [[t.charge, money(snap?.subtotal ?? total, locale)] as [string, string]]),
    ...(snap && snap.tax > 0 ? [[t.vat, money(snap.tax, locale)] as [string, string]] : []),
    ...(paid && method ? [[t.paidWith, t.methods[method] ?? method] as [string, string]] : []),
  ];
  const to = s.consignee;
  const place = s.deliveryMode === "wakala_collect" && dropAt ? dropAt : [to.address.district, to.address.region].filter(Boolean).join(", ");
  const kg = Math.round((s.chargeableWeightG ?? 0) / 100) / 10;
  const number = `${paid ? "RC" : "PF"}-${s.waybill}`;

  const bytes = await receiptPdf({
    paid,
    kindLabel: paid ? t.receipt : t.proforma,
    number,
    waybill: s.waybill,
    greeting: fmt(t.thanks, { name: (s.shipper.name ?? "").trim().split(/\s+/)[0] || "Tuma" }),
    date: dateTime(s.paidAt ?? s.createdAt, locale),
    message: paid ? fmt(t.onItsWay, { waybill: s.waybill, to: to.name }) : t.notReceipt,
    totalLabel: paid ? t.total : t.due,
    total: money(total, locale),
    lines,
    detailsTitle: t.details,
    details: [s.goodsDescription, `${kg} kg`, s.piecesCount > 1 ? fmt(t.pieces, { n: s.piecesCount }) : null].filter(Boolean).join(" · "),
    from: { time: dateTime(s.createdAt, locale), place: office?.name ?? s.pickupLocation?.name ?? s.shipper.address?.district ?? "—", who: s.shipper.name },
    to: { place: place || "—", who: to.name },
    scan: t.scan,
    trackLabel: t.track,
    trackUrl: `${process.env.APP_URL ?? "https://tuma.hudumika.tz"}/track/${s.waybill}`,
    agentName: agent?.name ?? null,
    agentLine: [office?.name ?? office?.business, agent?.phone].filter(Boolean).join(" · "),
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
