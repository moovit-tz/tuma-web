import { AppShell, type ShellNavItem } from "@/components/shell/app-shell";
import { PortalSearch } from "@/components/search/portal-search";
import { getDict } from "@/i18n";

/** Authenticated pages re-check the user on every request (FR-IDN-03). */
export const instant = false;

/**
 * The single Tuma portal. Tuma Staff, Corp (businesses that send) and Partners (warehouses, forwarders,
 * parcel companies, transporters) all use it; the menu, quick actions and every page follow the user's permissions.
 */
export default async function PortalLayout({ children, params }: LayoutProps<"/[locale]/portal">) {
  const { locale } = await params;
  const t = getDict(locale);
  const p = t.partner;
  const base = `/${locale}/portal`;
  const nav: ShellNavItem[] = [
    { href: base, label: t.nav.dashboard, icon: "dashboard", exact: true },
    { href: `${base}/shipments`, label: t.nav.shipments, icon: "shipments", permission: ["shipment.read.own_account", "shipment.read.all"], unless: "agent.workspace", group: t.nav.shipping },
    { href: `${base}/shipments/new`, label: t.nav.newShipment, icon: "new", permission: "shipment.create", unless: "agent.workspace", group: t.nav.shipping },
    { href: `${base}/exceptions`, label: t.nav.exceptions, icon: "exceptions", permission: "exception.manage", unless: "agent.workspace", group: t.nav.shipping },
    { href: `${base}/parcels`, label: t.agent.nav.parcels, icon: "cargo", permission: "agent.workspace", group: p.nav.operations },
    { href: `${base}/manifests`, label: t.agent.mf.nav, icon: "manifests", permission: "agent.workspace", group: p.nav.operations },
    { href: `${base}/notifications`, label: t.agent.notif.nav, icon: "notifications", permission: "agent.workspace", group: p.nav.operations },
    { href: `${base}/dispatch`, label: t.dispatch.title, icon: "dispatch", permission: ["dispatch.manage", "partner.dispatch.manage"], group: p.nav.operations },
    { href: `${base}/drivers`, label: t.drivers.title, icon: "drivers", permission: ["drivers.manage", "partner.dispatch.manage"], group: p.nav.operations },
    { href: `${base}/cargo`, label: p.cargo.title, icon: "cargo", permission: "partner.cargo.read", unless: "agent.workspace", group: p.nav.operations },
    { href: `${base}/branches`, label: t.branches.title, icon: "branches", permission: ["partner.cargo.read", "partner.branches.manage"], group: p.nav.operations },
    { href: `${base}/vehicles`, label: p.nav.vehicles, icon: "vehicles", permission: "partner.cargo.read", unless: "agent.workspace", group: p.nav.operations },
    { href: `${base}/customers`, label: t.agent.cust.nav, icon: "clients", permission: "agent.workspace", group: p.nav.crm },
    { href: `${base}/clients`, label: p.nav.clients, icon: "clients", permission: "partner.clients.manage", unless: "agent.workspace", group: p.nav.crm },
    { href: `${base}/money`, label: t.agent.money.nav, icon: "payments", permission: "agent.workspace", group: p.nav.finance },
    { href: `${base}/invoices`, label: p.nav.invoices, icon: "invoices", permission: "partner.finance.manage", unless: "agent.workspace", group: p.nav.finance },
    { href: `${base}/payments`, label: p.nav.payments, icon: "payments", permission: "partner.finance.manage", unless: "agent.workspace", group: p.nav.finance },
    { href: `${base}/reports`, label: t.agent.rep.nav, icon: "reports", permission: "agent.workspace", also: "report.view", group: p.nav.finance },
    { href: `${base}/admin/tower`, label: t.admin.nav.tower, icon: "tower", permission: "tower.view", group: t.admin.nav.group },
    { href: `${base}/admin/support`, label: t.admin.nav.support, icon: "support", permission: "support.view", group: t.admin.nav.group },
    { href: `${base}/admin/finance`, label: t.admin.nav.finance, icon: "finance", permission: "finance.view", group: t.admin.nav.group },
    { href: `${base}/admin/approvals`, label: t.admin.nav.approvals, icon: "roles", permission: ["approvals.decide", "users.manage", "finance.reconcile"], group: t.admin.nav.group },
    { href: `${base}/admin/access`, label: t.admin.nav.access, icon: "access", permission: "access.review", group: t.admin.nav.group },
    { href: `${base}/admin/claims`, label: t.staff.nav.claims, icon: "claims", permission: "claims.handle", group: t.admin.nav.group },
    { href: `${base}/admin/risk`, label: t.staff.nav.risk, icon: "risk", permission: "risk.view", group: t.admin.nav.group },
    { href: `${base}/admin/compliance`, label: t.staff.nav.compliance, icon: "compliance", permission: ["kyc.review", "aml.screen", "dsr.handle"], group: t.admin.nav.group },
    { href: `${base}/admin/payouts`, label: t.staff.nav.payouts, icon: "payouts", permission: ["payout.propose", "finance.view"], group: t.admin.nav.group },
    { href: `${base}/admin/grants`, label: t.staff.nav.grants, icon: "grants", permission: "roles.manage", group: t.admin.nav.group },
    { href: `${base}/admin/breakglass`, label: t.staff.nav.breakglass, icon: "breakglass", permission: ["breakglass.request", "access.review"], group: t.admin.nav.group },
    { href: `${base}/settings/roles`, label: t.nav.roles, icon: "roles", permission: ["roles.manage", "team.manage"], group: t.nav.settingsGroup },
    { href: `${base}/settings/users`, label: t.nav.team, icon: "users", permission: ["users.manage", "team.manage"], group: t.nav.settingsGroup },
    { href: `${base}/settings/business`, label: t.agent.biz.nav, icon: "settings", permission: "agent.workspace", group: t.nav.settingsGroup },
    { href: `${base}/settings/platform`, label: t.platformSettings.title, icon: "settings", permission: "settings.manage", group: t.nav.settingsGroup },
  ];
  return (
    <AppShell
      locale={locale}
      nav={nav}
      systemGroup={t.nav.settingsGroup}
      quickActions={[
        { key: "bookParcel", href: `${base}/parcels/new`, permission: "agent.workspace" },
        { key: "newShipment", href: `${base}/shipments/new`, permission: "shipment.create", unless: "agent.workspace" },
        { key: "exceptions", href: `${base}/exceptions`, permission: "exception.manage", unless: "agent.workspace" },
        { key: "cargo", href: `${base}/cargo?tab=all&view=received`, permission: "partner.cargo.read", unless: "agent.workspace" },
        { key: "vehicles", href: `${base}/vehicles`, permission: "partner.vehicles.manage" },
        { key: "newInvoice", href: `${base}/invoices/new`, permission: "partner.finance.manage" },
        { key: "payments", href: `${base}/payments`, permission: "partner.finance.manage" },
        { key: "clients", href: `${base}/clients`, permission: "partner.clients.manage" },
        { key: "team", href: `${base}/settings/users`, permission: ["users.manage", "team.manage"] },
        { key: "roles", href: `${base}/settings/roles`, permission: ["roles.manage", "team.manage"] },
      ]}
      gate={["shipment.read.own_account", "shipment.read.all", "tower.view", "support.view", "finance.view", "access.review", "approvals.decide", "breakglass.request", "claims.handle", "risk.view", "kyc.review", "aml.screen", "dsr.handle", "payout.propose", "partner.cargo.read", "team.manage", "partner.branches.manage"]}
      search={<PortalSearch />}
    >
      {children}
    </AppShell>
  );
}
