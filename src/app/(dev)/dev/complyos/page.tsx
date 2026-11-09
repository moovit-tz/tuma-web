import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { complyStub } from "@/server/adapters/complyos";
import { userWith } from "@/server/auth/current-user";
import { ulid } from "@/server/ids";
import { applyKybDecision, listKyb } from "@/server/services/kyb";
import { formatTin } from "@/domain/agents";

/**
 * Stand-in for the ComplyOS reviewer (COMPLYOS_MODE=stub only). Decisions go through the same code as the
 * signed webhook, so approving here opens the agent's account, wallet and SEAL site exactly as ComplyOS will.
 * In production only signed-in staff with kyb.review can see or use it.
 */
async function reviewer(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") return "dev.complyos";
  const u = await userWith("kyb.review");
  return u ? u.id : null;
}
export default function ComplyStubPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="eyebrow">Development stub</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">ComplyOS · KYB review</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Business applications from the Tuma app. ComplyOS will check TINs with TRA and decide; until its API exists, decide here.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading applications…</p>}>
        <Applications />
      </Suspense>
    </main>
  );
}

const TONE: Record<string, string> = {
  submitted: "bg-muted",
  in_review: "bg-amber-100 text-amber-900",
  needs_info: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
};

async function Applications() {
  if (!complyStub()) return <p>ComplyOS stub is disabled.</p>;
  if (!(await reviewer())) return <p className="text-muted-foreground text-sm">Sign in to the Tuma portal with a role that can review business applications.</p>;
  const apps = await listKyb();

  async function decide(formData: FormData) {
    "use server";
    const actor = await reviewer();
    if (!complyStub() || !actor) return;
    await applyKybDecision(
      {
        eventId: `dev-${ulid()}`,
        ref: String(formData.get("ref")),
        decision: String(formData.get("decision")),
        note: String(formData.get("note") ?? "").trim() || undefined,
        complyRef: `CMP-${String(formData.get("ref")).slice(4)}`,
      },
      actor,
    );
    revalidatePath("/dev/complyos");
  }

  if (!apps.length) return <p className="text-muted-foreground bg-card rounded-lg border p-6 text-sm">No applications yet. Submit one from the Tuma app.</p>;
  return (
    <ul className="grid gap-3">
      {apps.map((a) => {
        const open = a.status === "submitted" || a.status === "in_review";
        return (
          <li key={a.id} className="bg-card rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{a.businessName}</div>
                <div className="text-muted-foreground font-mono text-xs">
                  {a.ref} · v{a.version} · {a.accountKind} · {a.businessType}
                </div>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE[a.status]}`}>{a.status.replace("_", " ")}</span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <Row k="TIN" v={formatTin(a.tin)} mono />
              <Row k="Licence" v={[a.licenceNumber, a.licenceFile ? "document attached" : null].filter(Boolean).join(" · ") || "—"} />
              <Row k="Office" v={[a.office.street, a.office.district, a.office.region].join(", ")} />
              <Row k="Office phone" v={a.office.phone} mono />
              <Row k="Contact" v={`${a.contact.name} · ${a.contact.phone}`} />
              <Row k="Workflow" v={a.workflow.join(" → ")} />
            </dl>
            {a.decisionNote && <p className="text-muted-foreground mt-2 text-sm">Note: {a.decisionNote}</p>}
            {open && (
              <form action={decide} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="ref" value={a.ref} />
                <input name="note" placeholder="Note to the applicant (needed for more info / reject)" className="bg-background h-9 min-w-56 flex-1 rounded-md border px-3 text-sm" />
                {a.status === "submitted" && <Btn d="in_review">Start review</Btn>}
                <Btn d="needs_info">Ask for info</Btn>
                <Btn d="rejected">Reject</Btn>
                <Btn d="approved" primary>
                  Approve
                </Btn>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-24 shrink-0">{k}</dt>
      <dd className={mono ? "font-mono" : undefined}>{v}</dd>
    </div>
  );
}

function Btn({ d, primary, children }: { d: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <button name="decision" value={d} className={primary ? "bg-brand-red h-9 rounded-md px-4 text-sm font-semibold text-black" : "bg-background hover:bg-muted h-9 rounded-md border px-3 text-sm"}>
      {children}
    </button>
  );
}
