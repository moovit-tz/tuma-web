"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { cancelApprovalAction, decideApprovalAction } from "@/app/actions/admin";
import { ConfirmNote } from "./confirm-note";

export function ApprovalButtons({ id, canDecide, mine, kind, name, change }: { id: string; canDecide: boolean; mine: boolean; kind: string; name: string; change: string }) {
  const { dict: t } = useI18n();
  const a = t.admin.approvals;
  const [pending, start] = useTransition();
  const decide = (approve: boolean) => async (note: string) => {
    const r = await decideApprovalAction(id, approve, note);
    if (r.ok) toast.success(approve ? a.approved : a.rejected);
    else toast.error(r.error);
    return r.ok;
  };
  if (mine)
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cancelApprovalAction(id);
            if (r.ok) toast.success(a.withdrawn);
            else toast.error(r.error);
          })
        }
      >
        {a.withdraw}
      </Button>
    );
  if (!canDecide) return <span className="text-muted-foreground text-xs">{a.cantDecide}</span>;
  const body = fmt(a.confirmBody, { kind, name, change });
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmNote
        trigger={
          <Button size="sm">
            <Check /> {a.approve}
          </Button>
        }
        title={a.confirmApprove}
        body={body}
        noteLabel={a.note}
        confirmLabel={a.approve}
        onConfirm={decide(true)}
      />
      <ConfirmNote
        trigger={
          <Button size="sm" variant="outline">
            <X /> {a.reject}
          </Button>
        }
        title={a.confirmReject}
        body={body}
        noteLabel={a.note}
        confirmLabel={a.reject}
        destructive
        onConfirm={decide(false)}
      />
    </div>
  );
}
