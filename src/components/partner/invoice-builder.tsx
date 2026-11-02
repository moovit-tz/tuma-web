"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { createInvoiceAction, uninvoicedAction } from "@/app/actions/partner";
import { dateOnly, money } from "@/lib/format";

type Line = { waybill: string; goods: string; deliveredAt: Date | null; amount: number };

/** Pick a client, tick delivered shipments not yet billed, create the invoice. */
export function InvoiceBuilder({ clients, initialClient }: { clients: { id: string; name: string }[]; initialClient?: string }) {
  const { dict, locale } = useI18n();
  const iv = dict.partner.invoices;
  const router = useRouter();
  const [clientId, setClientId] = useState(initialClient ?? clients[0]?.id ?? "");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    uninvoicedAction(clientId).then((r) => {
      if (cancelled) return;
      const rows = r.ok ? (r.data as Line[]) : [];
      setLines(rows);
      setPicked(new Set(rows.map((l) => l.waybill)));
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const total = useMemo(() => (lines ?? []).filter((l) => picked.has(l.waybill)).reduce((a, l) => a + l.amount, 0), [lines, picked]);
  const vat = Math.round((total * 0.18) / 1.18);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="bg-card rounded-xl border">
        <div className="border-b p-4">
          <label className="text-sm font-medium" htmlFor="client">
            {iv.chooseClient}
          </label>
          <select
            id="client"
            value={clientId}
            onChange={(e) => {
              setLines(null);
              setClientId(e.target.value);
            }}
            className="bg-background mt-1.5 h-10 w-full max-w-sm rounded-md border px-3"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-muted-foreground border-b px-4 py-2.5 text-xs font-medium">{iv.shipments}</div>
        {lines === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground px-4 py-12 text-center text-sm">{iv.none}</p>
        ) : (
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.waybill}>
                <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={picked.has(l.waybill)}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(l.waybill);
                      else next.delete(l.waybill);
                      setPicked(next);
                    }}
                  />
                  <span className="font-mono text-[13px]">{l.waybill}</span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">{l.goods}</span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">{dateOnly(l.deliveredAt, locale)}</span>
                  <span className="tabular w-28 text-right">{money(l.amount, locale)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className="bg-card h-fit rounded-xl border p-4 lg:sticky lg:top-20">
        <div className="text-muted-foreground text-sm">{fmt(iv.selected, { n: picked.size })}</div>
        <div className="font-display tabular mt-1 text-3xl font-semibold">{money(total, locale)}</div>
        <div className="text-muted-foreground text-xs">{fmt(iv.vatIncl, { vat: money(vat, locale) })}</div>
        <Button
          className="mt-4 w-full"
          disabled={pending || picked.size === 0}
          onClick={() =>
            start(async () => {
              const r = await createInvoiceAction(clientId, [...picked]);
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              toast.success(fmt(iv.created, { number: String(r.data) }));
              router.push(`/${locale}/portal/invoices?tab=open`);
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : null} {iv.create}
        </Button>
      </aside>
    </div>
  );
}
