"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { resendInviteAction, revokeInviteAction } from "@/app/actions/team";

export type InviteRow = { id: string; name: string; phone: string; roleNames: string[]; branch: string | null; expired: boolean; expiresAt: string };

/** Invitations nobody has answered yet: send again (fresh link) or cancel. */
export function PendingInvites({ invites, locale }: { invites: InviteRow[]; locale: string }) {
  const { dict } = useI18n();
  const t = dict.invites;
  if (!invites.length) return null;
  return (
    <section className="bg-card rounded-lg border shadow-sm">
      <h2 className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
        <Clock className="text-muted-foreground size-4" /> {t.pendingTitle}
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">{invites.length}</span>
      </h2>
      <ul className="divide-y">
        {invites.map((i) => (
          <Row key={i.id} invite={i} locale={locale} />
        ))}
      </ul>
    </section>
  );
}

function Row({ invite: i, locale }: { invite: InviteRow; locale: string }) {
  const { dict } = useI18n();
  const t = dict.invites;
  const [pending, start] = useTransition();
  const date = new Date(i.expiresAt).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "short" });
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{i.name}</div>
        <div className="text-muted-foreground text-xs">
          {i.phone} · {i.roleNames.join(", ")}
          {i.branch ? ` · ${i.branch}` : ""}
        </div>
      </div>
      <span className={i.expired ? "text-destructive text-xs font-medium" : "text-muted-foreground text-xs"}>{i.expired ? t.expired : fmt(t.expires, { date })}</span>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resendInviteAction(i.id);
              if (r.ok) toast.success(t.resent);
              else toast.error(r.error);
            })
          }
        >
          <RotateCw /> {t.resend}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={`${t.revoke} ${i.name}`}
          onClick={() =>
            start(async () => {
              const r = await revokeInviteAction(i.id);
              if (r.ok) toast.success(t.revoked);
              else toast.error(r.error);
            })
          }
        >
          <X /> {t.revoke}
        </Button>
      </div>
    </li>
  );
}
