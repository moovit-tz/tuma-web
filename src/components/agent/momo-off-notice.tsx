"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { requestMomoSetupAction } from "@/app/actions/agent";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

/**
 * Mobile money isn't on for the business. Whoever manages payments gets the way to set it up; everyone else can ask
 * them (a push to each of them), and takes cash in the meantime.
 */
export function MomoOffNotice({ canSetUp }: { canSetUp: boolean }) {
  const { dict: t, locale } = useI18n();
  const m = t.agent.momoSetup;
  const [asked, setAsked] = useState(false);
  const [pending, start] = useTransition();
  const ask = () =>
    start(async () => {
      const r = await requestMomoSetupAction();
      if (!r.ok) return void toast.error(r.error);
      setAsked(true);
      toast.success(r.data?.already ? m.alreadyOn : m.asked);
    });
  return (
    <div role="status" className="border-warn/40 bg-warn/10 flex items-start gap-3 rounded-md border p-3 text-sm">
      <Smartphone aria-hidden className="text-warn mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{m.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{canSetUp ? m.bodyAdmin : m.bodyStaff}</p>
        <div className="mt-2">
          {canSetUp ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/portal/money?tab=settings`}>{m.setUp}</Link>
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={pending || asked} onClick={ask}>
              {asked ? m.askedShort : m.ask}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
