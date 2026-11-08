"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { reviewAccessAction } from "@/app/actions/admin";
import { ConfirmNote } from "./confirm-note";

export function AccessReviewButtons({ userId, name, roles, days }: { userId: string; name: string; roles: string; days: number }) {
  const { dict: t } = useI18n();
  const a = t.admin.access;
  const go = (decision: "keep" | "revoke") => async (note: string) => {
    const r = await reviewAccessAction(userId, decision, note);
    if (r.ok) toast.success(decision === "keep" ? a.kept : a.revoked);
    else toast.error(r.error);
    return r.ok;
  };
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ConfirmNote
        trigger={<Button size="sm" variant="outline">{a.keep}</Button>}
        title={fmt(a.keepTitle, { name })}
        body={fmt(a.keepBody, { days })}
        noteLabel={a.note}
        confirmLabel={a.keep}
        onConfirm={go("keep")}
      />
      <ConfirmNote
        trigger={<Button size="sm" variant="outline" className="text-destructive">{a.revoke}</Button>}
        title={fmt(a.revokeTitle, { name })}
        body={fmt(a.revokeBody, { roles })}
        noteLabel={a.note}
        confirmLabel={a.revoke}
        destructive
        onConfirm={go("revoke")}
      />
    </div>
  );
}
