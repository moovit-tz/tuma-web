import Link from "next/link";
import { getDict } from "@/i18n";
import { StateBadge } from "@/components/shipments/state-badge";
import type { listCargo } from "@/server/services/partner";

type Row = Awaited<ReturnType<typeof listCargo>>[number];

/** Latest cargo on the dashboard, as a summary: waybill, client, status. Rows share the panel's height evenly. */
export function RecentCargo({ rows, locale }: { rows: Row[]; locale: string }) {
  const t = getDict(locale);
  const p = t.partner;
  if (!rows.length) return <p className="text-muted-foreground px-4 py-14 text-center text-sm">{p.cargo.empty}</p>;
  return (
    <div className="table-scroll h-full">
      <table className="h-full w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[38%]" />
          <col />
          <col className="w-[30%]" />
        </colgroup>
        <thead>
          <tr className="h-10 text-left text-xs">
            <th className="px-5">{t.shipments.waybill}</th>
            <th className="px-3">{p.cargo.client}</th>
            <th className="px-5">{t.shipments.state}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.waybill} className="hover:bg-muted/40">
              <td className="truncate px-5 py-3">
                <Link href={`/${locale}/portal/shipments/${r.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                  {r.waybill}
                </Link>
              </td>
              <td className="truncate px-3 py-3" title={r.clientName ?? r.consignee.name}>
                {r.clientName ?? r.consignee.name}
              </td>
              <td className="truncate px-5 py-3">
                <StateBadge state={r.state} label={t.states[r.state]} exception={r.exception} exceptionLabel={t.states.EXCEPTION} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
