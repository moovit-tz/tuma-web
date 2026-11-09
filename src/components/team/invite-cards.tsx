"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { respondToInviteAction } from "@/app/actions/team";

type Invite = { id: string; business: string; inviter: string; roles: string[] };

/** Invitations addressed to the signed-in person's phone or email: join or decline right here. */
export function InviteCards({ invites, locale }: { invites: Invite[]; locale: string }) {
  const { dict } = useI18n();
  const t = dict.invites;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const open = invites.filter((i) => !gone.includes(i.id));
  if (!open.length) return null;
  return (
    <div className="mb-6 space-y-3">
      {open.map((i) => (
        <div key={i.id} className="bg-card border-brand-red/30 rounded-lg border p-5 shadow-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Mail className="text-brand-ink size-5" /> {t.youreInvited}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{fmt(t.youreInvitedSub, { inviter: i.inviter, business: i.business, roles: i.roles.join(", ") })}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await respondToInviteAction({ id: i.id }, "accept");
                  if (r.ok) router.push(`/${locale}/portal`);
                  else setError(r.code === "OTHER_COMPANY" ? t.otherCompany : r.error);
                })
              }
            >
              {fmt(t.joinAccept, { business: i.business })}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await respondToInviteAction({ id: i.id }, "decline");
                  if (r.ok) setGone((g) => [...g, i.id]);
                  else setError(r.error);
                })
              }
            >
              {t.joinDecline}
            </Button>
          </div>
        </div>
      ))}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
