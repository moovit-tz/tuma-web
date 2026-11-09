"use client";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function NotFound() {
  const { dict, locale } = useI18n();
  const s = dict.stateViews;
  return (
    <main className="bg-background grid min-h-[70dvh] place-items-center px-4">
      <EmptyState
        tone="neutral"
        icon={MapPinOff}
        title={s.notFound}
        body={s.notFoundBody}
        action={
          <Button asChild>
            <Link href={`/${locale}`}>{s.goHome}</Link>
          </Button>
        }
      />
    </main>
  );
}
