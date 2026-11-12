"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Building2, LifeBuoy, Package, PanelRightClose, X, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { railNotifications, railOpenTicket, railTickets } from "@/app/actions/rail";
import type { AgentNotification } from "@/server/services/agent-parcels";
import type { TicketSummary } from "@/server/adapters/bliss";

type PanelId = "notifications" | "help";
type App = { id: PanelId; icon: LucideIcon; color: string; active: string };

const APPS: App[] = [
  {
    id: "notifications",
    icon: Bell,
    color: "text-[#8a4e00]",
    active: "bg-[#8a4e00]/10 text-[#8a4e00]",
  },
  {
    id: "help",
    icon: LifeBuoy,
    color: "text-[#dc2626]",
    active: "bg-[#dc2626]/10 text-[#dc2626]",
  },
];
const TOPICS = ["parcel", "payment", "printer", "account", "app", "courier", "business", "other"] as const;
const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  RESOLVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CLOSED: "bg-muted text-muted-foreground",
};

/**
 * The right rail, same pattern as the CRM's and Bliss's: a 56px strip of icons on wide screens, each opening a 320px
 * drawer beside it. Notifications (offices and businesses with a workspace) and Help (support tickets, through Bliss).
 * Its width is published as --rail-w so the fixed header and the main column make room for it.
 */
