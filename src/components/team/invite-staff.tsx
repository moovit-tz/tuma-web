"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { inviteStaffAction } from "@/app/actions/team";

type Role = { key: string; name: string; description?: string };
type Office = { id: string; name: string };

const input = "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-11 w-full rounded-md border px-3 outline-none";

/** Invite someone by phone, with roles and an office. After sending, shows the link to copy or share on WhatsApp. */
export function InviteStaff({ roles, offices, business, lockedOffice }: { roles: Role[]; offices: Office[]; business: string; lockedOffice?: string | null }) {
  const { dict } = useI18n();
  const t = dict.invites;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [office, setOffice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setPicked(roles.length === 1 ? [roles[0].key] : []);
    setOffice(lockedOffice ?? "");
    setErrors({});
    setLink(null);
    setCopied(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await inviteStaffAction({ name, phone, email, roles: picked, branchId: office });
      if (r.ok && r.data) {
        setLink(r.data.link);
        toast.success(fmt(t.sent, { phone }));
      } else if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t.copied);
    } catch {
      /* clipboard blocked: the link is selectable in the box */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> {t.invite}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {link ? (
          <>
            <DialogHeader>
              <div className="bg-ok/10 text-ok mb-1 grid size-11 place-items-center rounded-full">
                <Check className="size-5" />
              </div>
              <DialogTitle>{t.linkTitle}</DialogTitle>
              <DialogDescription>{fmt(t.linkSub, { name })}</DialogDescription>
            </DialogHeader>
            <div className="bg-muted/60 rounded-md border px-3 py-2.5 font-mono text-[12.5px] break-all select-all">{link}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? t.copied : t.copy}
              </Button>
              <Button variant="outline" asChild>
                <a href={`https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "255")}?text=${encodeURIComponent(fmt(t.whatsappText, { name, business, link }))}`} target="_blank" rel="noreferrer">
                  <MessageCircle /> {t.whatsapp}
                </a>
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>{t.done}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>{t.sub}</DialogDescription>
            </DialogHeader>
            <form id="invite-form" className="grid gap-3.5" onSubmit={submit}>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">{t.name}</span>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} autoComplete="off" required />
                {errors.name && <span className="text-destructive text-[12.5px]">{errors.name}</span>}
              </label>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">{t.phone}</span>
                  <input className={input} type="tel" inputMode="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} required />
                  {errors.phone && <span className="text-destructive text-[12.5px]">{errors.phone}</span>}
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">{t.email}</span>
                  <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
                  {errors.email && <span className="text-destructive text-[12.5px]">{errors.email}</span>}
                </label>
              </div>
              <fieldset>
                <legend className="text-sm font-medium">{t.roles}</legend>
                <p className="text-muted-foreground mb-1.5 text-[12.5px]">{t.rolesHint}</p>
                <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border p-1.5">
                  {roles.map((r) => (
                    <label key={r.key} className="hover:bg-muted flex cursor-pointer items-start gap-2.5 rounded px-2 py-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-brand-red mt-0.5 size-4"
                        checked={picked.includes(r.key)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, r.key] : picked.filter((k) => k !== r.key))}
                      />
                      <span>
                        <span className="font-medium">{r.name}</span>
                        {r.description && <span className="text-muted-foreground block text-[12.5px] leading-snug">{r.description}</span>}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.roles && <span className="text-destructive text-[12.5px]">{errors.roles}</span>}
              </fieldset>
              {offices.length > 1 && !lockedOffice && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">{t.office}</span>
                  <select className={input} value={office} onChange={(e) => setOffice(e.target.value)}>
                    <option value="">{t.wholeCompany}</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </form>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {dict.common.cancel}
              </Button>
              <Button type="submit" form="invite-form" disabled={pending}>
                {pending ? t.sending : t.send}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
