import Link from "next/link";
import { getDict } from "@/i18n";
import { dateTime, nowMs, relative } from "@/lib/format";
import { StateBadge } from "./state-badge";
import type { listExceptions } from "@/server/services/shipments";

type Row = Awaited<ReturnType<typeof listExceptions>>[number];

export function ExceptionList({ rows, locale }: { rows: Row[]; locale: string }) {
  const t = getDict(locale);
  if (!rows.length) return <p className="text-muted-foreground px-4 py-10 text-center text-sm">{t.console.noExceptions}</p>;
  const now = nowMs();
  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const overdue = r.ex.slaDueAt.getTime() < now;
        return (
          <li key={r.ex.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11.5px]">{r.ex.reasonCode}</span>
                <span className="font-medium">{locale === "sw" ? r.reasonSw : r.reasonEn}</span>
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <Link href={`/${locale}/portal/shipments/${r.waybill}`} className="text-foreground font-mono underline-offset-4 hover:underline">
                  {r.waybill}
                </Link>
                <span>{r.accountName}</span>
                <StateBadge state={r.state} label={t.states[r.state]} />
              </div>
              {r.ex.note && <p className="text-muted-foreground mt-1 text-[13px]">{r.ex.note}</p>}
            </div>
            <div className={"tabular text-[13px] sm:text-right " + (overdue ? "text-parcel font-medium" : "text-muted-foreground")}>
              {overdue ? t.console.overdue : t.console.exceptionSla} · {relative(r.ex.slaDueAt, locale)}
              <div className="text-muted-foreground text-xs font-normal">{dateTime(r.ex.slaDueAt, locale)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