export function RightRail({
  showNotifications,
  collapsed,
  onCollapse,
  onOpenChange,
}: {
  showNotifications: boolean;
  collapsed: boolean;
  onCollapse: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { dict, locale } = useI18n();
  const r = dict.shell.rail;
  const apps = APPS.filter((a) => a.id !== "notifications" || showNotifications);
  const [active, setActive] = useState<PanelId | null>(null);
  const [rendered, setRendered] = useState<PanelId | null>(null);
  const [closing, setClosing] = useState(false);
  const [notifications, setNotifications] = useState<AgentNotification[] | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // How many notifications arrived in the last day, worked out when they load (not during render).
  const [recent, setRecent] = useState(0);
  const loadNotifications = () => {
    if (!showNotifications) return;
    railNotifications().then((res) => {
      const items = res.ok ? (res.data ?? []) : [];
      const since = Date.now() - 24 * 3600 * 1000;
      setNotifications(items);
      setRecent(items.filter((n) => new Date(n.at).getTime() > since).length);
    });
  };
  const loadTickets = () =>
    railTickets().then((res) => {
      setTickets(res.ok ? (res.data ?? []) : []);
      setTicketsError(res.ok ? null : res.error);
    });

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const open = (id: PanelId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(id);
    setRendered(id);
    setClosing(false);
    onOpenChange(true);
    if (id === "notifications") loadNotifications();
    if (id === "help") loadTickets();
  };
  const close = () => {
    if (!rendered) return;
    setActive(null);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setRendered(null);
      setClosing(false);
      onOpenChange(false);
    }, 180);
  };

  if (collapsed) return null;
  const app = APPS.find((a) => a.id === rendered);
  const label = (id: PanelId) => (id === "notifications" ? r.notifications : r.help);

  return (
    <div className="fixed inset-y-0 right-0 z-30 hidden lg:flex">
      {rendered && app && (
        <aside className={cn("bg-card flex w-80 flex-col border-l", closing ? "drawer-slide-out" : "drawer-slide-in")}>
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <app.icon className={cn("size-4", app.color)} />
              {label(app.id)}
            </div>
            <button type="button" onClick={close} aria-label={r.close} className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {rendered === "notifications" && <NotificationsPanel items={notifications} locale={locale} onNavigate={close} />}
            {rendered === "help" && <HelpPanel tickets={tickets} error={ticketsError} locale={locale} onSent={loadTickets} />}
          </div>
        </aside>
      )}

      <div className="bg-card flex w-14 shrink-0 flex-col items-center border-l">
        <div className="flex h-16 w-full shrink-0 items-center justify-center border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onCollapse} aria-label={r.hide} className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 place-items-center rounded-md">
                <PanelRightClose className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{r.hide}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4 pt-4">
          {apps.map((a) => {
            const badge = a.id === "notifications" ? recent : (tickets ?? []).filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => (active === a.id ? close() : open(a.id))}
                    aria-label={label(a.id)}
                    aria-pressed={active === a.id}
                    className={cn("relative grid size-10 place-items-center rounded-full transition-colors", active === a.id ? a.active : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <a.icon className="size-[18px]" />
                    {badge > 0 && (
                      <span
                        className={cn(
                          "border-card absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[10.5px] font-bold text-white",
                          a.id === "notifications" ? "bg-[#8a4e00]" : "bg-[#dc2626]",
                        )}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{label(a.id)}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({ items, locale, onNavigate }: { items: AgentNotification[] | null; locale: string; onNavigate: () => void }) {
  const { dict } = useI18n();
  const r = dict.shell.rail;
  const n = dict.agent.notif;
  const kybStatus = dict.onboarding.status as Record<string, string>;
  if (items === null) return <p className="text-muted-foreground text-sm">{r.loading}</p>;
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{r.noNotifications}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.slice(0, 30).map((x) => (
            <li key={`${x.kind}-${x.id}`}>
              <Link
                href={x.kind === "parcel" ? `/${locale}/portal/parcels/${x.waybill}` : `/${locale}/portal/application`}
                prefetch={false}
                onClick={onNavigate}
                className="hover:bg-muted/50 flex items-start gap-2.5 rounded-md border p-2.5"
              >
                {x.kind === "parcel" ? <Package className="text-muted-foreground mt-0.5 size-4 shrink-0" /> : <Building2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {x.kind === "parcel"
                      ? fmt(n.parcelMoved, {
                          waybill: x.waybill,
                          state: x.state ? (dict.states[x.state] ?? x.state) : "—",
                        })
                      : fmt(n.business, {
                          ref: x.ref,
                          status: kybStatus[x.status] ?? x.status,
                        })}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {[x.kind === "parcel" && x.receiver ? fmt(n.forReceiver, { name: x.receiver }) : null, x.note, relative(x.at, locale)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/${locale}/portal/notifications`} prefetch={false} onClick={onNavigate} className="text-muted-foreground hover:text-foreground text-center text-xs font-medium">
        {r.allNotifications}
      </Link>
    </div>
  );
}

function HelpPanel({ tickets, error, locale, onSent }: { tickets: TicketSummary[] | null; error: string | null; locale: string; onSent: () => void }) {
  const { dict } = useI18n();
  const r = dict.shell.rail;
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    topic: "parcel",
    subject: "",
    message: "",
    waybill: "",
    urgent: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    start(async () => {
      const res = await railOpenTicket({
        ...form,
        waybill: form.waybill.trim() || undefined,
      });
      if (!res.ok) return setFormError(res.error);
      setSent(res.data?.ref ?? "");
      setAsking(false);
      setForm({
        topic: "parcel",
        subject: "",
        message: "",
        waybill: "",
        urgent: false,
      });
      onSent();
    });
  };

  const field = "bg-background w-full rounded-md border px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-col gap-3">
      {sent !== null && <p className="rounded-md bg-emerald-500/10 p-2.5 text-[13px] text-emerald-700 dark:text-emerald-300">{fmt(r.sent, { ref: sent })}</p>}

      {asking ? (
        <form onSubmit={submit} className="flex flex-col gap-2.5 rounded-md border p-3">
          <label className="text-xs font-medium">
            {r.topic}
            <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={cn(field, "mt-1")}>
              {TOPICS.map((k) => (
                <option key={k} value={k}>
                  {r.topics[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            {r.subject}
            <input required minLength={3} maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={cn(field, "mt-1")} />
          </label>
          <label className="text-xs font-medium">
            {r.message}
            <textarea required minLength={10} maxLength={4000} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={cn(field, "mt-1 resize-y")} />
          </label>
          <label className="text-xs font-medium">
            {r.waybill}
            <input value={form.waybill} onChange={(e) => setForm({ ...form, waybill: e.target.value })} className={cn(field, "mt-1 font-mono uppercase")} />
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
            {r.urgent}
          </label>
          {formError && <p className="text-destructive text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="bg-primary text-primary-foreground flex-1 rounded-md py-2 text-[13px] font-semibold disabled:opacity-60">
              {pending ? r.sending : r.send}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="hover:bg-muted rounded-md border px-3 text-[13px]">
              {r.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAsking(true);
            setSent(null);
          }}
          className="bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold"
        >
          {r.ask}
        </button>
      )}

      {error ? (
        <p className="text-muted-foreground text-[13px]">{error}</p>
      ) : tickets === null ? (
        <p className="text-muted-foreground text-[13px]">{r.loading}</p>
      ) : tickets.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">{r.noTickets}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-md border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-[13px] font-medium">{t.subject}</p>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium", STATUS_BADGE[t.status] ?? "bg-muted text-muted-foreground")}>
                  {(r.status as Record<string, string>)[t.status] ?? t.status}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t.ref} · {fmt(r.messages, { n: t.message_count })} · {relative(t.updated_at, locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
