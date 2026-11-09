"use client";
import { useState, useTransition } from "react";
import { FileText, ReceiptText, Printer, XCircle, PencilLine, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { cancelAction, raiseExceptionAction, resolveExceptionAction, transitionAction, updateConsigneeAction, type ActionResult } from "@/app/actions/shipments";

function useAction() {
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<ActionResult<unknown>>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (ok) toast.success(ok);
        after?.();
      } else toast.error(r.error);
    });
  return { pending, exec };
}

export function MerchantActions({
  waybill,
  canPrint,
  canCancel,
  cancelFree,
  canEdit,
  consignee,
}: {
  waybill: string;
  canPrint: boolean;
  canCancel: boolean;
  cancelFree: boolean;
  canEdit: boolean;
  consignee: { name: string; phone: string; landmark: string; instructions: string };
}) {
  const { dict: t, locale } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {canPrint && (
        <>
          <Button asChild>
            <a href={`/api/labels/${waybill}?format=label`} target="_blank" rel="noopener">
              <Printer /> {t.detail.printLabel}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/labels/${waybill}?format=a4`} target="_blank" rel="noopener">
              <FileText /> {t.detail.printWaybill}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/receipts/${waybill}?lang=${locale}`} target="_blank" rel="noopener">
              <ReceiptText /> {t.receiptPdf.download}
            </a>
          </Button>
        </>
      )}
      {canEdit && <EditReceiver waybill={waybill} consignee={consignee} />}
      {canCancel && <CancelShipment waybill={waybill} free={cancelFree} />}
    </div>
  );
}

function CancelShipment({ waybill, free }: { waybill: string; free: boolean }) {
  const { dict: t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <XCircle /> {t.detail.cancelShipment}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.detail.cancelConfirm}</DialogTitle>
          <DialogDescription>{free ? t.detail.cancelFree : t.detail.cancelFee}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="cancel-reason">{t.detail.cancelReason}</Label>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.back}
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => exec(() => cancelAction(waybill, reason), t.states.CANCELLED, () => setOpen(false))}>
            {t.detail.cancelShipment}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditReceiver({ waybill, consignee }: { waybill: string; consignee: { name: string; phone: string; landmark: string; instructions: string } }) {
  const { dict: t } = useI18n();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(consignee);
  const { pending, exec } = useAction();
  const field = (k: keyof typeof v, label: string, multiline = false) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`edit-${k}`}>{label}</Label>
      {multiline ? (
        <Textarea id={`edit-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
      ) : (
        <Input id={`edit-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
      )}
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilLine /> {t.detail.editReceiver}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.detail.editReceiver}</DialogTitle>
          <DialogDescription>FR-WB-06</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {field("name", t.form.name)}
          {field("phone", t.form.phone)}
          {field("landmark", t.form.landmark)}
          {field("instructions", t.form.instructions, true)}
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={() => exec(() => updateConsigneeAction(waybill, v), t.common.save, () => setOpen(false))}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Reason = { code: string; label: string; kind: string };

const selectCls = "bg-background h-9 w-full rounded-md border px-2 text-sm";

export function StaffActions({
  waybill,
  nextStates,
  reasonCodes,
  canSimulate,
  canException,
  collectMethods = [],
}: {
  waybill: string;
  nextStates: string[];
  reasonCodes: Reason[];
  canSimulate: boolean;
  canException: boolean;
  collectMethods?: string[];
}) {
  const { dict: t } = useI18n();
  const [to, setTo] = useState(nextStates[0] ?? "");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [simulate, setSimulate] = useState(canSimulate);
  const [collectMethod, setCollectMethod] = useState(collectMethods[0] ?? "cash");
  const [exReason, setExReason] = useState("");
  const [exNote, setExNote] = useState("");
  const { pending, exec } = useAction();
  const needsReason = to === "ATTEMPT_FAILED" || (!simulate && to !== "DELIVERED");
  const reasonsFor = to === "ATTEMPT_FAILED" ? reasonCodes.filter((r) => r.kind === "failed_delivery") : reasonCodes.filter((r) => r.kind !== "failed_delivery");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {nextStates.length > 0 && (
        <section className="bg-card rounded-lg border p-4">
          <h2 className="text-[15px] font-semibold">{t.detail.changeStatus}</h2>
          {canSimulate && (
            <label className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} />
              {t.detail.simulate} — {t.detail.simulateHint}
            </label>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select aria-label={t.detail.changeStatus} className={selectCls} value={to} onChange={(e) => setTo(e.target.value)}>
              {nextStates.map((s) => (
                <option key={s} value={s}>
                  {t.states[s]}
                </option>
              ))}
            </select>
            <select aria-label={t.detail.reasonCode} className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">
                {t.detail.reasonCode} {needsReason ? "*" : `(${t.common.optional})`}
              </option>
              {reasonsFor.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.label}
                </option>
              ))}
            </select>
          </div>
          {to === "DELIVERED" && collectMethods.length > 0 && (
            <select aria-label={t.pay.collectedWith} className={selectCls + " mt-2"} value={collectMethod} onChange={(e) => setCollectMethod(e.target.value)}>
              {collectMethods.map((m) => (
                <option key={m} value={m}>
                  {t.pay.collectedWith}: {t.pay.methods[m]}
                </option>
              ))}
            </select>
          )}
          <Input className="mt-2" placeholder={t.detail.note} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            className="mt-3"
            disabled={pending || !to || (needsReason && !reason)}
            onClick={() => exec(() => transitionAction({ waybill, to, reasonCode: reason, note, simulate, collectMethod: to === "DELIVERED" && collectMethods.length ? (collectMethod as "cash" | "mobile_money" | "card") : undefined }), t.states[to], () => {
              setReason("");
              setNote("");
            })}
          >
            <Check /> {t.detail.apply}
          </Button>
        </section>
      )}
      {canException && (
        <section className="bg-card rounded-lg border p-4">
          <h2 className="text-[15px] font-semibold">{t.detail.raiseException}</h2>
          <div className="mt-3 grid gap-2">
            <select aria-label={t.detail.reasonCode} className={selectCls} value={exReason} onChange={(e) => setExReason(e.target.value)}>
              <option value="">{t.detail.reasonCode}</option>
              {reasonCodes.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} · {r.label}
                </option>
              ))}
            </select>
            <Input placeholder={t.detail.note} value={exNote} onChange={(e) => setExNote(e.target.value)} />
          </div>
          <Button
            variant="outline"
            className="mt-3"
            disabled={pending || !exReason}
            onClick={() => exec(() => raiseExceptionAction(waybill, exReason, exNote), t.detail.raiseException, () => {
              setExReason("");
              setExNote("");
            })}
          >
            {t.detail.raiseException}
          </Button>
        </section>
      )}
    </div>
  );
}

export function ResolveException({ id }: { id: string }) {
  const { dict: t } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t.detail.resolve}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.detail.resolve}</DialogTitle>
        </DialogHeader>
        <Label htmlFor="resolution">{t.detail.resolution}</Label>
        <Textarea id="resolution" value={text} onChange={(e) => setText(e.target.value)} />
        <DialogFooter>
          <Button disabled={pending || !text.trim()} onClick={() => exec(() => resolveExceptionAction(id, text), t.detail.resolve, () => setOpen(false))}>
            {t.detail.resolve}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
