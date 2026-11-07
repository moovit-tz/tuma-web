import Link from "next/link";
import { Building2, Package } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentNotifications } from "@/server/services/agent-parcels";
import { fmt, getDict } from "@/i18n";
import { dateTime, relative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";

export const instant = false;

/** The business's notifications, as in the app: moves on its parcels made by others, and its application's updates. */
export default async function NotificationsPage({ params }: PageProps<"/[locale]/portal/notifications">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const n = t.agent.notif;
  const { notifications } = await agentNotifications(user);
  const kybStatus = t.onboarding.status as Record<string, string>;

  return (
    <div>
      <PageHeader title={n.title} description={n.sub} />
      <Panel>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-4 py-16 text-center text-sm">{n.empty}</p>
        ) : (
          <ul className="divide-y">
            {notifications.map((x) => (
              <li key={`${x.kind}-${x.id}`}>
                {x.kind === "parcel" ? (
                  <Link href={`/${locale}/portal/parcels/${x.waybill}`} prefetch={false} className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3">
                    <span className="bg-muted mt-0.5 grid size-8 shrink-0 place-items-center rounded-full">
                      <Package className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{fmt(n.parcelMoved, { waybill: x.waybill, state: x.state ? (t.states[x.state] ?? x.state) : "—" })}</span>
                      <span className="text-muted-foreground block truncate text-xs">{[x.receiver ? fmt(n.forReceiver, { name: x.receiver }) : null, x.note].filter(Boolean).join(" · ")}</span>
                    </span>
                    <time dateTime={x.at} title={dateTime(x.at, locale)} className="text-muted-foreground shrink-0 text-xs">
                      {relative(x.at, locale)}
                    </time>
                  </Link>
                ) : (
                  <Link href={`/${locale}/portal/application`} prefetch={false} className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3">
                    <span className="bg-muted mt-0.5 grid size-8 shrink-0 place-items-center rounded-full">
                      <Building2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{fmt(n.business, { ref: x.ref, status: kybStatus[x.status] ?? x.status })}</span>
                      {x.note && <span className="text-muted-foreground block text-xs">{x.note}</span>}
                    </span>
                    <time dateTime={x.at} title={dateTime(x.at, locale)} className="text-muted-foreground shrink-0 text-xs">
                      {relative(x.at, locale)}
                    </time>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
