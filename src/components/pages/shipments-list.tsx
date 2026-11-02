import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listShipments } from "@/server/services/shipments";
import { getDict } from "@/i18n";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { ShipmentFilters } from "@/components/shipments/filters";
import { ShipmentTable } from "@/components/shipments/shipment-table";
import { Button } from "@/components/ui/button";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function ShipmentsListPage({ locale, searchParams }: { locale: string; searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const q = one(sp.q);
  const state = one(sp.state);
  const atRisk = one(sp.risk) === "1";
  const cursor = one(sp.cursor);
  const { items, nextCursor } = await listShipments(user, { q, state, atRisk, cursor, limit: 25 });
  const base = `/${locale}/portal/shipments`;
  const more = new URLSearchParams({ ...(q ? { q } : {}), ...(state ? { state } : {}), ...(atRisk ? { risk: "1" } : {}), ...(nextCursor ? { cursor: nextCursor } : {}) });

  return (
    <>
      <PageHeader title={t.shipments.title}>
        {user.permissions.has("shipment.create") && (
          <Button asChild>
            <Link href={`/${locale}/portal/shipments/new`}>
              <PackagePlus /> {t.nav.newShipment}
            </Link>
          </Button>
        )}
      </PageHeader>
      <Panel>
        <ShipmentFilters locale={locale} basePath={base} q={q} state={state} atRisk={atRisk} />
        <ShipmentTable rows={items} locale={locale} basePath={base} showAccount={user.permissions.has("shipment.read.all")} />
        {(nextCursor || cursor) && (
          <div className="flex justify-between border-t px-4 py-3 text-sm">
            {cursor ? <Link href={`${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(state ? { state } : {}) })}`} className="underline-offset-4 hover:underline">← {t.common.previous}</Link> : <span />}
            {nextCursor && <Link href={`${base}?${more}`} className="underline-offset-4 hover:underline">{t.common.next} →</Link>}
          </div>
        )}
      </Panel>
    </>
  );
}
