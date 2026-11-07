"use client";
import { useState, useTransition } from "react";
import { Landmark, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/shell/page-header";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { paymentSettingsAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Payout = Record<string, string> | null;
type Initial = { momo: { enabled: boolean; payout: Payout; schedule: string }; payOnDelivery: boolean };

/** "+255745763000" → "0745763000", for typing. */
const local = (p?: string) => (p?.startsWith("+255") ? `0${p.slice(4)}` : (p ?? ""));

/**
 * The payments set-up, as in the app (More → Payments): mobile money at the counter with where the takings are paid
 * out (a mobile money number or a bank account) and how often, and pay on delivery. Only whoever manages the float
 * changes it; everyone else sees it read-only, with why.
 */
export function PaymentSettingsForm({ initial, canManage, blockedBy, pct }: { initial: Initial; canManage: boolean; blockedBy: string | null; pct: string }) {
  const { dict: t } = useI18n();
  const m = t.agent.money;
  const p = initial.momo.payout;
  const [enabled, setEnabled] = useState(initial.momo.enabled);
  const [method, setMethod] = useState<"mobile_money" | "bank">(p?.method === "bank" ? "bank" : "mobile_money");
  const [f, setF] = useState({
    phone: local(p?.phone),
    name: p?.name ?? "",
    bank: p?.bank ?? "",
    accountName: p?.accountName ?? "",
    accountNumber: p?.accountNumber ?? "",
    branch: p?.branch ?? "",
  });
  const [schedule, setSchedule] = useState(initial.momo.schedule);
  const [pod, setPod] = useState(initial.payOnDelivery);
  const [pending, start] = useTransition();
  const ro = !canManage;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  // The payout is sent when any of it is filled in (it's required to switch mobile money on).
  const filled = method === "mobile_money" ? f.phone.trim() || f.name.trim() : f.bank.trim() || f.accountName.trim() || f.accountNumber.trim();

  const save = () =>
    start(async () => {
      const payout = !filled
        ? undefined
        : method === "mobile_money"
          ? { method, phone: f.phone.trim(), name: f.name.trim() }
          : { method, bank: f.bank.trim(), accountName: f.accountName.trim(), accountNumber: f.accountNumber.trim(), branch: f.branch.trim() || undefined };
      const r = await paymentSettingsAction({ momo: { enabled, payout, schedule }, payOnDelivery: pod });
      if (!r.ok) return void toast.error(r.error);
      toast.success(m.saved);
    });

  const toggle = (on: boolean, onChange: (v: boolean) => void, label: string) => (
    <label className={cn("flex items-center gap-3 text-sm font-medium", ro ? "opacity-70" : "cursor-pointer")}>
      <input type="checkbox" checked={on} disabled={ro} onChange={(e) => onChange(e.target.checked)} className="accent-primary size-4" />
      {label}
    </label>
  );

  return (
    <div className="max-w-3xl space-y-6">
      {ro && blockedBy && (
        <p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0" /> {m.blocked[blockedBy] ?? blockedBy}
        </p>
      )}
      <Panel title={m.momoTitle} description={fmt(m.momoBody, { pct })}>
        <div className="space-y-5 p-4">
          {toggle(enabled, setEnabled, m.momoOn)}
          <div className="space-y-2">
            <Label>{m.payoutTo}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["mobile_money", m.payoutMomo, Smartphone],
                  ["bank", m.payoutBank, Landmark],
                ] as const
              ).map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  disabled={ro}
                  onClick={() => setMethod(k)}
                  className={cn("flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-70", method === k ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
                >
                  <Icon className="size-5" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          {method === "mobile_money" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="pay-phone" label={m.payoutPhone} value={f.phone} onChange={set("phone")} disabled={ro} inputMode="tel" placeholder="07XX XXX XXX" />
              <Field id="pay-name" label={m.payoutName} value={f.name} onChange={set("name")} disabled={ro} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="pay-bank" label={m.bank} value={f.bank} onChange={set("bank")} disabled={ro} />
              <Field id="pay-acname" label={m.accountName} value={f.accountName} onChange={set("accountName")} disabled={ro} />
              <Field id="pay-acno" label={m.accountNumber} value={f.accountNumber} onChange={set("accountNumber")} disabled={ro} inputMode="numeric" />
              <Field id="pay-branch" label={m.bankBranch} value={f.branch} onChange={set("branch")} disabled={ro} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{m.schedule}</Label>
            <div className="flex flex-wrap gap-2">
              {(["instant", "daily", "weekly"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={ro}
                  onClick={() => setSchedule(k)}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-70", schedule === k ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
                >
                  {m.schedules[k]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
      <Panel title={m.podTitle} description={m.podBody}>
        <div className="p-4">{toggle(pod, setPod, m.podOn)}</div>
      </Panel>
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {m.save}
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...rest} />
    </div>
  );
}
