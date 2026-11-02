# Tuma web portal

The merchant portal and the Tuma Console in one Next.js app, built to the **Tuma SRS v0.1** (1 Nov 2026).
Parcel module first (R1). `../web` and `../api` are the older MySafari Parcel code, kept for reference only.

## Run it

```bash
pnpm install
pnpm db:up          # Postgres 17 in Docker on localhost:5544
pnpm db:push        # create tables from src/server/db/schema.ts
pnpm db:seed        # roles, reason codes, locations, accounts, users, 64 demo shipments
pnpm dev            # http://localhost:3100
```

Sign in with **Continue with Ondi**. Ondi is simulated (`ONDI_MODE=stub`), so you pick a persona:

| Persona | Role | Lands in |
| --- | --- | --- |
| Amina Juma | merchant_user (Kariakoo Mart) | Merchant portal |
| Baraka Mushi | merchant_user (Zuri Fashion, Swahili) | Merchant portal |
| Neema Mollel | control_tower | Console |
| John Mrema | dispatcher | Console |
| Halima Said | finance_officer | Console |
| Tuma Admin | tuma_admin | Console + Settings |
| Grace Lyimo | partner_admin (Kilimanjaro Freight) | Partner workspace |
| Peter Kweka | partner_finance (Kilimanjaro Freight) | Partner workspace (finance) |
| Daudi Mfinanga | partner_ops (Mzizima Warehousing) | Partner workspace (operations) |
| Salim Hassan | rider | No web access (field app role) |

## User groups

| Group | Who | Area |
| --- | --- | --- |
| Tuma Staff | Moovit operations, finance, admins (`internal` accounts) | `/console` |
| Corp | Businesses that send parcels and cargo (`merchant`, `shipper`) | `/portal` |
| Partners | Warehouses, freight forwarders, parcel companies, transporters (`partner`) | `/partner` |

Partners see only cargo assigned to them (`shipments.handling_partner_id`): received, in transit, delivered;
they load cargo onto their vehicles, manage their fleet and drivers, keep their own client book, invoice clients
for delivered cargo, record payments and reconcile them (auto-matched by invoice number in the reference, or by
the exact balance of the client's only open invoice).

`pnpm db:seed --reset` recreates the demo shipments. `pnpm test` runs unit and integration tests; the
integration tests use the `tuma_test` database (`DATABASE_URL_TEST`), never the dev database.

## What's built

| Area | SRS |
| --- | --- |
| Waybill numbers `TMP-YYMM-XXXXXXC`: Crockford base32, Luhn mod 32 check character | 4.2, FR-WB-01 |
| Parcel lifecycle state machine, enforced by **permissions** | 4.4, FR-WB-04 |
| Append-only event ledger; status derived from events; clock-skew flag; estimated milestones | FR-TRK-01/03/06 |
| New order with live price, chargeable weight, COD, Wakala drop-off and collection | FR-PCL-01/03/04/05/13 |
| Payment standing check, contract service levels, duplicate-reference warning | FR-FIN-03, FR-CRM-02, FR-WB-09 |
| 100 × 150 mm label per piece and A4 waybill, Code 128 + QR, reprints counted | FR-WB-03/05 |
| Cancellation (free before handover), consignee edits until out for delivery | FR-PCL-12, FR-WB-06 |
| Failed attempts, automatic return after 3 with a linked return waybill | FR-PCL-10/11 |
| Merchant dashboard, shipments list with search and filters | FR-RPT-02, FR-OPS-03 |
| Control tower: open, SLA at risk, exceptions, awaiting handover, cash held | FR-OPS-01/02 |
| Public tracking with masking, phone-digit check, rate limits | 7.2, FR-TRK-02, NFR-13 |
| **Roles and permissions managed in the console**; user role assignment | Section 3, FR-PLT-03, Q2 |
| Tamper-evident audit log (hash chain), including rejected transitions | FR-PLT-04, NFR-15 |
| Transactional outbox for FinOps, HuduFeed and Bliss messages | 9.1, FR-FIN-01/02, FR-MSG-01, FR-SVC-02 |
| English and Swahili, Africa/Dar_es_Salaam time, TZS, E.164 phones | FR-PLT-05/06, NFR-16 |
| Session idle timeout 30 minutes | NFR-12 |

## Layout

```
src/domain/          pure rules, unit-tested: waybill numbers, states, pricing, roles catalog, order schema
src/server/db/       Drizzle schema and client
src/server/services/ shipments, roles, tracking (authorisation is checked here, next to the data)
src/server/adapters/ Ondi, FinOps, notifications, outbox — the only code that talks to partner systems
src/app/(app)/[locale]/portal | console | track | signin
src/app/(dev)/dev/ondi   stub Ondi sign-in page (dev only)
src/app/api/         auth flow, label PDFs
```

## Roles and permissions

- **Permissions** are a catalog in code (`src/domain/roles.ts`), because each one guards code.
- **Roles** are rows in the database. Admins create roles and grant permissions at
  *Console → Settings → Roles and permissions*, and assign roles at *Settings → Users*.
- Ondi role claims match roles by key. The 14 SRS roles are seeded as editable built-in roles.
- Guards: built-in roles can be deactivated but not deleted; a role in use can't be deleted; no change may leave
  nobody holding `roles.manage`. Every change is audited with granted and revoked permissions.

## Stubs and placeholders (replace when specs arrive)

| Item | Where | Waiting on |
| --- | --- | --- |
| Ondi sign-in | `src/server/adapters/ondi.ts` | Ondi OIDC spec and sandbox (A1, 14.2) |
| Rate card, COD fee, cancellation fee | `src/domain/pricing.ts`, `CANCELLATION_FEE` | Q3, finance |
| FinOps standing | `src/server/adapters/finops.ts` | FinOps contract |
| Outbox dispatcher (messages are queued, not yet sent) | `outbox` table | FinOps, HuduFeed, Bliss sandboxes |
| Rate limits in memory | `src/server/services/tracking.ts` | Shared store (Redis) |
| Field roles can act on any waybill they scan | `assertCanOperate` | Tasks and hub scoping (FR-PLT-03) |
| Swahili and French copy | `src/i18n/sw.ts`, `src/i18n/fr.ts` | Native-speaker review |
| Partner fleets kept in Tuma | `vehicles` table | Mobility Engine support for partner fleets (FR-ENG-01) |
| Partner invoices are operational records | `partner_invoices` | FinOps posting of partner invoices (outbox topic `partner.invoice.issued`) |

## Next up

Bulk CSV/XLSX upload (FR-PCL-02), COD reconciliation report (FR-RPT-03), the outbox dispatcher with HuduFeed and
FinOps adapters, dispatch board (FR-OPS-04), merchant API keys and webhooks (R2), Drizzle migrations instead of `db:push`.

## Notes for this Next.js version (16.4)

Cache Components is on: anything that reads cookies, headers or params must sit inside `<Suspense>`.
Authenticated pages set `export const instant = false` because the user is re-checked on every request (FR-IDN-03).
