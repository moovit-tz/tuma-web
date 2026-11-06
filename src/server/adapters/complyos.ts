import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { toRegistryRecord, type RegistryKind, type RegistryRecord } from "@/domain/brela";

/**
 * Hudumika ComplyOS adapter: KYB checks for businesses that self-onboard (parcel agents first).
 *
 * Tuma sends each application through the outbox (target "complyos", topic "kyb.submitted"); ComplyOS checks the
 * TIN with TRA, the business licence, and the people behind it, then calls POST /api/hooks/complyos with a decision.
 * PLACEHOLDER contract until ComplyOS publishes its API. With COMPLYOS_MODE=stub, /dev/complyos stands in for the
 * reviewer and applies decisions through the same code path as the webhook.
 */
export const COMPLYOS_DECISIONS = ["in_review", "needs_info", "approved", "rejected"] as const;
export type ComplyDecision = (typeof COMPLYOS_DECISIONS)[number];

export const complyStub = () => (process.env.COMPLYOS_MODE ?? "stub") === "stub";

/** Payload Tuma sends to ComplyOS. Kept here so the contract is in one place. */
export function kybSubmission(a: {
  ref: string;
  version: number;
  accountKind: string;
  businessName: string;
  businessType: string;
  tin: string;
  licenceNumber: string | null;
  licenceFile: string | null;
  office: Record<string, unknown>;
  contact: Record<string, unknown>;
  applicantId: string;
  registration?: unknown;
}) {
  return {
    subjectType: "business",
    externalRef: a.ref,
    version: a.version,
    product: `tuma.${a.accountKind}`,
    business: { name: a.businessName, type: a.businessType, tin: a.tin, licenceNumber: a.licenceNumber, licenceDocument: a.licenceFile },
    // The BRELA record the applicant picked (unverified: ComplyOS checks it against BRELA).
    registry: a.registration ?? null,
    premises: a.office,
    contact: a.contact,
    applicant: { ondiSub: a.applicantId },
    callbackUrl: new URL("/api/hooks/complyos", process.env.APP_URL ?? "http://localhost:3100").toString(),
  };
}

/** Header `x-complyos-signature: sha256=<hex HMAC of the raw body>` with COMPLYOS_WEBHOOK_SECRET. */
export function verifyComplySignature(raw: string, header: string | null): boolean {
  const secret = process.env.COMPLYOS_WEBHOOK_SECRET;
  if (!secret) return false;
  const sig = (header ?? "").replace(/^sha256=/, "");
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  return sig.length === want.length && timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

/* ------------------------------------------------------------ company lookup (BRELA) */

/**
 * Looks a business up in the BRELA register so the applicant can pick it and have the form filled in.
 *
 * Through ComplyOS (`POST {COMPLYOS_API_URL}/v1/comply/brela-search`, service token COMPLYOS_API_TOKEN) when Tuma has
 * a ComplyOS service credential; until then through the Hudumika registry lookup Ondi exposes
 * (`POST {ONDI_API_URL}/v1/organizations/brela-search`), which queries the same public BRELA register.
 * BRELA has no official API and its portal blocks most server traffic, so a lookup can fail: the form stays editable.
 */
export async function searchBusinessRegistry(input: { kind: RegistryKind; query: string }): Promise<{ results: RegistryRecord[]; via: "complyos" | "ondi" }> {
  try {
    return await registryOnce(input);
  } catch (e) {
    // The register's link drops now and then; one retry on a network failure (not on an HTTP error).
    if ((e as Error).message.startsWith("fetch failed")) return registryOnce(input);
    throw e;
  }
}

async function registryOnce(input: { kind: RegistryKind; query: string }): Promise<{ results: RegistryRecord[]; via: "complyos" | "ondi" }> {
  const q = input.query.trim();
  const byNumber = /^[\d\s-]+$/.test(q);
  const number = byNumber ? q.replace(/\D/g, "") : "";
  const name = byNumber ? "" : q;
  const timeout = AbortSignal.timeout(15_000);

  const complyUrl = process.env.COMPLYOS_API_URL;
  const complyToken = process.env.COMPLYOS_API_TOKEN;
  if (complyUrl && complyToken) {
    const res = await fetch(new URL("/v1/comply/brela-search", complyUrl), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${complyToken}` },
      body: JSON.stringify({ objectType: input.kind === "company" ? "Company" : "Business name", incNumber: number || undefined, companyName: name || undefined }),
      signal: timeout,
    });
    if (!res.ok) throw new Error(`ComplyOS BRELA search failed: ${res.status}`);
    const data = (await res.json()) as { results?: { reg_number: string; name: string; registered_office?: string; status?: string; type?: string; incorporation_date?: string | null }[] };
    return {
      via: "complyos",
      results: (data.results ?? []).map((r) =>
        toRegistryRecord({ number: r.reg_number, name: r.name, kind: input.kind, subtype: r.type, status: r.status, registeredOn: r.incorporation_date, address: r.registered_office }),
      ),
    };
  }

  const ondiUrl = process.env.ONDI_API_URL;
  if (!ondiUrl) throw new Error("No company register configured (COMPLYOS_API_URL or ONDI_API_URL).");
  const res = await fetch(new URL("/v1/organizations/brela-search", ondiUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objectType: input.kind === "company" ? "ET-COMPANY" : "ET-BUSINESS", number: number || undefined, name: name || undefined }),
    signal: timeout,
  });
  if (!res.ok) throw new Error(`Registry lookup failed: ${res.status}`);
  const data = (await res.json()) as {
    results?: { cert_number: string | number; legal_name: string; subtype_name?: string | null; reg_status_name?: string | null; incorporation_date?: string | null; reg_date?: string | null; address?: string | null }[];
  };
  return {
    via: "ondi",
    results: (data.results ?? [])
      .filter((r) => r.cert_number && r.legal_name)
      .map((r) =>
        toRegistryRecord({
          number: String(r.cert_number),
          name: r.legal_name,
          kind: input.kind,
          subtype: r.subtype_name,
          status: r.reg_status_name,
          registeredOn: r.incorporation_date ?? r.reg_date,
          address: r.address,
        }),
      ),
  };
}
