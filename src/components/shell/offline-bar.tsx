"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** The dark bar shown while the browser is offline: when the page was last up to date, not stale data as if live. */
export function OfflineBar() {
  const { dict, locale } = useI18n();
  const [since, setSince] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let last = new Date();
    const sync = () => {
      if (navigator.onLine) {
        last = new Date();
        setOffline(false);
      } else {
        setSince(last);
        setOffline(true);
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  const t = since ? since.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-[#14151a] px-4 py-3 text-sm font-medium text-white shadow-2xl print:hidden">
      <Clock3 aria-hidden className="size-[18px] shrink-0" />
      <span>{t ? dict.stateViews.offlineSince.replace("{t}", t) : dict.stateViews.offline}</span>
    </div>
  );
}
