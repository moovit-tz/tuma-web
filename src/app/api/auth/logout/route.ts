import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session-token";

export async function POST(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "sw" ? "sw" : "en";
  const res = NextResponse.redirect(new URL(`/${locale}`, process.env.APP_URL), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
