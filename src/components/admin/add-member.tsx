"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { addTeamMemberAction } from "@/app/actions/roles";

export function AddMember({ roles }: { roles: { key: string; name: string }[] }) {
  const { dict } = useI18n();
  const t = dict.roles;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const input = "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 w-full rounded-md border px-3 outline-none";
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setName("");
          setEmail("");
          setPicked([]);
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> {t.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.addMember}</DialogTitle>
          <DialogDescription>{t.memberNote}</DialogDescription>
        </DialogHeader>
        <form
          id="member-form"
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addTeamMemberAction({ name, email, roles: picked });
              if (r.ok) {
                toast.success(t.memberAdded);
                setOpen(false);
              } else {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
              }
            });
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{dict.forms.name}</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} required />
            {errors.name && <span className="text-destructive text-[12.5px]">{errors.name}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{dict.forms.email}</span>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} required />
            {errors.email && <span className="text-destructive text-[12.5px]">{errors.email}</span>}
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t.assign}</legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {roles.map((r) => (
                <label key={r.key} className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                  <input type="checkbox" className="size-4" checked={picked.includes(r.key)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.key] : picked.filter((k) => k !== r.key))} />
                  {r.name}
                </label>
              ))}
            </div>
            {errors.roles && <span className="text-destructive text-[12.5px]">{errors.roles}</span>}
          </fieldset>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" form="member-form" disabled={pending}>
            {pending ? dict.common.saving : t.addMember}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
