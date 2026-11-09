"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Coins, Hand, KeyRound, PackageCheck, Printer, ReceiptText, Scale, Smartphone, TriangleAlert, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { agentCancelAction, agentMoveAction, agentPayAction, agentPayStatusAction, agentPriceAction, agentSendCodeAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Reason = { code: string; label: string };

export type ParcelActionsProps = {
  waybill: string;
  moves: string[];
  needsPrice: boolean;
  awaitingPayment: boolean;
  /** The payer's phone, to prefill a mobile-money prompt. */
  payerPhone: string | null;
  receiverName: string;
  /** What the receiver pays at handover (goods and fee), and how they may pay. */
  due: { total: number; collected: boolean; methods: string[] };
  failReasons: Reason[];
  canCancel: boolean;
  cancelReasons: Reason[];
  canPrint: boolean;
};

const selectCls = "bg-background h-9 w-full rounded-md border px-2 text-sm";
const tzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
const digits = (v: string) => Number(v.replace(/\D/g, "")) || 0;

/** The parcel's next steps at the counter, as the app has them, from what the server says this person may do. */
export function AgentParcelActions(p: ParcelActionsProps) {
  const { dict: t, locale } = useI18n();
  const a = t.agent;
  const [pending, start] = useTransition();
  const router = useRouter();
  const simple = p.moves.filter((m) => m !== "DELIVERED" && m !== "ATTEMPT_FAILED");
  const icon = { RECEIVED: PackageCheck, READY_FOR_COLLECTION: Check, IN_TRANSIT: Truck, OUT_FOR_DELIVERY: Truck } as Record<string, typeof Check>;
  const nothing = !p.needsPrice && !p.awaitingPayment && p.moves.length === 0 && !p.canCancel;

  const move = (to: string) =>
    start(async () => {
      const r = await agentMoveAction(p.waybill, { to });
      if (r.ok) {
        toast.success(fmt(a.move.done, { state: t.states[to] ?? to }));
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-3">
      {nothing && <p className="text-muted-foreground text-sm">{a.parcel.noActions}</p>}
      <div className="flex flex-wrap gap-2">
        {p.needsPrice && <PriceDialog {...p} />}
        {!p.needsPrice && p.awaitingPayment && <PayDialog waybill={p.waybill} payerPhone={p.payerPhone} />}
        {simple.map((m, i) => {
          const Icon = icon[m] ?? Check;
          return (
            <Button key={m} variant={i === 0 && !p.needsPrice && !p.awaitingPayment ? "default" : "outline"} disabled={pending} onClick={() => move(m)}>
              <Icon /> {a.move[m] ?? m}
            </Button>
          );
        })}
        {p.moves.includes("DELIVERED") && <HandoverDialog {...p} />}
        {p.moves.includes("ATTEMPT_FAILED") && <FailDialog waybill={p.waybill} reasons={p.failReasons} />}
        {p.canPrint && (
          <Button asChild variant="outline">
            <a href={`/api/labels/${p.waybill}?format=label`} target="_blank" rel="noopener">
              <Printer /> {a.parcel.printLabel}
            </a>
          </Button>
        )}
        {p.canPrint && (
          <Button asChild variant="outline">
            <a href={`/api/receipts/${p.waybill}?lang=${locale}`} target="_blank" rel="noopener">
              <ReceiptText /> {t.receiptPdf.download}
            </a>
          </Button>
        )}
        {p.canCancel && <CancelDialog waybill={p.waybill} reasons={p.cancelReasons} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- payments */

/** Mobile money: send the prompt, then ask every 3s until it's paid or failed (up to two minutes). */
function useMomo(waybill: string, onPaid: () => void) {
  const { dict: t } = useI18n();
  const [waiting, setWaiting] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const poll = (id: string, phone: string, tries = 0) => {
    setWaiting(phone);
    timer.current = setTimeout(async () => {
      const r = await agentPayStatusAction(waybill, id);
      if (!r.ok) {
        setWaiting(null);
        return toast.error(r.error);
      }
      if (r.data.status === "paid") {
        setWaiting(null);
        toast.success(t.agent.pay.paid);
        return onPaid();
      }
      if (r.data.status === "failed") {
        setWaiting(null);
        return toast.error(fmt(t.agent.pay.failed, { reason: r.data.failureMessage ?? "—" }));
      }
      if (tries < 40) poll(id, phone, tries + 1);
      else setWaiting(null);
    }, 3000);
  };
  return { waiting, poll };
}

function MethodPicker({ value, onChange }: { value: "cash" | "mobile_money"; onChange: (v: "cash" | "mobile_money") => void }) {
  const { dict: t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ["cash", t.agent.pay.cash, Coins],
          ["mobile_money", t.agent.pay.momo, Smartphone],
        ] as const
      ).map(([k, label, Icon]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={cn("flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium", value === k ? "border-brand-red bg-brand-red/5" : "hover:bg-muted")}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}

function PriceDialog(p: ParcelActionsProps) {
  const { dict: t } = useI18n();
  const a = t.agent;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [method, setMethod] = useState<"cash" | "mobile_money">("cash");
  const [phone, setPhone] = useState(p.payerPhone ?? "");
  const [pending, start] = useTransition();
  const done = () => {
    setOpen(false);
    router.refresh();
  };
  const { waiting, poll } = useMomo(p.waybill, done);
  const submit = () =>
    start(async () => {
      const w = Number(weight.replace(",", "."));
      const r = await agentPriceAction(p.waybill, { price: digits(price), ...(w > 0 ? { weightKg: w } : {}) });
      if (!r.ok) return void toast.error(r.error);
      if (!r.data?.awaitingPayment) {
        toast.success(fmt(a.move.done, { state: t.states[r.data?.state ?? "RECEIVED"] }));
        return done();
      }
      const pay = await agentPayAction(p.waybill, method === "cash" ? { method: "cash" } : { method: "mobile_money", phone });
      if (!pay.ok) return void toast.error(pay.error);
      if (method === "cash") {
        toast.success(a.pay.cashTaken);
        return done();
      }
      if (pay.data?.payment?.status === "failed") return void toast.error(fmt(a.pay.failed, { reason: pay.data.payment.failureMessage ?? "—" }));
      if (pay.data?.payment) poll(pay.data.payment.id, phone);
    });
  return (
    <Dialog open={open} onOpenChange={(o) => !waiting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button>
          <Scale /> {a.price.title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.price.title}</DialogTitle>
          <DialogDescription>{a.price.body}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="price">{a.price.price}</Label>
              <Input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(digits(e.target.value) ? digits(e.target.value).toLocaleString("en-US") : "")} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="weight">{a.price.weight}</Label>
              <Input id="weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t.common.optional} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{a.price.method}</Label>
            <MethodPicker value={method} onChange={setMethod} />
          </div>
          {method === "mobile_money" && (
            <div className="grid gap-1.5">
              <Label htmlFor="payer">{a.pay.phone}</Label>
              <Input id="payer" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0745 000 000" />
            </div>
          )}
          {waiting && <p className="text-muted-foreground text-sm">{fmt(a.pay.waiting, { phone: waiting })}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !!waiting || digits(price) < 1 || (method === "mobile_money" && phone.replace(/\D/g, "").length < 9)} onClick={submit}>
            {pending || waiting ? t.common.saving : a.price.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ waybill, payerPhone }: { waybill: string; payerPhone: string | null }) {
  const { dict: t } = useI18n();
  const a = t.agent;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "mobile_money">("mobile_money");
  const [phone, setPhone] = useState(payerPhone ?? "");
  const [pending, start] = useTransition();
  const done = () => {
    setOpen(false);
    router.refresh();
  };
  const { waiting, poll } = useMomo(waybill, done);
  const submit = () =>
    start(async () => {
      const r = await agentPayAction(waybill, method === "cash" ? { method: "cash" } : { method: "mobile_money", phone });
      if (!r.ok) return void toast.error(r.error);
      if (method === "cash") {
        toast.success(a.pay.cashTaken);
        return done();
      }
      if (r.data?.payment?.status === "failed") return void toast.error(fmt(a.pay.failed, { reason: r.data.payment.failureMessage ?? "—" }));
      if (r.data?.payment) poll(r.data.payment.id, phone);
    });
  return (
    <Dialog open={open} onOpenChange={(o) => !waiting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button>
          <Coins /> {a.pay.title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.pay.title}</DialogTitle>
          <DialogDescription>{a.parcel.awaitingPayment}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <MethodPicker value={method} onChange={setMethod} />
          {method === "mobile_money" && (
            <div className="grid gap-1.5">
              <Label htmlFor="pay-phone">{a.pay.phone}</Label>
              <Input id="pay-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0745 000 000" />
            </div>
          )}
          {waiting && <p className="text-muted-foreground text-sm">{fmt(a.pay.waiting, { phone: waiting })}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !!waiting || (method === "mobile_money" && phone.replace(/\D/g, "").length < 9)} onClick={submit}>
            {method === "cash" ? a.pay.cashTaken : a.pay.request}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------- handover */

function HandoverDialog(p: ParcelActionsProps) {
  const { dict: t } = useI18n();
  const a = t.agent;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(p.receiverName);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ phone: string; dev?: string } | null>(null);
  const owes = p.due.total > 0 && !p.due.collected;
  const [method, setMethod] = useState<"cash" | "mobile_money">("cash");
  const [pending, start] = useTransition();
  const sendCode = () =>
    start(async () => {
      const r = await agentSendCodeAction(p.waybill);
      if (!r.ok) return void toast.error(r.error);
      setSent({ phone: r.data!.maskedPhone, dev: r.data!.devCode });
      toast.success(fmt(a.handover.sent, { phone: r.data!.maskedPhone }));
    });
  const submit = () =>
    start(async () => {
      const r = await agentMoveAction(p.waybill, { to: "DELIVERED", receiverName: name.trim(), code: code.trim(), ...(owes ? { collectMethod: method } : {}) });
      if (!r.ok) return void toast.error(r.error);
      toast.success(fmt(a.move.done, { state: t.states.DELIVERED }));
      setOpen(false);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={p.moves[0] === "DELIVERED" ? "default" : "outline"}>
          <Hand /> {a.move.DELIVERED}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.handover.title}</DialogTitle>
          <DialogDescription>{a.handover.body}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {owes && (
            <div className="border-warn/40 bg-warn/10 grid gap-2 rounded-md border p-3">
              <p className="text-sm font-semibold">{fmt(a.handover.due, { amount: tzs(p.due.total) })}</p>
              <MethodPicker value={method} onChange={setMethod} />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="taker">{a.handover.receiverName}</Label>
            <Input id="taker" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="code">{a.handover.code}</Label>
            <div className="flex gap-2">
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} className="font-mono tracking-[0.3em]" />
              <Button type="button" variant="outline" disabled={pending} onClick={sendCode}>
                <KeyRound /> {sent ? a.handover.resend : a.handover.sendCode}
              </Button>
            </div>
            {sent && (
              <p className="text-muted-foreground text-xs">
                {fmt(a.handover.sent, { phone: sent.phone })}
                {sent.dev && ` · ${fmt(a.handover.devCode, { code: sent.dev })}`}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending || name.trim().length < 2 || code.length < 4} onClick={submit}>
            <Hand /> {a.handover.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FailDialog({ waybill, reasons }: { waybill: string; reasons: Reason[] }) {
  const { dict: t } = useI18n();
  const a = t.agent;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await agentMoveAction(waybill, { to: "ATTEMPT_FAILED", reasonCode: reason, note: note.trim() || undefined });
      if (!r.ok) return void toast.error(r.error);
      toast.success(fmt(a.move.done, { state: t.states.ATTEMPT_FAILED }));
      setOpen(false);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <TriangleAlert /> {a.move.ATTEMPT_FAILED}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.fail.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="fail-reason">{a.fail.reason}</Label>
            <select id="fail-reason" className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">{a.choose}</option>
              {reasons.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fail-note">{a.fail.note}</Label>
            <Textarea id="fail-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending || !reason} onClick={submit}>
            {a.fail.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ waybill, reasons }: { waybill: string; reasons: Reason[] }) {
  const { dict: t } = useI18n();
  const a = t.agent;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await agentCancelAction(waybill, { reasonCode: reason, note: note.trim() || undefined });
      if (!r.ok) return void toast.error(r.error);
      const d = r.data!;
      toast.success(d.refundedToWallet ? fmt(a.cancel.wallet, { amount: tzs(d.refundedToWallet) }) : d.refundDue ? fmt(a.cancel.refund, { amount: tzs(d.refundDue) }) : t.states.CANCELLED, {
        duration: d.refundDue ? 12000 : 4000,
      });
      setOpen(false);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Ban /> {a.cancel.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.cancel.title}</DialogTitle>
          <DialogDescription>{a.cancel.body}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cancel-reason">{a.cancel.reason}</Label>
            <select id="cancel-reason" className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">{a.choose}</option>
              {reasons.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cancel-note">{a.cancel.note}</Label>
            <Textarea id="cancel-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {a.close}
          </Button>
          <Button variant="destructive" disabled={pending || !reason} onClick={submit}>
            {a.cancel.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
