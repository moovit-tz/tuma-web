"use client";
import { useTransition } from "react";
import { Ban, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { setDriverStatusAction } from "@/app/actions/dispatch";

/** Approve a pending driver, suspend an approved one, restore a suspended one. */
export function DriverStatusButton({ id, status }: { id: string; status: string }) {
  const { dict } = useI18n();
  const d = dict.drivers;
  const [pending, start] = useTransition();
  const to = status === "approved" ? "suspended" : "approved";
  const label = status === "pending" ? d.approve : status === "approved" ? d.suspend : d.restore;
  const Icon = status === "pending" ? Check : status === "approved" ? Ban : RotateCcw;
  return (
    <Button
      size="sm"
      variant={status === "pending" ? "default" : "ghost"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setDriverStatusAction(id, to);
          if (r.ok) toast.success(to === "approved" ? d.approved : d.suspended);
          else toast.error(r.error);
        })
      }
    >
      <Icon /> {label}
    </Button>
  );
}
