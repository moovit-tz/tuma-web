import { Building2, Clock, ShieldCheck, UserRound } from "lucide-react";
import { asLocale } from "@/domain/types";
import { fmt, getDict } from "@/i18n";
import { BandLayout } from "@/components/brand/band-layout";
import { getCurrentUser } from "@/server/auth/current-user";
import { inviteByToken } from "@/server/services/team-invites";
import { JoinActions } from "@/components/team/join-actions";

export const metadata = { title: "Join your team on Tuma", robots: { index: false } };

/** Reads the session and the invitation on every request. */
export const instant = false;

/**
 * Where a team invitation's SMS link lands. Signed out: who invited them and to what, then "Continue with Ondi"
 * (Ondi lets them create an account), which comes back here. Signed in: accept or decline.
 */
export default async function JoinPage({ params }: PageProps<"/[locale]/join/[token]">) {
  const { locale: raw, token } = await params;
  const locale = asLocale(raw);
  const t = getDict(locale).invites;
  const [invite, user] = await Promise.all([inviteByToken(token), getCurrentUser()]);

  if (!invite || invite.status === "revoked") {
    return (
      <BandLayout locale={locale} eyebrow={t.joinEyebrow} title={t.invalid} sub={t.invalidSub}>
        <span />
      </BandLayout>
    );
  }
  const business = invite.business;
  const closed = invite.status === "expired" ? fmt(t.expiredSub, { inviter: invite.inviter }) : invite.status === "declined" ? t.declined : null;

  return (
    <BandLayout locale={locale} eyebrow={t.joinEyebrow} title={fmt(t.joinTitle, { business })} sub={fmt(t.joinLead, { inviter: invite.inviter })}>
      <div className="max-w-xl space-y-5">
        <dl className="bg-card divide-y rounded-lg border shadow-sm">
          <Fact icon={<Building2 className="size-5" />} label={getDict(locale).team.company} value={business} />
          <Fact icon={<ShieldCheck className="size-5" />} label={t.joinAs} value={invite.roles.join(", ")} />
          {invite.office && <Fact icon={<UserRound className="size-5" />} label={t.joinOffice} value={invite.office} />}
        </dl>
        {invite.businessPending && invite.status === "pending" && (
          <p className="bg-warn/10 border-warn/25 flex gap-2.5 rounded-lg border px-4 py-3 text-sm leading-relaxed">
            <Clock className="text-warn mt-0.5 size-4 shrink-0" />
            {fmt(t.joinPendingNote, { business })}
          </p>
        )}
        {closed ? (
          <p className="bg-card rounded-lg border px-4 py-4 text-sm">{closed}</p>
        ) : (
          <JoinActions
            token={token}
            locale={locale}
            business={business}
            accepted={invite.status === "accepted"}
            signedInAs={user?.name ?? null}
            loginHref={`/api/auth/login?locale=${locale}&next=${encodeURIComponent(`/${locale}/join/${token}`)}`}
          />
        )}
      </div>
    </BandLayout>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <span className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-full">{icon}</span>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="truncate font-medium">{value}</dd>
      </div>
    </div>
  );
}
