"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { customerDeleteAction, customerMergeAction, customerNotSameAction, customerReportAction, customerUpdateAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Customer = { id: string; kind: string; name: string; email: string | null; tin: string | null; regNo: string | null; contactName: string | null; landmark: string | null };

/** Edit a customer's details, report them, or remove them from the list. Editing and removing need partner.clients.manage. */
export function CustomerActions({ customer, canManage, locale }: { customer: Customer; canManage: boolean; locale: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {canManage && <EditCustomer customer={customer} />}
      <ReportCustomer id={customer.id} />
      {canManage && <RemoveCustomer id={customer.id} locale={locale} />}
    </div>
  );
}

function EditCustomer({ customer }: { customer: Customer }) {
  const { dict: t } = useI18n();
  const c = t.agent.cust;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: customer.name, email: customer.email ?? "", tin: customer.tin ?? "", regNo: customer.regNo ?? "", contactName: customer.contactName ?? "", landmark: customer.landmark ?? "" });
  const [pending, start] = useTransition();
  const company = customer.kind === "company";
  const fields: [keyof typeof f, string][] = [
    ["name", c.name],
    ["email", c.email],
    ...(company
      ? ([
          ["tin", c.tin],
          ["regNo", c.regNo],
          ["contactName", c.contactName],
        ] as [keyof typeof f, string][])
      : []),
    ["landmark", c.landmark],
  ];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> {c.edit}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.edit}</DialogTitle>
          <DialogDescription>{customer.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {fields.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`cu-${k}`}>{label}</Label>
              <Input id={`cu-${k}`} value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} inputMode={k === "tin" ? "numeric" : k === "email" ? "email" : undefined} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await customerUpdateAction(customer.id, f);
                if (!r.ok) return void toast.error(r.error);
                toast.success(c.saved);
                setOpen(false);
              })
            }
          >
            {t.agent.money.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const REASONS = ["fake_payment", "prohibited_goods", "abuse", "no_show", "identity", "other"] as const;

function ReportCustomer({ id }: { id: string }) {
  const { dict: t } = useI18n();
  const c = t.agent.cust;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setReason("");
          setNote("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Flag /> {c.report}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.reportTitle}</DialogTitle>
          <DialogDescription>{c.reportBody}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{c.reason}</Label>
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm", reason === r && "border-primary bg-primary/5")}>
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-primary" />
                {c.reasons[r]}
              </label>
            ))}
          </div>
          <Label htmlFor="cu-note">{c.note}</Label>
          <Textarea id="cu-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={pending || !reason || (reason === "other" && !note.trim())}
            onClick={() =>
              start(async () => {
                const r = await customerReportAction(id, { reason, note: note.trim() || undefined });
                if (!r.ok) return void toast.error(r.error);
                toast.success(c.reported);
                setOpen(false);
              })
            }
          >
            {c.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveCustomer({ id, locale }: { id: string; locale: string }) {
  const { dict: t } = useI18n();
  const c = t.agent.cust;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive">
          <Trash2 /> {c.remove}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.remove}</DialogTitle>
          <DialogDescription>{c.removeBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await customerDeleteAction(id);
                if (!r.ok) return void toast.error(r.error);
                toast.success(c.removed);
                router.push(`/${locale}/portal/customers`);
              })
            }
          >
            {c.remove}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Group = { kind: string; name: string; customers: { id: string; name: string; phone: string; otherPhones: string[] | null; sent: number; received: number; district: string | null; region: string | null }[] };

/** Customers with the same name: merge them (the first, most recent, is kept) or say they're not the same. */
export function DuplicateGroups({ groups, canMerge, locale }: { groups: Group[]; canMerge: boolean; locale: string }) {
  const { dict: t } = useI18n();
  const c = t.agent.cust;
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(done);
    });
  return (
    <ul className="divide-y">
      {groups.slice(0, 10).map((g) => (
        <li key={g.customers.map((x) => x.id).join()} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{g.name}</p>
            <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
              {g.customers.map((x) => (
                <Link key={x.id} href={`/${locale}/portal/customers/${x.id}`} prefetch={false} className="font-mono underline-offset-4 hover:underline">
                  {x.phone} ({x.sent + x.received})
                </Link>
              ))}
            </p>
          </div>
          {canMerge && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => customerNotSameAction(g.customers.map((x) => x.id)), c.notSame)}>
                {c.notSame}
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  act(
                    () =>
                      customerMergeAction(
                        g.customers[0].id,
                        g.customers.slice(1).map((x) => x.id),
                      ),
                    c.merged,
                  )
                }
              >
                {c.merge}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
