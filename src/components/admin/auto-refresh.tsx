"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Re-renders the page's server data every `seconds` while the tab is visible, plus a manual refresh button. */
export function AutoRefresh({ seconds = 30, label }: { seconds?: number; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => router.refresh())}>
      <RefreshCw className={pending ? "animate-spin" : undefined} /> {label}
    </Button>
  );
}
