import { Suspense } from "react";
import { getDict } from "@/i18n";
import { PublicFooter, PublicHeader } from "@/components/brand/public-header";

const ERRORS: Record<string, string> = {
  state: "The sign-in request expired. Try again.",
  exchange: "Ondi could not verify the sign-in. Try again.",
  inactive: "This user has been deactivated.",
};

export default async function SignIn({ params, searchParams }: PageProps<"/[locale]/signin">) {
  const { locale } = await params;
  const t = getDict(locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader locale={locale} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <div className="bg-card rounded-lg border p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t.signin.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t.signin.body}</p>
          <Suspense fallback={<div className="bg-primary/80 mt-6 h-11 rounded-md" />}>
            <SignInButton locale={locale} searchParams={searchParams} />
          </Suspense>
          {process.env.ONDI_MODE === "stub" && <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">{t.signin.stubNote}</p>}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}

async function SignInButton({ locale, searchParams }: { locale: string; searchParams: PageProps<"/[locale]/signin">["searchParams"] }) {
  const t = getDict(locale);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const error = typeof sp.error === "string" ? sp.error : "";
  const href = `/api/auth/login?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <>
      {error && (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-md border px-3 py-2 text-sm">
          {error === "no_role" ? t.signin.noAccess : (ERRORS[error] ?? "Sign-in failed.")}
        </p>
      )}
      <a href={href} className="bg-primary text-primary-foreground mt-6 flex h-11 items-center justify-center rounded-md font-medium hover:opacity-90">
        {t.signin.cta}
      </a>
    </>
  );
}
