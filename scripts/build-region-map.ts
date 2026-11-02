/**
 * Builds the SADC + EAC region map from Natural Earth (world-atlas). Run: pnpm map:build
 *
 * Outputs, sharing one projection and viewBox:
 *  - public/maps/region-base.svg      static layer: graticule, neighbours, member states, all corridors, edge labels
 *  - src/components/map/region-geo.ts per-country geometry for the live overlay (highlight, hit areas, cities)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { geoMercator, geoPath, geoGraticule, geoCentroid } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { COUNTRIES, CORRIDORS, ROAD_LINKS } from "../src/domain/countries";

const W = 1000;
const H = 1040;
const PAD = 36;

const load = (file: string) => {
  const topo = JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${file}`, import.meta.url), "utf8")) as Topology;
  return (feature(topo, topo.objects.countries as GeometryCollection) as FeatureCollection).features as Feature<Geometry>[];
};
const hi = load("countries-50m.json");
const lo = load("countries-110m.json");

const memberNums = new Set(COUNTRIES.map((c) => c.num));
const members = hi.filter((f) => memberNums.has(String(f.id)));

// Fit to the region's box, not the raw shapes: South Africa's Prince Edward Islands (47°S) and other
// far-flung territories would otherwise pull the frame away from the mainland.
const BOX: [number, number, number, number] = [11, -35.5, 58.5, 12.5]; // west, south, east, north
const fitTo: FeatureCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: [[BOX[0], BOX[1]], [BOX[2], BOX[3]], [BOX[0], BOX[3]], [BOX[2], BOX[1]]] } }],
};
const projection = geoMercator().fitExtent([[PAD + 24, PAD], [W - PAD, H - PAD - 16]], fitTo);
const path = geoPath(projection).digits(0);
const r1 = (n: number) => Math.round(n * 10) / 10;
const xy = (lon: number, lat: number) => projection([lon, lat])!.map(r1) as [number, number];

const inView = (f: Feature) => {
  const [[a, b], [c, d]] = path.bounds(f);
  return c > 0 && a < W && d > 0 && b < H;
};

/* ---------------------------------------------------------- base layer */
const context = lo.filter((f) => !memberNums.has(String(f.id)) && inView(f));
const grat = path(geoGraticule().step([5, 5])());

const labels: string[] = [];
for (let lat = 15; lat >= -40; lat -= 5) {
  const [, y] = xy(0, lat);
  if (y > 18 && y < H - 30) labels.push(`<text x="10" y="${(y - 4).toFixed(0)}">${String(Math.abs(lat)).padStart(2, "0")}°${lat >= 0 ? "N" : "S"}</text>`);
}
for (let lon = 10; lon <= 60; lon += 5) {
  const [x] = xy(lon, 0);
  if (x > 50 && x < W - 40) labels.push(`<text x="${(x + 4).toFixed(0)}" y="${H - 10}">${String(lon).padStart(3, "0")}°E</text>`);
}

const city = (iso2: string, name: string) => {
  const c = COUNTRIES.find((x) => x.iso2 === iso2)!.cities.find((x) => x.name === name);
  if (!c) throw new Error(`Unknown corridor stop ${iso2}/${name}`);
  return xy(c.lon, c.lat);
};
const corridorGeo = CORRIDORS.map((k) => {
  const pts = k.stops.map(([iso, n]) => city(iso, n));
  // Label on the longest segment, rotated along it and kept upright.
  let best = 0;
  let bestLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (len > bestLen) [best, bestLen] = [i, len];
  }
  const [a, b] = [pts[best], pts[best + 1]];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return {
    name: k.name,
    label: k.label ?? null,
    countries: [...new Set(k.stops.map(([iso]) => iso))],
    d: "M" + pts.map((p) => p.join(",")).join("L"),
    len: Math.round(pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)),
    lx: r1((a[0] + b[0]) / 2),
    ly: r1((a[1] + b[1]) / 2),
    la: Math.round(angle),
  };
});

