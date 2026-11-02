import { AppLocale } from "@/domain/types";
import { COUNTRIES, type Country } from "@/domain/countries";
import { CORRIDOR_GEO, MAP_H, MAP_W, REGION_GEO, ROAD_GEO } from "./region-geo";

/**
 * SADC + EAC map. The static base layer (public/maps/region-base.svg) is drawn as an <image> inside the
 * same viewBox as the live overlay, so they always line up. The overlay highlights the visitor's country,
 * lights the corridors that touch it and marks its cities. Every member country carries data-iso so a
 * client wrapper (MapHover) can show details on hover or keyboard focus.
 */
export function RegionMap({
  selected,
  locale,
  className,
  decorative = false,
  corridors = "selected",
  labels,
  simulate = false,
  preserve = "xMidYMid meet",
}: {
  selected: Country;
  locale: AppLocale;
  className?: string;
  /** Background use: no hover targets or labels, hidden from assistive tech. */
  decorative?: boolean;
  /** "all" animates every trade corridor (backdrops); "selected" only those touching the selected country. */
  corridors?: "selected" | "all";
  /** Name the major corridors along their routes. Defaults to on when every corridor is shown. */
  labels?: boolean;
  /** Draw the road network and animate trucks and parcel vans along corridors and roads (hero only). */
  simulate?: boolean;
  preserve?: string;
}) {
  const g = REGION_GEO[selected.iso2];
  const [, mx, my] = g.cities[0];
  const lit = CORRIDOR_GEO.filter((k) => k.countries.includes(selected.iso2));
  const showLabels = labels ?? corridors === "all";
  const named = showLabels ? CORRIDOR_GEO.filter((k) => k.label) : [];
  const others = corridors === "all" ? CORRIDOR_GEO.filter((k) => !k.countries.includes(selected.iso2)) : [];
  // Corridor stops across the region, drawn as small nodes when every corridor is shown.
  const nodes =
    corridors === "all"
      ? [...new Map(COUNTRIES.flatMap((c) => REGION_GEO[c.iso2].cities.map(([n, x, y]) => [`${c.iso2}:${n}`, [x, y]] as const))).values()]
      : [];

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio={preserve}
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `Map of SADC and EAC member states, ${selected.name[locale]} selected` })}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <style>{`
        .rm-hit{fill:transparent;stroke:transparent;transition:fill .15s,stroke .15s;outline:none}
        .rm-hit:hover,.rm-hit:focus-visible,.rm-hit[data-active]{fill:rgba(165,155,135,.18);stroke:#f2f0ea;stroke-opacity:.7;stroke-width:1.2}
        .rm-sel{fill:rgba(255,69,69,.16);stroke:#ff4545;stroke-width:1.6;stroke-linejoin:round}
        .rm-cor2{fill:none;stroke:#cfc6b3;stroke-opacity:.85;stroke-width:1.6;stroke-dasharray:5 6;animation:rm-flow 7s linear infinite}
        .rm-glow{fill:none;stroke:#a59b87;stroke-opacity:.18;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
        .rm-glow.lit{stroke:#ff4545;stroke-opacity:.22}
        .rm-lbl{font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;fill:#e8e2d4;paint-order:stroke;stroke:#000;stroke-width:3.5px;stroke-linejoin:round;pointer-events:none}
        .rm-lbl.lit{fill:#ff6b6b}
        .rm-node{fill:#a59b87;fill-opacity:.8}
        .rm-cor{fill:none;stroke:#ff4545;stroke-opacity:.95;stroke-width:2;stroke-dasharray:5 6;animation:rm-flow 5s linear infinite}
        .rm-iso{font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.12em;fill:#a59b87;fill-opacity:.55;pointer-events:none}
        .rm-iso.sel{fill:#ff4545;fill-opacity:1}
        .rm-city{font:500 11.5px ui-monospace,Menlo,monospace;fill:#f2f0ea;fill-opacity:.85;pointer-events:none}
        .rm-ring{fill:none;stroke:#ff4545;stroke-width:1.4;transform-box:fill-box;transform-origin:center;animation:rm-ping 2.6s ease-out infinite}
        .rm-isl{fill:none;stroke:#a59b87;stroke-opacity:.5;stroke-dasharray:2 3}
        .rm-x{stroke:#ff4545;stroke-opacity:.22;stroke-width:.8}
        .rm-road{fill:none;stroke:#a59b87;stroke-opacity:.28;stroke-width:1;stroke-linecap:round}
        .rm-truck .body{fill:#f2f0ea}
        .rm-truck .cab{fill:#a59b87}
        .rm-truck.lit .body{fill:#ff4545}
        .rm-truck.lit .cab{fill:#ffb3b3}
        .rm-van{fill:#cfc6b3}
        .rm-van.lit{fill:#ff6b6b}
        @media (prefers-reduced-motion:reduce){.rm-fleet{display:none}}
        @keyframes rm-flow{to{stroke-dashoffset:-60}}
        @keyframes rm-ping{0%{transform:scale(.5);opacity:.9}100%{transform:scale(3.6);opacity:0}}
        @media (prefers-reduced-motion:reduce){.rm-cor,.rm-ring{animation:none}.rm-ring{opacity:0}}
      `}</style>

      <image href="/maps/region-base.svg" x="0" y="0" width={MAP_W} height={MAP_H} />

      {/* Crosshair on the selected country's main hub */}
      <line className="rm-x" x1={mx} y1={0} x2={mx} y2={MAP_H} />
      <line className="rm-x" x1={0} y1={my} x2={MAP_W} y2={my} />

      {/* Selected country */}
      {g.d && <path className="rm-sel" d={g.d} filter="url(#glow)" />}
      {g.ring && <circle cx={g.cx} cy={g.cy} r={g.ring} className="rm-sel" />}

      {/* Soft underlay so corridors read as routes, not just dashes */}
      {corridors === "all" &&
        CORRIDOR_GEO.map((k) => <path key={`g-${k.name}`} className={"rm-glow" + (k.countries.includes(selected.iso2) ? " lit" : "")} d={k.d} />)}

      {/* Road network (hero) */}
      {simulate && ROAD_GEO.map((road, i) => <path key={`r-${i}`} className="rm-road" d={road.d} />)}

      {/* Every other trade corridor */}
      {others.map((k, i) => (
        <path key={k.name} className="rm-cor2" d={k.d} style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {nodes.map(([x, y], i) => (
        <rect key={i} className="rm-node" x={x - 2.5} y={y - 2.5} width="5" height="5" />
      ))}

      {/* Corridors touching it */}
      {lit.map((k, i) => (
        <path key={k.name} className="rm-cor" d={k.d} style={{ animationDelay: `${i * 0.4}s` }}>
          <title>{k.name}</title>
        </path>
      ))}

      {/* Member states: hover targets and ISO labels */}
      {!decorative && COUNTRIES.map((c) => {
        const cg = REGION_GEO[c.iso2];
        const isSel = c.iso2 === selected.iso2;
        const common = { className: "rm-hit", "data-iso": c.iso2, tabIndex: 0, role: "img", "aria-label": `${c.name[locale]}, ${c.blocs.join(" and ")}` };
        const shape = cg.hit ? <path {...common} d={cg.hit} /> : <circle {...common} cx={cg.cx} cy={cg.cy} r={cg.ring ?? 14} />;
        return (
          <g key={c.iso2}>
            {c.island && !isSel && <circle className="rm-isl" cx={cg.cx} cy={cg.cy} r={cg.ring ?? 14} />}
            {shape}
            {!isSel && (
              <text className="rm-iso" x={cg.cx} y={cg.cy + (c.island ? -(cg.ring ?? 14) - 6 : 4)} textAnchor="middle">
                {c.iso2}
              </text>
            )}
          </g>
        );
      })}

      {/* Cities of the selected country */}
      {g.cities.map(([name, x, y], i) => (
        <g key={name} transform={`translate(${x} ${y})`}>
          {i === 0 && <circle className="rm-ring" r="7" />}
          <circle r={i === 0 ? 5 : 3.5} fill="#ff4545" />
          <text className="rm-city" x={x > MAP_W * 0.7 ? -9 : 9} y={4} textAnchor={x > MAP_W * 0.7 ? "end" : "start"}>
            {name}
          </text>
        </g>
      ))}

      {/* Simulated fleet: trucks on corridors, parcel vans on roads. Speed is constant per route length. */}
      {simulate && (
        <g className="rm-fleet" aria-hidden>
          {CORRIDOR_GEO.flatMap((k, i) =>
            [0, 1].map((dir) => {
              const dur = Math.max(10, k.len / 22); // ~22 map units per second
              const lit = k.countries.includes(selected.iso2);
              return (
                <g key={`t-${i}-${dir}`} className={"rm-truck" + (lit ? " lit" : "")}>
                  <rect className="body" x="-7" y="-2.6" width="10" height="5.2" rx="1" />
                  <rect className="cab" x="3.6" y="-2.3" width="3.6" height="4.6" rx="1" />
                  <animateMotion
                    dur={`${dur.toFixed(1)}s`}
                    begin={`-${(((i * 7 + dir * 13) % 17) / 17 * dur).toFixed(1)}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    path={k.d}
                    {...(dir ? { keyPoints: "1;0", keyTimes: "0;1", calcMode: "linear" } : {})}
                  />
                </g>
              );
            }),
          )}
          {ROAD_GEO.map((road, i) => {
            const dur = Math.max(6, road.len / 30);
            const lit = road.countries.includes(selected.iso2);
            return (
              <rect key={`v-${i}`} className={"rm-van" + (lit ? " lit" : "")} x="-2.4" y="-2.4" width="4.8" height="4.8" rx="1.2">
                <animateMotion
                  dur={`${dur.toFixed(1)}s`}
                  begin={`-${(((i * 5) % 11) / 11 * dur).toFixed(1)}s`}
                  repeatCount="indefinite"
                  path={road.d}
                  keyPoints="0;1;0"
                  keyTimes="0;0.5;1"
                  calcMode="linear"
                />
              </rect>
            );
          })}
        </g>
      )}

      {/* Corridor names */}
      {named.map((k) => (
        <text key={`l-${k.name}`} className={"rm-lbl" + (k.countries.includes(selected.iso2) ? " lit" : "")} x={k.lx} y={k.ly - 6} textAnchor="middle" transform={`rotate(${k.la} ${k.lx} ${k.ly})`}>
          {k.label}
        </text>
      ))}

      <rect width={MAP_W} height={MAP_H} fill="url(#vignette)" pointerEvents="none" />
    </svg>
  );
}
