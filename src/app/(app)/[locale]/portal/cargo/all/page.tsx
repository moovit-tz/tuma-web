import { redirect } from "next/navigation";

/** Old address of the All cargo list: it is now a tab on the Cargo page. Keeps the filters. */
export default async function AllCargoRedirect({ params, searchParams }: PageProps<"/[locale]/portal/cargo/all">) {
  const { locale } = await params;
  const sp = await searchParams;
  const u = new URLSearchParams({ tab: "all" });
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && !(k === "view" && v === "all")) u.set(k, v);
  redirect(`/${locale}/portal/cargo?${u}`);
}
