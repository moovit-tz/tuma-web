import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { paymentRecords } from "@/server/services/agent-payments";
import { agentReport } from "@/server/services/agent-parcels";
import { DomainError } from "@/server/services/shipments";
import { csvResponse, toCsv, watermark } from "@/lib/csv";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit";

const MAX_PAGES = 50; // 5,000 rows

/**
 * The agent's spreadsheets: payments (?method=cash|mobile_money), invoices (?status=open|paid|all) and the report
 * (?period=today|week|month|quarter). Same services and permissions as the pages.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/exports/[kind]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { kind } = await ctx.params;
  const q = Object.fromEntries(req.nextUrl.searchParams);
  const day = new Date().toISOString().slice(0, 10);
  // Every export carries who took it and when, and is logged.
  const send = async (name: string, body: string, rows: number) => {
    await db.transaction((tx) => audit(tx, { actorId: user.id, action: "export.csv", entity: "export", entityId: kind, after: { file: name, rows, query: q } }));
    return csvResponse(name, body + watermark(user.name, user.id));
  };
  try {
    if (kind === "payments") {
      const rows: unknown[][] = [];
      let before: string | undefined;
      for (let i = 0; i < MAX_PAGES; i++) {
        const r = await paymentRecords(user, { kind: "payments", method: q.method || undefined, limit: 100, before });
        const page = r.payments ?? [];
        for (const p of page) rows.push([p.at, p.waybill, p.amount, p.method, p.paidBy ?? "", p.terms]);
        if (page.length < 100) break;
        before = page[page.length - 1].at;
      }
      return send(`tuma-payments-${day}.csv`, toCsv(["paid_at", "waybill", "amount_tzs", "method", "paid_by", "terms"], rows), rows.length);
    }
    if (kind === "invoices") {
      const rows: unknown[][] = [];
      let before: string | undefined;
      for (let i = 0; i < MAX_PAGES; i++) {
        const r = await paymentRecords(user, { kind: "invoices", status: q.status || "all", limit: 100, before });
        const page = r.invoices ?? [];
        for (const v of page) rows.push([v.number, v.at, v.due, (v.billTo as { name?: string } | null)?.name ?? "", v.status, v.total, v.tax, v.paid, v.owed, v.overdue ? "yes" : "no"]);
        if (page.length < 100) break;
        before = page[page.length - 1].at;
      }
      return send(`tuma-invoices-${day}.csv`, toCsv(["number", "issued", "due", "bill_to", "status", "total_tzs", "tax_tzs", "paid_tzs", "owed_tzs", "overdue"], rows), rows.length);
    }
    if (kind === "report") {
      const r = await agentReport(user, { period: q.period });
      const rows: unknown[][] = r.series.map((d) => [d.day, d.parcels, d.value, d.delivered]);
      return send(`tuma-report-${r.period}-${day}.csv`, toCsv(["day", "parcels_booked", "value_tzs", "delivered"], rows), rows.length);
    }
    return new Response("Not found", { status: 404 });
  } catch (e) {
    if (e instanceof DomainError) return new Response(e.message, { status: e.status ?? 400 });
    throw e;
  }
}
