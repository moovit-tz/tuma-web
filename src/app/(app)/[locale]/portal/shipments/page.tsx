import { ShipmentsListPage } from "@/components/pages/shipments-list";

export default async function Page({ params, searchParams }: PageProps<"/[locale]/portal/shipments">) {
  const { locale } = await params;
  return <ShipmentsListPage locale={locale} searchParams={searchParams} />;
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
