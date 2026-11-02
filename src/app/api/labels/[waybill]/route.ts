import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShipment, recordLabelPrint } from "@/server/services/shipments";
import { labelPdf, waybillA4Pdf } from "@/server/labels";

/** FR-WB-03. Every print and reprint is counted and audited. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/labels/[waybill]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (!user.permissions.has("label.print")) return new Response("Forbidden", { status: 403 });
  const { waybill } = await ctx.params;
  const s = await getShipment(user, waybill);
  if (!s) return new Response("Not found", { status: 404 });
  const format = req.nextUrl.searchParams.get("format") === "a4" ? "a4" : "label";
  const trackingBase = `${process.env.APP_URL}/track`;
  const bytes = format === "a4" ? await waybillA4Pdf(s, trackingBase) : await labelPdf(s, trackingBase);
  await recordLabelPrint(user, s.waybill, format);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${s.waybill}-${format}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
