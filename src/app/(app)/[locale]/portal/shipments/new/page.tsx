import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth/current-user";
import { listLocations } from "@/server/services/shipments";
import { db } from "@/server/db/client";
import { accounts } from "@/server/db/schema";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { NewParcelForm } from "@/components/shipments/new-parcel-form";

export default async function NewShipmentPage({ params }: PageProps<"/[locale]/portal/shipments/new">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("shipment.create")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const [wakala, account] = await Promise.all([
    listLocations("wakala"),
    user.accountId ? db.select().from(accounts).where(eq(accounts.id, user.accountId)).then((r) => r[0]) : undefined,
  ]);
  return (
    <>
      <PageHeader eyebrow={t.form.subtitle} title={t.form.title} />
      <NewParcelForm
        locale={locale}
        wakala={wakala.map((w) => ({ id: w.id, name: w.name, region: w.region }))}
        allowedServiceLevels={account?.allowedServiceLevels ?? ["standard"]}
        shipperDefaults={{ name: account?.name ?? user.name, region: "Dar es Salaam" }}
      />
    </>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
