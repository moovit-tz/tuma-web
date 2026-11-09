"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { savePartnerAction } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

export type PartnerFormValue = {
  id?: string;
  kind: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  regions: string[];
  offer: string | null;
  notes: string | null;
  status: string;
  contractEndsAt: string | null;
};

const selectCls = "bg-background h-9 w-full rounded-md border px-2 text-sm";

/** Add a partner, or edit one: who they are, how to reach them, what they offer, where, and the contract's end. */
export function PartnerDialog({ kinds, statuses, regions, partner, defaultKind }: { kinds: string[]; statuses: string[]; regions: readonly string[]; partner?: PartnerFormValue; defaultKind?: string }) {
  const { dict: t } = useI18n();
  const g = t.admin.partners;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const blank: PartnerFormValue = {
    kind: defaultKind ?? kinds[0],
    name: "",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    regions: [],
    offer: "",
    notes: "",
    status: "active",
    contractEndsAt: null,
  };
  const [v, setV] = useState<PartnerFormValue>(partner ?? blank);
  const [pending, start] = useTransition();
  const set = <K extends keyof PartnerFormValue>(k: K, val: PartnerFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const toggleRegion = (r: string) => set("regions", v.regions.includes(r) ? v.regions.filter((x) => x !== r) : [...v.regions, r]);

  const submit = () =>
    start(async () => {
      const r = await savePartnerAction(partner?.id ?? null, {
        ...v,
        contactName: v.contactName ?? "",
        phone: v.phone ?? "",
        email: v.email ?? "",
        website: v.website ?? "",
        offer: v.offer ?? "",
        notes: v.notes ?? "",
        contractEndsAt: v.contractEndsAt ? v.contractEndsAt.slice(0, 10) : "",
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(g.saved);
      setOpen(false);
      if (!partner) setV(blank);
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setV(partner ?? blank);
      }}
    >
      <DialogTrigger asChild>
        {partner ? (
          <Button size="sm" variant="ghost" aria-label={`${g.edit}: ${partner.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> {g.add}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{partner ? g.edit : g.add}</DialogTitle>
          <DialogDescription>{g.sub}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">{g.name}</Label>
              <Input id="p-name" value={v.name} onChange={(e) => set("name", e.target.value)} required minLength={2} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-kind">{g.kind}</Label>
              <select id="p-kind" className={selectCls} value={v.kind} onChange={(e) => set("kind", e.target.value)}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {g.kinds[k] ?? k}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-contact">{g.contactName}</Label>
              <Input id="p-contact" value={v.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-phone">{g.phone}</Label>
              <Input id="p-phone" type="tel" inputMode="tel" value={v.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-email">{g.email}</Label>
              <Input id="p-email" type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-web">{g.website}</Label>
              <Input id="p-web" type="url" placeholder="https://" value={v.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-offer">{g.offer}</Label>
            <Textarea id="p-offer" rows={3} placeholder={g.offerHint} value={v.offer ?? ""} onChange={(e) => set("offer", e.target.value)} />
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium">{g.regions}</legend>
            <p className="text-muted-foreground text-xs">{g.regionsHint}</p>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
              {regions.map((r) => {
                const on = v.regions.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRegion(r)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-status">{g.status}</Label>
              <select id="p-status" className={selectCls} value={v.status} onChange={(e) => set("status", e.target.value)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {g.statuses[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-ends">{g.contractEnds}</Label>
              <Input id="p-ends" type="date" value={v.contractEndsAt?.slice(0, 10) ?? ""} onChange={(e) => set("contractEndsAt", e.target.value || null)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-notes">{g.notes}</Label>
            <Textarea id="p-notes" rows={2} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" disabled={pending || v.name.trim().length < 2}>
              {g.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
