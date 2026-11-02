/**
 * Dashboard period filter. Ranges are whole days in East Africa Time (UTC+3, no daylight saving), so "Today"
 * starts at local midnight and "Last 7 days" includes today.
 */
export const RANGES = ["today", "7d", "30d", "all"] as const;
export type DashRange = (typeof RANGES)[number];
export const DEFAULT_RANGE: DashRange = "30d";

export function asRange(v: unknown): DashRange {
  return RANGES.includes(v as DashRange) ? (v as DashRange) : DEFAULT_RANGE;
}

const EAT_MS = 3 * 3600e3;
const DAY_MS = 86400e3;

/** First instant of the range, or null for all time. */
export function rangeStart(r: DashRange, now = Date.now()): Date | null {
  if (r === "all") return null;
  const todayStart = Math.floor((now + EAT_MS) / DAY_MS) * DAY_MS - EAT_MS;
  const back = r === "today" ? 0 : r === "7d" ? 6 : 29;
  return new Date(todayStart - back * DAY_MS);
}
