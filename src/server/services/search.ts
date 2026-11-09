import "server-only";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { partnerClients, partnerInvoices, partnerPayments, roles, shipments, users, vehicles } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import { impliedEntity, interpret, type Entity, type Filter } from "@/domain/search-intent";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";
import type { Permission } from "@/domain/roles";
import { getDict } from "@/i18n";

/**
 * Portal search: understands the query (domain/search-intent), turns it into filtered views the user can
 * open, and looks up matching records — all limited to what the user's permissions allow.
 */

export type Suggestion = { label: string; hint: string; href: string; kind: "view" | "action" };
export type Hit = { title: string; subtitle?: string; badge?: string; href: string };
export type SearchResult = { suggestions: Suggestion[]; groups: { type: string; label: string; items: Hit[] }[]; understood: string[] };

const SHIP_STATE: Partial<Record<Filter, string>> = {
  delivered: "DELIVERED",
  failed: "ATTEMPT_FAILED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  awaiting: "AWAITING_HANDOVER",
  at_hub: "AT_HUB",
  cancelled: "CANCELLED",
  transit: "IN_TRANSIT",
  returned: "RETURNED",
  collection: "READY_FOR_COLLECTION",
};
const CARGO_VIEW: Partial<Record<Filter, string>> = { delivered: "delivered", transit: "transit", out_for_delivery: "transit", failed: "transit", at_hub: "received", awaiting: "all", collection: "received" };

