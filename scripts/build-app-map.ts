/**
 * Exports the web's SADC + EAC map for the Tuma app (tuma_x). Run after `pnpm map:build`: pnpm map:app
 *
 *  - ../tuma_x/assets/maps/region-base.svg  the static layer with its CSS classes inlined (flutter_svg ignores <style>)
 *  - ../tuma_x/assets/maps/region-live.json per-country outline, cities, corridors and roads for the animated layer
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { CORRIDOR_GEO, MAP_H, MAP_W, REGION_GEO, ROAD_GEO } from "../src/components/map/region-geo";

const out = new URL("../../tuma_x/assets/maps/", import.meta.url);
mkdirSync(out, { recursive: true });

let svg = readFileSync(new URL("../public/maps/region-base.svg", import.meta.url), "utf8");
const css = /<style>([\s\S]*?)<\/style>/.exec(svg)?.[1] ?? "";
const rules = new Map<string, string>();
for (const m of css.matchAll(/([.\w]+)\{([^}]*)\}/g)) rules.set(m[1], m[2]);
const attrs = (decl: string) =>
  decl
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [k, v] = d.split(":");
      if (k === "letter-spacing") return "";
      return k === "font" ? `font-family="monospace" font-size="11" font-weight="500"` : `${k}="${v}"`;
    })
    .join(" ");
svg = svg.replace(/<style>[\s\S]*?<\/style>\n?/, "");
svg = svg.replace(/<path class="(\w+)"/g, (_, c) => `<path ${attrs(`${rules.get("path") ?? ""};${rules.get(`.${c}`) ?? ""}`)}`);
svg = svg.replace(/<text /g, `<text ${attrs(rules.get("text") ?? "")} `);
writeFileSync(new URL("region-base.svg", out), svg);

const live = {
  w: MAP_W,
  h: MAP_H,
  countries: Object.fromEntries(Object.entries(REGION_GEO).map(([iso, g]) => [iso, { d: g.d, cx: g.cx, cy: g.cy, cities: g.cities }])),
  corridors: CORRIDOR_GEO.map(({ name, countries, d }) => ({ name, countries, d })),
  roads: ROAD_GEO.map(({ d, countries }) => ({ d, countries })),
};
writeFileSync(new URL("region-live.json", out), JSON.stringify(live));
console.log(`app map: svg ${(svg.length / 1024).toFixed(0)} KB, live ${(JSON.stringify(live).length / 1024).toFixed(0)} KB`);
