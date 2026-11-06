import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema";
import { ondiStub } from "@/server/adapters/ondi";

/**
 * Stand-in for Ondi's hosted sign-in page (ONDI_MODE=stub only).
 * Picking a persona issues an authorization code bound to the PKCE challenge and sends the browser back.
 */
export default function OndiStubPage({ searchParams }: PageProps<"/dev/ondi">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <div className="eyebrow">Development stub</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Ondi</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Moovit sign-in is simulated until the Ondi OIDC sandbox is available. Choose who to sign in as. Role
          assignments are managed in the Tuma console under Settings → Users.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading personas…</p>}>
        <Personas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Personas({ searchParams }: { searchParams: PageProps<"/dev/ondi">["searchParams"] }) {
  if (process.env.ONDI_MODE !== "stub") return <p>Ondi stub is disabled.</p>;
  const sp = await searchParams;
  const state = String(sp.state ?? "");
  const challenge = String(sp.code_challenge ?? "");
  const redirectUri = String(sp.redirect_uri ?? "");
  if (!state || !challenge || !redirectUri.startsWith(process.env.APP_URL ?? "")) {
    return <p className="text-destructive text-sm">Invalid authorization request. Start from the Tuma sign-in page.</p>;
  }
  const [people, accts] = await Promise.all([
    db.select().from(users).orderBy(asc(users.name)),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts),
  ]);
  const accountName = new Map(accts.map((a) => [a.id, a.name]));

  async function signInAs(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const [u] = (await db.select().from(users)).filter((x) => x.id === id);
    if (!u) return;
    const code = await ondiStub().issueCode(
      { sub: u.id, name: u.name, email: u.email ?? undefined, accountId: u.accountId, roles: u.roles, locale: u.locale },
      challenge,
    );
    const back = new URL(redirectUri);
    back.searchParams.set("code", code);
    back.searchParams.set("state", state);
    redirect(back.toString());
  }

  /** Someone new to Tuma: Ondi creates the identity; Tuma gives it roles later (e.g. a driver registering in Tuma-X). */
  async function signUp(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim().slice(0, 80);
    if (name.length < 3) return;
    const email = String(formData.get("email") ?? "").trim() || undefined;
    const sub = `ondi|${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}.${crypto.randomUUID().slice(0, 6)}`;
    const code = await ondiStub().issueCode({ sub, name, email, accountId: null, roles: [], locale: "sw" }, challenge);
    const back = new URL(redirectUri);
    back.searchParams.set("code", code);
    back.searchParams.set("state", state);
    redirect(back.toString());
  }

  return (
    <>
    <ul className="divide-border bg-card divide-y rounded-lg border">
      {people.map((p) => (
        <li key={p.id}>
          <form action={signInAs}>
            <input type="hidden" name="id" value={p.id} />
            <button className="hover:bg-muted flex w-full items-center justify-between gap-4 px-4 py-3 text-left disabled:opacity-50" disabled={!p.active}>
              <span>
                <span className="block font-medium">{p.name}</span>
                <span className="text-muted-foreground block text-xs">
                  {p.accountId ? accountName.get(p.accountId) : "No account"} · {p.email}
                </span>
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                {p.roles.map((r) => (
                  <span key={r} className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {r}
                  </span>
                ))}
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
    <form action={signUp} className="bg-card mt-4 grid gap-2 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]">
      <div className="text-muted-foreground text-xs sm:col-span-3">New to Ondi? Create an identity (no roles yet).</div>
      <input name="name" required minLength={3} placeholder="Full name" className="bg-background h-10 rounded-md border px-3 text-sm" />
      <input name="email" type="email" placeholder="Email (optional)" className="bg-background h-10 rounded-md border px-3 text-sm" />
      <button className="bg-foreground text-background h-10 rounded-md px-4 text-sm font-medium">Sign up</button>
    </form>
    </>
  );
}
