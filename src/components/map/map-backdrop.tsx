import { AppLocale } from "@/domain/types";
import { getCountry, DEFAULT_COUNTRY } from "@/domain/countries";
import { RegionMap } from "./region-map";
import { cn } from "@/lib/utils";

type Side = "right" | "band";

/**
 * Decorative SADC + EAC trade-corridor map behind a dark section, as on the Terms page:
 * a zoomed crop filling the right side, fading out towards the content on the left.
 *  - right: full-height sections (track, contact, report lost item)
 *  - band:  short header bands (legal pages)
 */
export function MapBackdrop({ locale, country = DEFAULT_COUNTRY, side = "right", className }: { locale: AppLocale; country?: string; side?: Side; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 left-0 overflow-hidden lg:left-auto lg:w-[64%]", className)}>
      <RegionMap
        decorative
        corridors="all"
        selected={getCountry(country)!}
        locale={locale}
        preserve="xMidYMid slice"
        className={cn(
          "absolute inset-0 h-full w-full",
          side === "band"
            ? "opacity-60 [mask-image:linear-gradient(to_right,transparent_5%,black_55%)]"
            : "opacity-35 [mask-image:linear-gradient(to_right,transparent_0%,black_40%)] lg:opacity-75 lg:[mask-image:linear-gradient(to_right,transparent_0%,black_35%)]",
        )}
      />
      {side !== "band" && <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-sidebar to-transparent" />}
    </div>
  );
}
