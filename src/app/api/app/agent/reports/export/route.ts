import { driverRoute } from "@/server/http/driver-api";
import { agentReportCsv } from "@/server/services/agent-parcels";

/** GET (same query as /reports) → the report's parcels as a CSV file (report.view). */
export const GET = driverRoute(async (ctx, req) => {
  const { csv, fileName } = await agentReportCsv(ctx.user, Object.fromEntries(req.nextUrl.searchParams));
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${fileName}"`, "cache-control": "no-store" },
  });
});
