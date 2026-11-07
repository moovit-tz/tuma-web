import { connection, NextResponse } from "next/server";
import { getSetting } from "@/server/settings";

/**
 * GET → { phone, phoneHref, whatsapp, whatsappHref, email, hours: { en, sw } }: how to reach Tuma support, as set in
 * Platform settings. Public (guests see it on Help too), so no sign-in.
 */
export async function GET() {
  // Read at request time (settings change from the portal), never prerendered at build.
  await connection();
  const c = await getSetting("supportContacts");
  const digits = (v: string) => v.replace(/\D/g, "");
  return NextResponse.json(
    { ...c, phoneHref: `tel:+${digits(c.phone)}`, whatsappHref: `https://wa.me/${digits(c.whatsapp)}` },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
