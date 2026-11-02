import { getCurrentUser } from "@/server/auth/current-user";
import { ControlTowerDashboard } from "@/components/dashboards/control-tower";
import { PartnerOverview } from "@/components/dashboards/partner-overview";
import { MerchantOverview } from "@/components/dashboards/merchant-overview";
import { asRange } from "@/domain/range";
import { NoAccess } from "@/components/shell/no-access";

export const instant = false;

/**
 * One portal, many levels of access: the home page is the overview the user's permissions allow.
 * Tuma Staff → control tower · Partners → cargo, fleet and finance · Corp → shipping dashboard.
 */
export default async function PortalHome({ params, searchParams }: PageProps<"/[locale]/portal">) {
  const { locale } = await params;
  const sp = await searchParams;
  const range = asRange(sp.range);
  const branch = typeof sp.branch === "string" ? sp.branch : null;
  const user = (await getCurrentUser())!;
  if (user.permissions.has("shipment.read.all")) return <ControlTowerDashboard locale={locale} range={range} />;
  if (user.permissions.has("partner.cargo.read")) return <PartnerOverview locale={locale} range={range} branch={branch} />;
  if (user.permissions.has("shipment.read.own_account")) return <MerchantOverview locale={locale} range={range} />;
  return <NoAccess locale={locale} />;
}