const base = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<style>
path{stroke-linejoin:round}
.ctx{fill:#0a0a0a;stroke:#1c1c1c;stroke-width:.7}
.m{fill:#1a1814;stroke:#5f5849;stroke-width:.9}
.grat{fill:none;stroke:#a59b87;stroke-opacity:.13;stroke-width:.7;stroke-dasharray:2 5}
.cor{fill:none;stroke:#a59b87;stroke-opacity:.45;stroke-width:1.2;stroke-dasharray:3 6}
text{font:500 11px ui-monospace,Menlo,monospace;fill:#a59b87;fill-opacity:.5;letter-spacing:.06em}
</style>
<path class="grat" d="${grat}"/>
${context.map((f) => `<path class="ctx" d="${path(f)}"/>`).join("")}
${members.map((f) => `<path class="m" d="${path(f)}"/>`).join("")}
${corridorGeo.map((k) => `<path class="cor" d="${k.d}"/>`).join("")}
${labels.join("")}
</svg>`;
mkdirSync(new URL("../public/maps/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/maps/region-base.svg", import.meta.url), base);

/* --------------------------------------------------------- road network */
// Each country's main hub to its other cities, plus regional trunk links between neighbours.
const roadGeo: { d: string; len: number; countries: string[] }[] = [];
const seg = (pts: [number, number][], countries: string[]) =>
  roadGeo.push({
    d: "M" + pts.map((p) => p.join(",")).join("L"),
    len: Math.round(pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)),
    countries,
  });
for (const c of COUNTRIES) {
  const [hub, ...rest] = c.cities;
  for (const other of rest) seg([xy(hub.lon, hub.lat), xy(other.lon, other.lat)], [c.iso2]);
}
for (const link of ROAD_LINKS) seg(link.map(([iso, n]) => city(iso, n)), [...new Set(link.map(([iso]) => iso))]);

/* ------------------------------------------------------- overlay data */
const loByNum = new Map(lo.map((f) => [String(f.id), f]));
const hiByNum = new Map(hi.map((f) => [String(f.id), f]));
const geo: Record<string, { d: string; hit: string | null; cx: number; cy: number; ring: number | null; cities: [string, number, number][] }> = {};
for (const c of COUNTRIES) {
  const fHi = hiByNum.get(c.num);
  const fLo = loByNum.get(c.num);
  const d = fHi ? path(fHi) ?? "" : "";
  const [cx, cy] = fHi ? xy(...(geoCentroid(fHi) as [number, number])) : xy(c.cities[0].lon, c.cities[0].lat);
  geo[c.iso2] = {
    d,
    hit: !c.island && fLo ? path(fLo) : null,
    cx,
    cy,
    ring: c.island ? 16 : null,
    cities: c.cities.map((k) => [k.name, ...xy(k.lon, k.lat)] as [string, number, number]),
  };
}
// Country centroids that sit badly for labels (Mozambique's is in Malawi's lap, etc.) use the main city instead.
for (const iso of ["MZ", "SO", "CD"]) {
  const [, x, y] = geo[iso].cities[0];
  geo[iso].cx = x;
  geo[iso].cy = y;
}

const ts = `/* Generated by scripts/build-region-map.ts — do not edit. Natural Earth via world-atlas. */
export const MAP_W = ${W};
export const MAP_H = ${H};
export const REGION_GEO: Record<string, { d: string; hit: string | null; cx: number; cy: number; ring: number | null; cities: [string, number, number][] }> = ${JSON.stringify(geo)};
export const ROAD_GEO: { d: string; len: number; countries: string[] }[] = ${JSON.stringify(roadGeo)};
export const CORRIDOR_GEO: { name: string; label: string | null; countries: string[]; d: string; len: number; lx: number; ly: number; la: number }[] = ${JSON.stringify(corridorGeo)};
`;
writeFileSync(new URL("../src/components/map/region-geo.ts", import.meta.url), ts);

const kb = (s: string) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
console.log(`region-base.svg ${kb(base)} · region-geo.ts ${kb(ts)} · ${members.length} member shapes`);
