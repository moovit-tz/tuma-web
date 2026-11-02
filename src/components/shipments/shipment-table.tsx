import Link from "next/link";
import { getDict } from "@/i18n";
import { dateTime, money, nowMs } from "@/lib/format";
import { maskPhone } from "@/domain/phone";
import { StateBadge } from "./state-badge";
import type { listShipments } from "@/server/services/shipments";

type Row = Awaited<ReturnType<typeof listShipments>>["items"][number];

export function ShipmentTable({ rows, locale, basePath, showAccount, maskPhones }: { rows: Row[]; locale: string; basePath: string; showAccount?: boolean; maskPhones?: boolean }) {
  const t = getDict(locale);
  if (rows.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <p className="font-medium">{t.shipments.empty}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t.shipments.emptyHint}</p>
      </div>
    );
  }
  const now = nowMs();
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="px-4 py-2.5 font-medium">{t.shipments.waybill}</th>
            {showAccount && <th className="px-3 py-2.5 font-medium">{t.shipments.account}</th>}
            <th className="px-3 py-2.5 font-medium">{t.shipments.consignee}</th>
            <th className="px-3 py-2.5 font-medium">{t.shipments.destination}</th>
            <th className="px-3 py-2.5 font-medium">{t.shipments.state}</th>
            <th className="px-3 py-2.5 font-medium">{t.shipments.promised}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t.shipments.cod}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t.shipments.created}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const open = !["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"].includes(r.state);
            const late = open && r.promisedAt && r.promisedAt.getTime() < now;
            return (
              <tr key={r.id} className="hover:bg-muted/50 border-b last:border-0">
                <td className="px-4 py-2.5">
                  <Link href={`${basePath}/${r.waybill}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline" prefetch={false}>
                    {r.waybill}
                  </Link>
                  {r.merchantRef && <div className="text-muted-foreground text-xs">{r.merchantRef}</div>}
                </td>
                {showAccount && <td className="px-3 py-2.5">{r.accountName}</td>}
                <td className="px-3 py-2.5">
                  <div>{r.consignee.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">{maskPhones ? maskPhone(r.consignee.phone) : r.consignee.phone}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div>{r.consignee.address.district}</div>
                  <div className="text-muted-foreground text-xs">{r.consignee.address.region}</div>
                </td>
                <td className="px-3 py-2.5">
                  <StateBadge state={r.state} label={t.states[r.state]} exception={r.exception} exceptionLabel={t.states.EXCEPTION} />
                </td>
                <td className={"tabular px-3 py-2.5 " + (late ? "text-parcel font-medium" : "")}>
                  {dateTime(r.promisedAt, locale)}
                  <div className="text-muted-foreground text-xs">{r.serviceLevel ? t.service[r.serviceLevel] : ""}</div>
                </td>
                <td className="tabular px-3 py-2.5 text-right">{r.codAmount ? money(r.codAmount, locale) : <span className="text-muted-foreground">—</span>}</td>
                <td className="text-muted-foreground tabular px-4 py-2.5 text-right">{dateTime(r.createdAt, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
