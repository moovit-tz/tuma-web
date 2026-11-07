import { Send } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentParcels } from "@/server/services/agent-parcels";
import { dispatchOptions } from "@/server/services/manifests";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { NewManifestForm } from "@/components/agent/new-manifest-form";

export const instant = false;

const SENDABLE = new Set(["RECEIVED", "AT_HUB", "ATTEMPT_FAILED"]);

/** Send parcels on: choose what's in hand, where it goes (the doors or a Tuma point) and who carries it. */
export default async function NewManifestPage({ params, searchParams }: PageProps<"/[locale]/portal/manifests/new">) {
  const { locale } = await params;
  const sp = await searchParams;
  const start = typeof sp.waybill === "string" ? sp.waybill.trim().toUpperCase() : undefined;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.permissions.has("shipment.dispatch") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const m = t.agent.mf;
  const [list, opts] = await Promise.all([agentParcels(user, { view: "in_hand", limit: 100 }), dispatchOptions(user)]);
  const parcels = list.parcels
    .filter((p) => SENDABLE.has(p.state))
    .map((p) => ({ waybill: p.waybill, state: p.state as string, deliveryMode: p.deliveryMode as string, to: p.to, goods: p.goods, pieces: p.pieces }));

  return (
    <div>
      <PageHeader back={{ href: `/${locale}/portal/manifests`, label: m.back }} icon={Send} title={m.newTitle} description={`${m.newSub} · ${opts.from.name}`} />
      <NewManifestForm locale={locale} parcels={parcels} couriers={opts.couriers} tumaCourier={opts.tumaCourier} region={opts.from.region ?? undefined} dispatchers={opts.dispatchers} startWith={start} />
    </div>
  );
}
