import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { customer360 } from "@/server/services/admin/support-desk";
import { DomainError } from "@/server/services/shipments";
import { fmt, getDict } from "@/i18n";
import { dateOnly, dateTime, money } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { RevealField } from "@/components/admin/reveal-field";

export const instant = false;

/** Customer 360: profile, parcels both ways, wallet, cases, Bliss tickets, what businesses said about them. */
export default async function Customer360Page({ params, searchParams }: PageProps<"/[locale]/portal/admin/support/customer">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("support.view")) return <NoAccess locale={locale} />;
  const key = typeof sp.key === "string" ? sp.key : "";
  const t = getDict(locale);
  const c = t.admin.c360;
  const s = t.admin.support;
  const v = await customer360(user, key).catch((e) => {
    if (e instanceof DomainError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });
  const p = v.profile;
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
  const field = (f: "phone" | "name" | "email", masked: string | null) => (v.unmasked ? (masked ?? "—") : <RevealField customerKey={v.key} field={f} masked={masked} />);
  return (
    <>
      <PageHeader
        back={{ href: `/${locale}/portal/admin/support`, label: s.back }}
        eyebrow={c.title}
        title={p.name ?? "—"}
        icon={UserRound}
        badge={
          <>
            <Badge variant="outline">{p.onTuma ? s.onTuma : s.notOnTuma}</Badge>
            {p.active === false && <Badge variant="destructive">{c.suspended}</Badge>}
          </>
        }
        description={v.unmasked ? undefined : c.masked}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Panel title={c.profile}>
            <dl className="divide-y">
              {row(c.fields.name, field("name", p.name))}
              {row(c.fields.phone, field("phone", p.phone))}
              {row(c.fields.email, field("email", p.email))}
              {row(c.area, p.area ?? "—")}
              {row(c.lastSeen, p.lastSeenAt ? dateTime(p.lastSeenAt, locale) : "—")}
              {v.account && row(c.account, `${v.account.name} · ${v.account.status}`)}
              {v.kyb.length > 0 && row(c.kyb, v.kyb.map((k) => `${k.businessName} (${k.ref}): ${k.status}`).join("; "))}
              {row(c.rating, v.rating ? fmt(c.ratingValue, { avg: v.rating.avg, n: v.rating.n }) : c.noRating)}
            </dl>
          </Panel>
          <Panel title={c.wallet}>
            {!v.wallet ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">{c.noWallet}</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between border-b px-4 py-3">
                  <span className="text-muted-foreground text-sm">{c.balance}</span>
                  <span className="font-display tabular text-xl font-semibold">{money(v.wallet.balance, locale)}</span>
                </div>
                <ul className="divide-y text-sm">
                  {v.wallet.entries.map((e) => (
                    <li key={e.reference} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="min-w-0">
                        <span className="block">
                          {t.admin.finance.kinds[e.kind] ?? e.kind}
                          {e.company && <span className="text-muted-foreground"> · {c.company}</span>}
                          {e.status !== "paid" && <span className="text-muted-foreground"> · {t.admin.finance.statuses[e.status] ?? e.status}</span>}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {dateTime(e.at, locale)}
                          {e.waybill && ` · ${e.waybill}`}
                        </span>
                      </span>
                      <span className={`tabular font-medium ${e.amount < 0 ? "" : "text-emerald-700 dark:text-emerald-400"}`}>{money(e.amount, locale)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title={c.reports}>
            {v.reports.length === 0 ? (
              <p className="text-muted-foreground px-4 py-4 text-sm">{c.noReports}</p>
            ) : (
              <ul className="divide-y text-sm">
                {v.reports.map((r) => (
                  <li key={`${r.reason}-${r.status}`} className="flex justify-between px-4 py-2">
                    <span>{t.agent.cust.reasons?.[r.reason as keyof typeof t.agent.cust.reasons] ?? r.reason}</span>
                    <span className="text-muted-foreground">
                      {r.status} · {r.n}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title={c.parcels}>
            {v.parcels.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">{c.noParcels}</p>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[560px] text-sm">
                  <tbody className="divide-y">
                    {v.parcels.map((x) => (
                      <tr key={x.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5">
                          <Link href={`/${locale}/portal/shipments/${x.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                            {x.waybill}
                          </Link>
                          <div className="text-muted-foreground text-xs">{dateOnly(x.createdAt, locale)}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{x.sent ? c.sent : c.received}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-muted-foreground text-xs">{c.with}</span> {x.other ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          {t.states[x.state as keyof typeof t.states] ?? x.state}
                          {x.openExceptions > 0 && (
                            <Badge variant="destructive" className="ml-1.5">
                              {fmt(c.exceptionsOpen, { n: x.openExceptions })}
                            </Badge>
                          )}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right">{money(x.total, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title={c.cases}>
            {v.cases.length === 0 ? (
              <p className="text-muted-foreground px-4 py-4 text-sm">{c.noCases}</p>
            ) : (
              <ul className="divide-y text-sm">
                {v.cases.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link href={`/${locale}/portal/admin/support/${r.id}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                      {r.ref}
                    </Link>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate">{s.kinds[r.kind] ?? r.kind}</span>
                    <Badge variant="outline">{s.statuses[r.status] ?? r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={c.tickets}>
            {v.tickets === null ? (
              <p className="text-muted-foreground px-4 py-4 text-sm">{c.ticketsDown}</p>
            ) : v.tickets.length === 0 ? (
              <p className="text-muted-foreground px-4 py-4 text-sm">{c.noTickets}</p>
            ) : (
              <ul className="divide-y text-sm">
                {v.tickets.map((k) => (
                  <li key={k.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">{k.subject}</span>
                      <Badge variant="outline">{k.status}</Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {k.ref} · {dateTime(k.updated_at, locale)} · {fmt(c.messages, { n: k.message_count })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
