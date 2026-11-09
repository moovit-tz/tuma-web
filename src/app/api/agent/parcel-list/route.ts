import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { AGENT_VIEWS, agentParcels, type AgentView } from "@/server/services/agent-parcels";
import { parcelListPdf } from "@/server/parcel-list-pdf";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";

/** The desk tab (or a search) as a PDF count sheet to share with the team: ?view=in_hand&q=…&lang=sw. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (!user.permissions.has("agent.workspace")) return new Response("Not allowed", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const locale = sp.get("lang") === "sw" ? "sw" : sp.get("lang") === "fr" ? "fr" : "en";
  const t = getDict(locale);
  const a = t.agent;
  const v = sp.get("view") ?? "in_hand";
  const view = ((AGENT_VIEWS as readonly string[]).includes(v) ? v : "in_hand") as AgentView;
  const q = sp.get("q")?.trim().slice(0, 80) || undefined;
  const { parcels } = await agentParcels(user, { view, q, limit: 100 });
  const pieces = parcels.reduce((n, p) => n + (p.pieces ?? 1), 0);
  const value = parcels.reduce((n, p) => n + (p.total ?? 0), 0);
  const num = (n: number) => n.toLocaleString("en-US");
  const now = new Date();
  const title = q ? fmt(a.desk.pdf.search, { q }) : a.views[view];

  const bytes = await parcelListPdf({
    title,
    kicker: a.desk.pdf.kicker,
    madeBy: fmt(a.desk.pdf.madeBy, { name: user.name, at: dateTime(now, locale) }),
    head: { waybill: a.desk.waybill, receiver: a.desk.to, place: a.desk.pdf.place, status: a.desk.state, pieces: a.desk.pdf.pieces, value: "TZS", updated: a.desk.updated, seen: a.desk.pdf.seen },
    rows: parcels.map((p) => ({
      waybill: p.waybill,
      receiver: p.to.name ?? "",
      place: [p.to.district, p.to.region].filter(Boolean).join(", "),
      status: t.states[p.state] ?? p.state,
      pieces: p.pieces ?? 1,
      value: p.total ? num(p.total) : "-",
      updated: dateTime(p.updatedAt, locale),
    })),
    totals: fmt(a.desk.pdf.totals, { n: parcels.length, p: pieces }),
    value: value > 0 ? fmt(a.desk.pdf.value, { v: `TZS ${num(value)}` }) : null,
    countedBy: a.desk.countedBy,
    signature: a.desk.signature,
  });
  const day = now.toISOString().slice(0, 10);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tuma-${view}-${day}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
