import { Plug, CircleCheck, CircleDashed, CircleOff, type LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { integrations, type IntegrationMode } from "@/server/services/admin/integrations";
import { fmt, getDict } from "@/i18n";
import { relative } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { RetryIntegrationButton } from "@/components/admin/retry-integration-button";
import { cn } from "@/lib/utils";

export const instant = false;

const MODE_ICON: Record<IntegrationMode, LucideIcon> = { live: CircleCheck, simulated: CircleDashed, off: CircleOff };
const MODE_TONE: Record<IntegrationMode, string> = {
  live: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  simulated: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  off: "border-destructive/30 bg-destructive/10 text-destructive",
};

/**
 * The services Tuma connects to (SMS and messaging, payments, sign-in, compliance, finance, insurance, analytics,
 * maps, storage): live or simulated, which settings are present, and what went through each in the last day.
 */
export default async function IntegrationsPage({ params }: PageProps<"/[locale]/portal/admin/integrations">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("settings.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const g = t.admin.integrations;
  const { items } = await integrations(user);
  const count = (m: IntegrationMode) => items.filter((i) => i.mode === m).length;
  const groups = [...new Set(items.map((i) => i.category))];
  const num = (n: number) => n.toLocaleString("en-US");

  return (
    <div>
      <PageHeader icon={Plug} title={g.title} description={g.sub} />
      <p className="text-muted-foreground -mt-2 mb-5 text-sm">
        {fmt(g.summary, { live: count("live"), sim: count("simulated"), off: count("off") })} · {g.note}
      </p>

      <div className="space-y-6">
        {groups.map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {g.categories[cat] ?? cat}
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {items
                .filter((i) => i.category === cat)
                .map((i) => {
                  const Icon = MODE_ICON[i.mode];
                  const o = i.outbox;
                  return (
                    <Panel
                      key={i.key}
                      title={i.provider}
                      description={g.what[i.key]}
                      action={
                        <span title={g.modeHint[i.mode]} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", MODE_TONE[i.mode])}>
                          <Icon aria-hidden className="size-3.5" /> {g.modes[i.mode]}
                        </span>
                      }
                    >
                      <div className="space-y-4 p-4 sm:p-5">
                        <p className="text-muted-foreground text-xs">{g.modeHint[i.mode]}</p>

                        {i.settings.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-xs font-medium">{g.settings}</p>
                            <ul className="flex flex-wrap gap-1.5">
                              {i.settings.map((s) => (
                                <li key={s.name}>
                                  <Badge variant={s.set ? "secondary" : "destructive"} className="font-mono text-[11px]">
                                    {s.name} · {s.set ? g.set : g.missing}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {o && (
                          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.sent24h}</dt>
                              <dd className="tabular font-semibold">{num(o.sent24h)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.pending}</dt>
                              <dd className="tabular font-semibold">{num(o.pending)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.failed}</dt>
                              <dd className={cn("tabular font-semibold", o.failed > 0 && "text-destructive")}>{num(o.failed)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.lastSent}</dt>
                              <dd className="text-xs font-medium">{o.lastSentAt ? relative(o.lastSentAt, locale) : g.never}</dd>
                            </div>
                          </dl>
                        )}

                        {i.payments && (
                          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.paid24h}</dt>
                              <dd className="tabular font-semibold">{num(i.payments.paid)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.pending}</dt>
                              <dd className="tabular font-semibold">{num(i.payments.pending)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.failed}</dt>
                              <dd className={cn("tabular font-semibold", i.payments.failed > 0 && "text-destructive")}>{num(i.payments.failed)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">{g.lastSent}</dt>
                              <dd className="text-xs font-medium">{i.payments.lastPaidAt ? relative(i.payments.lastPaidAt, locale) : g.never}</dd>
                            </div>
                          </dl>
                        )}

                        {o && !i.delivered && <p className="text-muted-foreground text-xs">{g.queuedOnly}</p>}

                        {o?.lastError && (
                          <p className="bg-destructive/5 text-destructive rounded-md px-3 py-2 text-xs">
                            <span className="font-semibold">{g.lastError}:</span> <span className="font-mono break-all">{o.lastError}</span>
                          </p>
                        )}

                        {o && i.delivered && o.failed > 0 && <RetryIntegrationButton integration={i.key} />}
                      </div>
                    </Panel>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
