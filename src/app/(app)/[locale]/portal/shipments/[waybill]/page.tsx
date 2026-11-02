import { ShipmentDetailPage } from "@/components/pages/shipment-detail";

export default async function Page({ params }: PageProps<"/[locale]/portal/shipments/[waybill]">) {
  const { locale, waybill } = await params;
  return <ShipmentDetailPage locale={locale} waybill={waybill} />;
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
