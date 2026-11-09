import { getCurrentUser } from "@/server/auth/current-user";
import { dsrExport } from "@/server/services/admin/compliance";
import { DomainError } from "@/server/services/shipments";

/** A data-subject access request answered as one JSON file (logged; needs dsr.handle). */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/dsr/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { id } = await ctx.params;
  try {
    const data = await dsrExport(user, id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="tuma-${data.request.ref}.json"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof DomainError) return new Response(e.message, { status: e.status ?? 400 });
    throw e;
  }
}
