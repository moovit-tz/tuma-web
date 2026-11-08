"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { recheckPaymentAction } from "@/app/actions/admin";

export function RecheckButton({ source, reference }: { source: "momo" | "topup"; reference: string }) {
  const { dict: t } = useI18n();
  const f = t.admin.finance;
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await recheckPaymentAction(source, reference);
          if (!r.ok) return void toast.error(r.error);
          const st = r.data?.status;
          if (st === "paid") toast.success(f.nowPaid);
          else if (st === "failed") toast.warning(f.nowFailed);
          else toast.info(f.stillPending);
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} /> {f.recheck}
    </Button>
  );
}
