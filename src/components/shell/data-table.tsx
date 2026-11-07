import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Where a column goes on a phone card: the bold first line (`title`), the line under it (`subtitle`), the top right
 * (`aside`, e.g. a status or an amount), a small labelled fact in the grid below (`meta`, the default), or left off.
 */
export type MobileSlot = "title" | "subtitle" | "aside" | "meta" | "hidden";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "right";
  className?: string;
  mobile?: MobileSlot;
};

/**
 * A list that reads well at any width: a table from `sm` up, and a stack of cards on phones (title, subtitle, a status
 * or amount at the top right, and the rest as small labelled facts). With `href`, a whole card opens the row; links
 * and buttons inside a row still work. `empty` shows instead when there are no rows.
 */
export function DataTable<T>({
  rows,
  rowKey,
  columns,
  href,
  empty,
  minWidth = 720,
  rowClassName,
  footer,
}: {
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  href?: (row: T) => string;
  empty?: React.ReactNode;
  minWidth?: number;
  rowClassName?: (row: T) => string | undefined;
  footer?: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? null}</>;
  const slot = (s: MobileSlot) => columns.filter((c) => (c.mobile ?? "meta") === s);
  const [title, subtitle, aside, meta] = [slot("title"), slot("subtitle"), slot("aside"), slot("meta")];
  return (
    <>
      {/* Phones: cards */}
      <ul className="divide-y sm:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className={cn("relative px-4 py-3.5", href && "active:bg-muted/60", rowClassName?.(r))}>
            {href && <Link href={href(r)} prefetch={false} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset" aria-label={String(rowKey(r))} />}
            <div className={cn("relative", href && "pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {title.map((c) => (
                    <div key={c.key} className="truncate text-[15px] font-semibold">
                      {c.cell(r)}
                    </div>
                  ))}
                  {subtitle.map((c) => (
                    <div key={c.key} className="text-muted-foreground mt-0.5 truncate text-[13px]">
                      {c.cell(r)}
                    </div>
                  ))}
                </div>
                {aside.length > 0 && (
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right text-sm">
                    {aside.map((c) => (
                      <div key={c.key}>{c.cell(r)}</div>
                    ))}
                  </div>
                )}
              </div>
              {meta.length > 0 && (
                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                  {meta.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{c.header}</dt>
                      <dd className="mt-0.5 truncate text-[13px]">{c.cell(r)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Wider screens: the table */}
      <div className="table-scroll hidden sm:block">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="text-muted-foreground bg-muted/30 h-10 border-b text-left text-xs">
              {columns.map((c, i) => (
                <th key={c.key} scope="col" className={cn("font-medium", i === 0 ? "pl-4" : "pl-3", i === columns.length - 1 ? "pr-4" : "pr-3", c.align === "right" && "text-right", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={cn("hover:bg-muted/40 transition-colors", rowClassName?.(r))}>
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("py-2.5 align-middle", i === 0 ? "pl-4" : "pl-3", i === columns.length - 1 ? "pr-4" : "pr-3", c.align === "right" && "text-right", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
