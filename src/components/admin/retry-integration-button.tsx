"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { retryIntegrationAction } from "@/app/actions/admin";

/** Puts an integration's failed messages from the last day back in the queue. */
export function RetryIntegrationButton({ integration }: { integration: string }) {
  const { dict: t } = useI18n();
  const g = t.admin.integrations;
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryIntegrationAction(integration);
          if (!r.ok) return void toast.error(r.error);
          toast.success(fmt(g.retried, { n: r.data?.requeued ?? 0 }));
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} /> {g.retry}
    </Button>
  );
}
