import { getDict } from "@/i18n";

/**
 * "Where to find it": three small previews (SMS, parcel label, shop receipt) with the waybill highlighted,
 * so people recognise exactly what to look for. Uses theme tokens so it sits in light or dark pages.
 */
export function WhereToFind({ locale, example }: { locale: string; example: string }) {
  const t = getDict(locale);
  const [sms, label, shop] = t.track.whereList;
  const L = (en: string, sw: string, fr: string) => (locale === "sw" ? sw : locale === "fr" ? fr : en);
  const wb = <span className="text-parcel font-semibold">{example}</span>;
  const preview = "bg-background overflow-hidden rounded-lg border px-3 py-2.5";

  return (
    <ul className="space-y-4">
      <li>
        <div className={preview} aria-hidden>
          <div className="text-muted-foreground mb-1.5 flex justify-between font-mono text-[9.5px] tracking-wider uppercase">
            <span>TUMA</span>
            <span>SMS</span>
          </div>
          <div className="bg-muted inline-block rounded-lg rounded-tl-sm px-2.5 py-1.5 text-[11px] leading-snug">
            {L("Parcel", "Kifurushi", "Colis")} <span className="font-mono">{wb}</span> {L("is out for delivery.", "kinaletwa leo.", "est en cours de livraison.")}
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[12.5px]">{sms}</p>
      </li>
      <li>
        <div className={preview} aria-hidden>
          <div className="rounded-sm bg-white px-2 py-1.5 text-black ring-1 ring-black/10">
            <div className="flex h-5 items-end gap-[1.5px]">
              {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 2].map((w, i) => (
                <span key={i} className="h-full bg-black" style={{ width: w }} />
              ))}
            </div>
            <div className="mt-1 font-mono text-[10px] font-semibold">
              <span className="rounded-[2px] bg-[#ff4545] px-0.5">{example}</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[12.5px]">{label}</p>
      </li>
      <li>
        <div className={preview} aria-hidden>
          <div className="space-y-1 font-mono text-[10px] leading-none">
            <div className="text-muted-foreground flex justify-between">
              <span>{L("ORDER", "ODA", "COMMANDE")}</span>
              <span>KM-10432</span>
            </div>
            <div className="flex justify-between gap-2 border-t border-dashed pt-1">
              <span className="text-muted-foreground">{L("WAYBILL", "WAYBILL", "BORDEREAU")}</span>
              {wb}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[12.5px]">{shop}</p>
      </li>
    </ul>
  );
}
