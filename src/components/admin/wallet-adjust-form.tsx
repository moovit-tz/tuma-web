"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";
import { walletAdjustmentAction } from "@/app/actions/admin";
import { CustomerSearch, type CustomerHit } from "./customer-search";

export function WalletAdjustForm({ locale }: { locale: string }) {
  const { dict: t } = useI18n();
  const f = t.admin.finance;
  const [who, setWho] = useState<CustomerHit | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [waybill, setWaybill] = useState("");
  const [pending, start] = useTransition();
  const n = Number(amount.replace(/[,\s]/g, ""));
  const valid = !!who && Number.isInteger(n) && n !== 0 && reason.trim().length >= 10;
  return (
    <form
      className="grid gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!who) return;
        start(async () => {
          const r = await walletAdjustmentAction({ userId: who.key.slice(2), amount: n, reason: reason.trim(), waybill: waybill.trim() });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.data?.pending ? t.admin.approvals.sentForApproval : f.adjustApplied);
          setWho(null);
          setAmount("");
          setReason("");
          setWaybill("");
        });
      }}
    >
      <p className="text-muted-foreground text-[13px]">{f.adjustSub}</p>
      <div className="grid gap-1.5">
        <Label>{f.adjustUser}</Label>
        {who ? (
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium">{who.name}</span> <span className="text-muted-foreground">{who.phone}</span>
            </span>
            <button type="button" onClick={() => setWho(null)} aria-label={f.change} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <CustomerSearch locale={locale} usersOnly onPick={setWho} />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="adj-amount">{f.adjustAmount}</Label>
          <Input id="adj-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="-5000 / 5000" />
          <p className="text-muted-foreground text-xs">{f.adjustAmountHint}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-waybill">{f.adjustWaybill}</Label>
          <Input id="adj-waybill" value={waybill} onChange={(e) => setWaybill(e.target.value)} maxLength={20} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="adj-reason">{f.adjustReason}</Label>
        <Textarea id="adj-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={f.adjustReasonHint} />
      </div>
      <Button type="submit" disabled={!valid || pending}>
        {pending ? t.common.saving : f.adjustSend}
      </Button>
    </form>
  );
}
