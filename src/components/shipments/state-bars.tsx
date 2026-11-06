import Link from "next/link";
import { getDict } from "@/i18n";
import { num } from "@/lib/format";

const ORDER = ["AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "IN_TRANSIT", "OUT_FOR_DELIVERY", "ATTEMPT_FAILED", "READY_FOR_COLLECTION", "RETURNING", "DELIVERED", "RETURNED", "CANCELLED"];

/** Horizontal bars, one per state. Open states in ink, terminal states muted. */
export function StateBars({ states, locale, basePath }: { states: Record<string, number>; locale: string; basePath: string }) {
  const t = getDict(locale);
  const rows = ORDER.filter((s) => states[s]);
  const max = Math.max(1, ...rows.map((s) => states[s]));
  return (
    <ul className="space-y-1 p-4">
      {rows.map((s) => {
        const terminal = ["DELIVERED", "RETURNED", "CANCELLED"].includes(s);
        const warn = s === "ATTEMPT_FAILED" || s === "RETURNING";
        return (
          <li key={s}>
            <Link href={`${basePath}${basePath.includes("?") ? "&" : "?"}state=${s}`} className="group grid grid-cols-[150px_1fr_40px] items-center gap-3 rounded py-1 text-sm">
              <span className="truncate group-hover:underline">{t.states[s]}</span>
              <span className="bg-sunken h-2.5 overflow-hidden rounded-full">
                <span
                  className={"block h-full rounded-full " + (warn ? "bg-warn" : terminal ? "bg-muted-foreground/40" : "bg-primary")}
                  style={{ width: `${(states[s] / max) * 100}%` }}
                />
              </span>
              <span className="tabular text-right font-medium">{num(states[s], locale)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
