import "server-only";

/**
 * Syncs an approved Tuma business into Ondi's Organizations registry — the shared account hub across
 * Hudumika. Ondi doesn't otherwise know about Tuma's own KYB approvals (Tuma owns that decision), so
 * without this, a product reading "this person's company" from Ondi (e.g. CRM's GET /organizations/mine)
 * sees nothing even for an approved Tuma business. Calls POST /v1/organizations/provision — the same
 * x-admin-key-gated endpoint apps/api's onboarding wizard already provisions through — idempotent on
 * registrationNumber, and links ownerUserId as Owner if not already a member.
 *
 * Fails soft and fire-and-forget from the caller's point of view: an Ondi outage must never block or
 * roll back a Tuma KYB approval, so this is called after the approval transaction commits, and only
 * logs on failure.
 */
export async function syncOrganizationToOndi(params: {
  businessName: string;
  registrationNumber: string;
  ownerUserId: string;
  country?: string;
}): Promise<void> {
  const apiUrl = process.env.ONDI_API_URL;
  const adminKey = process.env.ONDI_ADMIN_KEY;
  if (!apiUrl || !adminKey) {
    console.warn("⚠️  Ondi org sync: ONDI_API_URL/ONDI_ADMIN_KEY not set — skipping (this business won't show up in Ondi yet).");
    return;
  }

  try {
    const res = await fetch(new URL("/v1/organizations/provision", apiUrl), {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({
        businessName: params.businessName,
        registrationNumber: params.registrationNumber,
        country: params.country ?? "TZ",
        ownerUserId: params.ownerUserId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`❌ Ondi org sync failed (${res.status}) for ${params.registrationNumber}: ${await res.text().catch(() => "")}`);
    }
  } catch (err) {
    console.error("❌ Ondi org sync failed:", err);
  }
}