export async function searchPortal(user: CurrentUser, raw: string, locale: string): Promise<SearchResult> {
  const q = raw.trim().slice(0, 120);
  const t = getDict(locale);
  const p = t.partner;
  const base = `/${locale}/portal`;
  const has = (...perms: Permission[]) => perms.some((x) => user.permissions.has(x));
  const staffOrCorp = has("shipment.read.all", "shipment.read.own_account");
  const partner = has("partner.cargo.read");
  const result: SearchResult = { suggestions: [], groups: [], understood: [] };
  if (!q) return result;

  const it = interpret(q);
  let entity: Entity | undefined = it.entity ?? impliedEntity(it.filters);
  let filters = [...it.filters];
  // Context: "late" parcels are at risk, not overdue; vehicles "on the road" are on a trip.
  if ((entity === "shipments" || entity === "cargo") && filters.includes("overdue")) filters = filters.map((f) => (f === "overdue" ? "at_risk" : f));
  if (entity === "vehicles" && filters.includes("transit")) filters = filters.map((f) => (f === "transit" ? "on_trip" : f));
  if (entity === "shipments" && !staffOrCorp && partner) entity = "cargo";
  if (entity === "cargo" && !partner && staffOrCorp) entity = "shipments";
  if (!entity && it.place) entity = staffOrCorp ? "shipments" : partner ? "cargo" : undefined;

  const parts = (labels: (string | undefined)[]) => labels.filter(Boolean).join(" · ");
  const fLabel = (f: Filter) => t.search.filters[f] ?? f;
  const view = (label: string, href: string, hint = t.search.openView) => result.suggestions.push({ label, href, hint, kind: "view" });
  const act = (label: string, href: string) => result.suggestions.push({ label, href, hint: t.search.doAction, kind: "action" });

  /* ---- actions ---- */
  const actions: Record<string, [boolean, string, string]> = {
    new_shipment: [has("shipment.create"), t.nav.newShipment, `${base}/shipments/new`],
    new_invoice: [has("partner.finance.manage"), p.invoices.new, `${base}/invoices/new`],
    record_payment: [has("partner.finance.manage"), p.payments.record, `${base}/payments`],
    add_vehicle: [has("partner.vehicles.manage"), p.vehicles.add, `${base}/vehicles`],
    add_client: [has("partner.clients.manage"), p.clients.add, `${base}/clients`],
    new_role: [has("roles.manage", "team.manage"), t.roles.newRole, `${base}/settings/roles/new`],
    add_member: [has("users.manage", "team.manage"), t.roles.addMember, `${base}/settings/users`],
    track: [true, t.nav.track, `/${locale}/track`],
  };
  if (it.action) {
    const [ok, label, href] = actions[it.action];
    if (ok) act(label, href);
  }

  /* ---- filtered views ---- */
  if (entity === "shipments" && staffOrCorp) {
    const params = new URLSearchParams();
    const state = filters.map((f) => SHIP_STATE[f]).find(Boolean);
    if (state) params.set("state", state);
    if (filters.includes("at_risk")) params.set("risk", "1");
    if (it.place) params.set("q", it.place);
    view(parts([t.nav.shipments, ...filters.map(fLabel), it.place]), `${base}/shipments${params.size ? `?${params}` : ""}`);
  }
  if (entity === "cargo" && partner) {
    const params = new URLSearchParams({ tab: "all", view: filters.map((f) => CARGO_VIEW[f]).find(Boolean) ?? "all" });
    if (it.place) params.set("q", it.place);
    view(parts([p.nav.cargo, ...filters.map(fLabel), it.place]), `${base}/cargo?${params}`);
  }
  // A parcel agent's invoices (to the companies it bills) are on its Money page, open to everyone in the business.
  if (entity === "invoices" && has("agent.workspace") && user.accountId) {
    const status = filters.includes("overdue") ? "overdue" : filters.includes("paid") ? "paid" : filters.includes("unpaid") ? "open" : undefined;
    view(parts([t.agent.money.invoices, status ? t.agent.money[status] : undefined]), `${base}/money?tab=invoices${status ? `&status=${status}` : ""}`);
  } else if (entity === "invoices" && has("partner.finance.manage")) {
    const tab = filters.includes("overdue") ? "overdue" : filters.includes("paid") ? "paid" : filters.includes("unpaid") ? "open" : "all";
    view(parts([p.nav.invoices, tab !== "all" ? p.invoices.tabs[tab] : undefined]), `${base}/invoices?tab=${tab}`);
  }
  if (entity === "payments" && has("partner.finance.manage")) {
    const tab = filters.includes("unmatched") ? "unmatched" : "all";
    view(parts([p.nav.payments, p.payments.tabs[tab]]), `${base}/payments?tab=${tab}`);
  }
  if (entity === "vehicles" && partner) {
    const status = (["expired", "maintenance", "available", "on_trip"] as Filter[]).find((f) => filters.includes(f));
    view(parts([p.nav.vehicles, status ? fLabel(status) : undefined]), `${base}/vehicles?tab=all${status ? `&status=${status}` : ""}`);
  }
  if (entity === "clients" && has("partner.clients.manage")) view(p.nav.clients, `${base}/clients`);
  if (entity === "exceptions" && has("exception.manage")) view(t.nav.exceptions, `${base}/exceptions`);
  if (entity === "roles" && has("roles.manage", "team.manage")) view(t.nav.roles, `${base}/settings/roles`);
  if (entity === "team" && has("users.manage", "team.manage")) view(t.nav.team, `${base}/settings/users`);

  result.understood = [entity ? t.search.entities[entity] : undefined, ...filters.map(fLabel), it.place].filter(Boolean) as string[];

  /* ---- records ---- */
  // Look up records with whatever wasn't understood as a concept; fall back to the whole query.
  const term = (it.rest || (result.suggestions.length ? "" : q)).trim();
  const wb = normaliseWaybill(q).waybill;
  const lookups: Promise<void>[] = [];
  const add = (type: string, label: string, items: Hit[]) => {
    if (items.length) result.groups.push({ type, label, items });
  };

  if (isValidWaybill(wb) || (term.length >= 2 && (staffOrCorp || partner))) {
    lookups.push(
      (async () => {
        const where: (SQL | undefined)[] = [];
        if (has("shipment.read.all")) where.push(undefined);
        else if (partner && user.accountId) {
          where.push(eq(shipments.handlingPartnerId, user.accountId));
          if (user.branchId) where.push(eq(shipments.handlingBranchId, user.branchId));
        }
        else if (has("shipment.read.own_account") && user.accountId) where.push(eq(shipments.accountId, user.accountId));
        else return;
        const like = `%${term}%`;
        const digits = term.replace(/\D/g, "");
        const match = isValidWaybill(wb)
          ? eq(shipments.waybill, wb)
          : or(
              ilike(shipments.waybill, like),
              ilike(shipments.merchantRef, like),
              sql`${shipments.consignee}->>'name' ilike ${like}`,
              sql`similarity(${shipments.consignee}->>'name', ${term}) > 0.3`,
              ilike(shipments.goodsDescription, like),
              digits.length >= 6 ? sql`${shipments.consignee}->>'phone' like ${"%" + digits.slice(-9) + "%"}` : undefined,
            );
        const rows = await db
          .select({ waybill: shipments.waybill, state: shipments.state, consignee: shipments.consignee, goods: shipments.goodsDescription })
          .from(shipments)
          .where(and(where[0], match))
          .orderBy(desc(shipments.updatedAt))
          .limit(6);
        add(
          "shipments",
          partner && !staffOrCorp ? p.nav.cargo : t.nav.shipments,
          rows.map((r) => ({
            title: r.waybill,
            subtitle: `${r.consignee.name} · ${r.consignee.address.region} · ${r.goods}`,
            badge: t.states[r.state],
            href: `${base}/shipments/${r.waybill}`,
          })),
        );
      })(),
    );
  }

  if (term.length >= 2 && partner && user.accountId) {
    const acc = user.accountId;
    const like = `%${term}%`;
    if (has("partner.clients.manage")) {
      lookups.push(
        db
          .select({ id: partnerClients.id, name: partnerClients.name, contact: partnerClients.contactName, region: partnerClients.region })
          .from(partnerClients)
          .where(and(eq(partnerClients.partnerAccountId, acc), or(ilike(partnerClients.name, like), ilike(partnerClients.contactName, like), sql`similarity(${partnerClients.name}, ${term}) > 0.25`)))
          .orderBy(sql`similarity(${partnerClients.name}, ${term}) desc`)
          .limit(5)
          .then((rows) => add("clients", p.nav.clients, rows.map((r) => ({ title: r.name, subtitle: [r.contact, r.region].filter(Boolean).join(" · "), href: `${base}/clients` })))),
      );
    }
    lookups.push(
      db
        .select({ plate: vehicles.plate, make: vehicles.make, driver: vehicles.driverName, status: vehicles.status })
        .from(vehicles)
        .where(and(eq(vehicles.accountId, acc), user.branchId ? eq(vehicles.branchId, user.branchId) : undefined, or(ilike(vehicles.plate, like), ilike(sql`replace(${vehicles.plate}, ' ', '')`, `%${term.replace(/\s/g, "")}%`), ilike(vehicles.driverName, like), ilike(vehicles.make, like))))
        .limit(5)
        .then((rows) => add("vehicles", p.nav.vehicles, rows.map((r) => ({ title: r.plate, subtitle: [r.make, r.driver].filter(Boolean).join(" · "), badge: p.vehicles.statuses[r.status], href: `${base}/vehicles?tab=all&q=${encodeURIComponent(r.plate)}` })))),
    );
    if (has("partner.finance.manage")) {
      lookups.push(
        db
          .select({ number: partnerInvoices.number, status: partnerInvoices.status, total: partnerInvoices.total, client: partnerClients.name })
          .from(partnerInvoices)
          .innerJoin(partnerClients, eq(partnerClients.id, partnerInvoices.clientId))
          .where(and(eq(partnerInvoices.partnerAccountId, acc), or(ilike(partnerInvoices.number, like), ilike(partnerClients.name, like), sql`similarity(${partnerClients.name}, ${term}) > 0.25`)))
          .orderBy(desc(partnerInvoices.issueDate))
          .limit(5)
          .then((rows) => add("invoices", p.nav.invoices, rows.map((r) => ({ title: r.number, subtitle: `${r.client} · TZS ${r.total.toLocaleString("en-US")}`, badge: p.invoices.statuses[r.status], href: `${base}/invoices?tab=all` })))),
        db
          .select({ ref: partnerPayments.reference, amount: partnerPayments.amount, invoiceId: partnerPayments.invoiceId })
          .from(partnerPayments)
          .where(and(eq(partnerPayments.partnerAccountId, acc), ilike(partnerPayments.reference, like)))
          .limit(5)
          .then((rows) =>
            add("payments", p.nav.payments, rows.map((r) => ({ title: r.ref ?? "—", subtitle: `TZS ${r.amount.toLocaleString("en-US")}`, badge: r.invoiceId ? undefined : p.payments.tabs.unmatched, href: `${base}/payments?tab=${r.invoiceId ? "all" : "unmatched"}` }))),
          ),
      );
    }
  }

  if (term.length >= 2 && has("users.manage", "team.manage")) {
    const like = `%${term}%`;
    const scoped = has("users.manage") ? undefined : user.accountId ? eq(users.accountId, user.accountId) : sql`false`;
    lookups.push(
      db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(and(scoped, or(ilike(users.name, like), ilike(users.email, like), sql`similarity(${users.name}, ${term}) > 0.3`)))
        .limit(5)
        .then((rows) => add("people", t.nav.team, rows.map((r) => ({ title: r.name, subtitle: r.email ?? undefined, href: `${base}/settings/users` })))),
    );
  }
  if (term.length >= 2 && has("roles.manage", "team.manage")) {
    const like = `%${term}%`;
    const scoped = has("roles.manage") ? undefined : user.accountId ? or(eq(roles.accountId, user.accountId), and(isNull(roles.accountId), eq(roles.surface, "partner"))) : sql`false`;
    lookups.push(
      db
        .select({ key: roles.key, name: roles.name })
        .from(roles)
        .where(and(scoped, or(ilike(roles.name, like), ilike(roles.key, like))))
        .limit(5)
        .then((rows) => add("roles", t.nav.roles, rows.map((r) => ({ title: r.name, subtitle: r.key, href: `${base}/settings/roles/${r.key}` })))),
    );
  }

  await Promise.all(lookups);
  const order = ["shipments", "clients", "invoices", "payments", "vehicles", "people", "roles"];
  result.groups.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return result;
}

