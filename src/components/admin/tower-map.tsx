import { REGION_GEO } from "@/components/map/region-geo";

/**
 * Tanzania with live dots: couriers online (blue) and parcels at risk (amber) or late (red), at their last reported
 * position. Drawn on the same Mercator base as the landing map; near the equator it is linear, so a lat/lng maps to the
 * base's x/y with the scale fitted to its city marks (Dar, Mwanza, Arusha land within a pixel).
 */
const K = 18.8;
const X0 = -141.3;
const Y0 = 273.45;
const xy = (lat: number, lng: number) => [X0 + K * lng, Y0 - K * lat] as const;
const VIEW = { x: 400, y: 282, w: 232, h: 222 };
const inView = (x: number, y: number) => x >= VIEW.x && x <= VIEW.x + VIEW.w && y >= VIEW.y && y <= VIEW.y + VIEW.h;

export function TowerMap({
  couriers,
  parcels,
  label,
  legend,
}: {
  couriers: { id: string; lat: number; lng: number }[];
  parcels: { id: string; waybill: string; lat: number; lng: number; level: "risk" | "late" }[];
  label: string;
  legend: { courier: string; risk: string; late: string };
}) {
  const tz = REGION_GEO.TZ;
  const neighbours = ["KE", "UG", "RW", "BI", "CD", "ZM", "MW", "MZ"].map((k) => REGION_GEO[k]?.d).filter(Boolean) as string[];
  return (
    <figure className="m-0">
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img" aria-label={label} className="bg-muted/30 h-auto w-full">
        {neighbours.map((d, i) => (
          <path key={i} d={d} className="fill-muted stroke-border" strokeWidth={0.4} />
        ))}
        <path d={tz.d} className="fill-card stroke-foreground/40" strokeWidth={0.6} />
        {tz.cities.map(([n, x, y]) => (
          <g key={n} className="fill-muted-foreground">
            <circle cx={x} cy={y} r={0.9} />
            <text x={x + 2} y={y + 1} fontSize={4.2}>
              {n}
            </text>
          </g>
        ))}
        {couriers.map((c) => {
          const [x, y] = xy(c.lat, c.lng);
          return inView(x, y) ? <circle key={c.id} cx={x} cy={y} r={1.6} className="fill-sky-500 stroke-white" strokeWidth={0.4} /> : null;
        })}
        {parcels.map((p) => {
          const [x, y] = xy(p.lat, p.lng);
          return inView(x, y) ? (
            <circle key={p.id} cx={x} cy={y} r={1.9} className={p.level === "late" ? "fill-brand-red stroke-white" : "fill-amber-400 stroke-white"} strokeWidth={0.4}>
              <title>{p.waybill}</title>
            </circle>
          ) : null;
        })}
      </svg>
      <figcaption className="text-muted-foreground flex flex-wrap gap-4 border-t px-4 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sky-500" /> {legend.courier}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-400" /> {legend.risk}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-brand-red size-2.5 rounded-full" /> {legend.late}
        </span>
      </figcaption>
    </figure>
  );
}
