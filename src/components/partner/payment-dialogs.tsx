"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { matchCandidatesAction, reconcileAction, recordPaymentAction } from "@/app/actions/partner";
import { dateOnly, money } from "@/lib/format";
import { cn } from "@/lib/utils";

const input = "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 w-full rounded-md border px-3 text-[15px] outline-none";

export function RecordPaymentDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const { dict } = useI18n();
  const p = dict.partner.payments;
  const blank = { clientId: "", amount: "", method: "mobile_money", reference: "", receivedAt: new Date().toISOString().slice(0, 10) };
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setV(blank);
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> {p.record}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{p.record}</DialogTitle>
        </DialogHeader>
        <form
          id="pay-form"
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await recordPaymentAction(v);
              if (!r.ok) {
                setErrors(r.fields ?? {});
                toast.error(r.error);
                return;
              }
              const matched = r.data?.matched;
              if (matched) toast.success(fmt(p.autoMatched, { number: matched }));
              else toast(p.unmatchedNote);
              setOpen(false);
            });
          }}
        >
          <label className="col-span-2 grid gap-1.5">
            <span className="text-sm font-medium">{p.client}</span>
            <select className={input} value={v.clientId} onChange={(e) => setV({ ...v, clientId: e.target.value })}>
              <option value="">{p.unknownClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{p.amount}</span>
            <input className={cn(input, "tabular")} inputMode="numeric" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.amount} required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{p.received}</span>
            <input className={input} type="date" value={v.receivedAt} onChange={(e) => setV({ ...v, receivedAt: e.target.value })} />
          </label>
          <label className="col-span-2 grid gap-1.5">
            <span className="text-sm font-medium">{p.method}</span>
            <select className={input} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })}>
              {Object.entries(p.methods).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 grid gap-1.5">
            <span className="text-sm font-medium">{p.reference}</span>
            <input className={cn(input, "font-mono")} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} />
            <span className="text-muted-foreground text-[12.5px]">{p.referenceHint}</span>
          </label>
          {errors.amount && <p className="text-destructive col-span-2 text-[12.5px]">{errors.amount}</p>}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" form="pay-form" disabled={pending}>
            {pending ? dict.common.saving : dict.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Candidate = { id: string; number: string; clientName: string; remaining: number; dueDate: Date; score: number; exact: boolean; refMatch: boolean; sameClient: boolean };

export function MatchDialog({ paymentId, amount }: { paymentId: string; amount: number }) {
  const { dict, locale } = useI18n();
  const p = dict.partner.payments;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Candidate[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setList(null);
          matchCandidatesAction(paymentId).then((r) => setList(r.ok ? (r.data as Candidate[]) : []));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 /> {p.match}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.matchTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {p.amount}: <span className="text-foreground tabular font-medium">{money(amount, locale)}</span>
        </p>
        {list === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{p.noCandidates}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {list.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-medium">{c.number}</span>
                    {i === 0 && (c.refMatch || c.sameClient || c.exact) && (
                      <span className="text-ok inline-flex items-center gap-1 text-xs font-medium">
                        <Sparkles className="size-3" /> {p.suggested}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {c.clientName} · {dateOnly(c.dueDate, locale)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("tabular text-sm", c.exact && "text-ok font-medium")}>{fmt(p.remaining, { amount: money(c.remaining, locale) })}</span>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await reconcileAction(paymentId, c.id);
                        if (!r.ok) {
                          toast.error(r.error);
                          return;
                        }
                        toast.success(fmt(p.matched, { number: c.number }));
                        setOpen(false);
                      })
                    }
                  >
                    {p.match}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
