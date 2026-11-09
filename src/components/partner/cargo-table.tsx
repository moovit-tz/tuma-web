import Link from "next/link";
import { fmt, getDict } from "@/i18n";
import { dateTime, kg } from "@/lib/format";
import { StateBadge } from "@/components/shipments/state-badge";
import { AssignVehicle } from "./assign-vehicle";
import type { listCargo, vehicleOptions } from "@/server/services/partner";

type Row = Awaited<ReturnType<typeof listCargo>>[number];

export function CargoTable({
  rows,
  locale,
  vehicles,
  canOperate,
  compact = false,
  showBranch = false,
}: {
  rows: Row[];
  locale: string;
  vehicles: Awaited<ReturnType<typeof vehicleOptions>>;
  canOperate: boolean;
  /** Fewer columns for narrow panels (dashboard). */
  compact?: boolean;
  /** Add the branch column (company-wide view across several branches). */
  showBranch?: boolean;
}) {
  const t = getDict(locale);
  const p = t.partner;
  if (!rows.length)
    return (
      <p className="text-muted-foreground px-4 py-14 text-center text-sm">
        {p.cargo.empty}
      </p>
    );
  return (
    <div className="table-scroll">
      <table
        className={
          "w-full text-sm " + (compact ? "min-w-[560px]" : "min-w-[900px]")
        }
      >
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="px-4 py-2.5 font-medium">{t.shipments.waybill}</th>
            <th className="px-3 py-2.5 font-medium">{p.cargo.client}</th>
            {showBranch && <th className="px-3 py-2.5 font-medium">{t.branches.branch}</th>}
            {!compact && (
              <>
                <th className="px-3 py-2.5 font-medium">
                  {t.shipments.destination}
                </th>
                <th className="px-3 py-2.5 font-medium">{p.cargo.goods}</th>
                <th className="px-3 py-2.5 text-right font-medium">
                  {p.cargo.weight}
                </th>
              </>
            )}
            <th className="px-3 py-2.5 font-medium">{t.shipments.state}</th>
            <th className="px-3 py-2.5 font-medium">{p.cargo.vehicle}</th>
            {!compact && (
              <th className="px-4 py-2.5 text-right font-medium">
                {p.cargo.updated}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const closed = ["DELIVERED", "RETURNED", "CANCELLED"].includes(
              r.state,
            );
            return (
              <tr
                key={r.waybill}
                className="hover:bg-muted/50 border-b last:border-0"
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Link
                    href={`/${locale}/portal/shipments/${r.waybill}`}
                    prefetch={false}
                    className="font-mono text-[13px] font-medium underline-offset-4 hover:underline"
                  >
                    {r.waybill}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  {r.clientName ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {showBranch && (
                  <td className="px-3 py-2.5 whitespace-nowrap" title={r.branchName ?? undefined}>
                    {r.branchCode ? <span className="font-mono text-xs font-medium">{r.branchCode}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                )}
                {!compact && (
                  <>
                    <td className="px-3 py-2.5">
                      <div>{r.consignee.address.district}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.consignee.address.region}
                      </div>
                    </td>
                    <td
                      className="max-w-[180px] truncate px-3 py-2.5"
                      title={r.goods}
                    >
                      {r.goods}
                      <div className="text-muted-foreground text-xs">
                        {r.pieces === 1 ? t.shipments.pieceOne : fmt(t.shipments.piecesN, { n: r.pieces })}
                      </div>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">
                      {kg(r.weightG, locale)}
                    </td>
                  </>
                )}
                <td className="px-3 py-2.5">
                  <StateBadge
                    state={r.state}
                    label={t.states[r.state]}
                    exception={r.exception}
                    exceptionLabel={t.states.EXCEPTION}
                  />
                </td>
                <td className="px-3 py-2.5">
                  {canOperate && !closed ? (
                    <AssignVehicle
                      waybill={r.waybill}
                      current={r.vehicleId}
                      options={vehicles}
                    />
                  ) : (
                    <span className="font-mono text-xs">{r.plate ?? "—"}</span>
                  )}
                </td>
                {!compact && (
                  <td className="text-muted-foreground tabular px-4 py-2.5 text-right">
                    {dateTime(r.updatedAt, locale)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
