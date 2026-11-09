"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudOff, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

/** A page that failed to load: "Can't connect" when the browser is offline, otherwise what went wrong and a retry. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict, locale } = useI18n();
  const s = dict.stateViews;
  const [offline, setOffline] = useState(false);
  useEffect(() => setOffline(!navigator.onLine), []);
  return (
    <main className="bg-background grid min-h-[70dvh] place-items-center px-4">
      <EmptyState
        tone="neutral"
        icon={offline ? CloudOff : TriangleAlert}
        title={offline ? s.cantConnect : s.failed}
        body={
          <>
            {offline ? s.cantConnectBody : s.failedBody}
            {!offline && error.digest && <span className="mt-2 block font-mono text-xs">{error.digest}</span>}
          </>
        }
        action={
          <>
            <Button onClick={reset}>{s.tryAgain}</Button>
            <Button variant="outline" asChild>
              <Link href={`/${locale}`}>{s.goHome}</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
