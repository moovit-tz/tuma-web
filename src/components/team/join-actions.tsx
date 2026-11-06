"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { respondToInviteAction } from "@/app/actions/team";
import { OndiButton } from "@/components/auth/ondi-button";

/** Sign in with Ondi, then join (or decline). After joining, opens Tuma. */
export function JoinActions(props: { token: string; locale: string; business: string; accepted: boolean; signedInAs: string | null; loginHref: string }) {
  const { dict } = useI18n();
  const t = dict.invites;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"open" | "joined" | "declined">(props.accepted ? "joined" : "open");

  if (state === "joined") {
    return (
      <div className="bg-card space-y-4 rounded-lg border p-5">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="text-ok size-5" /> {fmt(t.joined, { business: props.business })}
        </p>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => router.push(`/${props.locale}/portal`)}>
          {t.joinedOpen}
        </Button>
      </div>
    );
  }
  if (state === "declined") return <p className="bg-card rounded-lg border px-4 py-4 text-sm">{t.declined}</p>;

  if (!props.signedInAs) {
    return (
      <div className="space-y-3">
        <OndiButton href={props.loginHref} className="w-full sm:inline-flex sm:w-auto">
          {t.joinSignIn}
        </OndiButton>
        <p className="text-muted-foreground text-sm">{t.joinSignInNote}</p>
      </div>
    );
  }

  const answer = (a: "accept" | "decline") =>
    start(async () => {
      setError(null);
      const r = await respondToInviteAction({ token: props.token }, a);
      if (r.ok) setState(a === "accept" ? "joined" : "declined");
      else if (r.code === "ALREADY_JOINED") setState("joined");
      else setError(r.code === "OTHER_COMPANY" ? t.otherCompany : r.error || t.failed);
    });

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-sm">
        {fmt(t.joinSignedInAs, { name: props.signedInAs })} ·{" "}
        <form action={`/api/auth/logout?locale=${props.locale}`} method="post" className="inline">
          <button className="hover:text-foreground underline underline-offset-2">{t.joinNotYou}</button>
        </form>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="h-12 text-base sm:px-8" disabled={pending} onClick={() => answer("accept")}>
          {pending && <Loader2 className="animate-spin" />} {pending ? t.joinAccepting : fmt(t.joinAccept, { business: props.business })}
        </Button>
        <Button size="lg" variant="ghost" className="h-12" disabled={pending} onClick={() => answer("decline")}>
          {t.joinDecline}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
