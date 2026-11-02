/**
 * Roles and permissions.
 *
 * - PERMISSIONS is a catalog fixed in code: each one guards a piece of code, so a new permission
 *   always ships with the feature it protects.
 * - Roles are DATA (tables `roles` and `role_permissions`). Admins create roles and grant permissions
 *   in the console. Ondi sends role keys as claims (FR-IDN-02) and Tuma resolves them to permissions.
 * - DEFAULT_ROLES seeds the 14 roles of SRS section 3. They are editable after seeding.
 *
 * Open question Q2 (does Ondi own authorization?) — if yes, the role tables become a synced copy.
 */

export type PermissionDef = { key: string; group: string; label: string; description: string };

export const PERMISSIONS = [
  // Shipments
  { key: "shipment.create", group: "Shipments", label: "Create shipments", description: "Create single orders and quotes." },
  { key: "shipment.bulk_upload", group: "Shipments", label: "Bulk upload", description: "Create orders from CSV or XLSX." },
  { key: "shipment.read.own_account", group: "Shipments", label: "View own account's shipments", description: "Scoped to the user's account." },
  { key: "shipment.read.all", group: "Shipments", label: "View all shipments", description: "Across every account (staff)." },
  { key: "shipment.edit_consignee", group: "Shipments", label: "Edit consignee details", description: "Until out for delivery (FR-WB-06)." },
  { key: "shipment.cancel", group: "Shipments", label: "Cancel shipments", description: "Fee applies after first handover." },
  { key: "shipment.bulk_action", group: "Shipments", label: "Bulk actions", description: "Hold, release, reassign or cancel a selection." },
  { key: "label.print", group: "Shipments", label: "Print waybills and labels", description: "Every reprint is counted and logged." },
  // Lifecycle — each guards setting one or more states (FR-WB-04)
  { key: "shipment.receive", group: "Lifecycle", label: "Receive at handover", description: "Set RECEIVED." },
  { key: "shipment.hub_scan", group: "Lifecycle", label: "Hub scans", description: "Set AT_HUB and RETURNED at a hub." },
  { key: "shipment.dispatch", group: "Lifecycle", label: "Dispatch", description: "Set IN_TRANSIT and OUT_FOR_DELIVERY." },
  { key: "shipment.deliver", group: "Lifecycle", label: "Confirm delivery", description: "Set DELIVERED with proof of delivery." },
  { key: "shipment.fail_attempt", group: "Lifecycle", label: "Record failed attempt", description: "Set ATTEMPT_FAILED with a reason code." },
  { key: "shipment.collection", group: "Lifecycle", label: "Wakala collection", description: "Set READY_FOR_COLLECTION." },
  { key: "shipment.return", group: "Lifecycle", label: "Start return", description: "Set RETURNING and RETURNED." },
  { key: "shipment.override", group: "Lifecycle", label: "Manual override", description: "Correct a status from the console. Needs a reason code." },
  // Operations
  { key: "exception.manage", group: "Operations", label: "Manage exceptions", description: "Raise, assign and resolve exceptions." },
  { key: "dispatch.manage", group: "Operations", label: "Dispatch board", description: "Assign tasks to riders." },
  // Money and reports
  { key: "cod.read", group: "Finance and reports", label: "View COD", description: "COD due, collected and remitted." },
  { key: "report.view", group: "Finance and reports", label: "View reports", description: "Scoped by account and role (FR-RPT-06)." },
  { key: "report.export", group: "Finance and reports", label: "Export reports", description: "CSV and XLSX. Exports are logged." },
  // Administration
  { key: "roles.manage", group: "Administration", label: "Manage roles", description: "Create roles and grant permissions." },
  { key: "users.manage", group: "Administration", label: "Manage user roles", description: "Assign roles to users." },
  { key: "settings.manage", group: "Administration", label: "Platform settings", description: "Service levels, zones, reason codes (FR-PLT-08)." },
  { key: "audit.read", group: "Administration", label: "View audit log", description: "Read the tamper-evident audit trail." },
  { key: "api_keys.manage", group: "Administration", label: "API keys and webhooks", description: "Merchant integration credentials." },
  { key: "dev.simulate", group: "Administration", label: "Simulate field events", description: "Development only, until the field app exists." },
  // Partners (warehouses, freight forwarders, parcel companies, transporters)
  { key: "partner.cargo.read", group: "Partner", label: "View handled cargo", description: "Shipments assigned to the partner's own company." },
  { key: "partner.cargo.operate", group: "Partner", label: "Handle cargo", description: "Receive, load onto vehicles, dispatch and deliver." },
  { key: "partner.branches.manage", group: "Partner", label: "Manage branches", description: "Add and edit the company's branches and who works at each." },
  { key: "partner.vehicles.manage", group: "Partner", label: "Manage vehicles", description: "Add and edit the partner's fleet and drivers." },
  { key: "partner.clients.manage", group: "Partner", label: "Manage clients", description: "The partner's own customer book." },
  { key: "partner.finance.manage", group: "Partner", label: "Invoices and payments", description: "Invoice clients, record payments, reconcile." },
  { key: "team.manage", group: "Partner", label: "Manage team and roles", description: "Create roles for your own company and assign them to your team." },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]["key"];
export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as Permission[];

export function isPermission(x: string): x is Permission {
  return (PERMISSION_KEYS as string[]).includes(x);
}

/** A role key as it appears in an Ondi claim. Free-form so admins can create new ones. */
export type RoleKey = string;
export type Surface = "portal" | "console" | "partner" | "field" | "api";

export type RoleSeed = {
  key: RoleKey;
  name: string;
  description: string;
  surface: Surface;
  permissions: Permission[];
};

const LIFECYCLE_ALL: Permission[] = [
  "shipment.receive",
  "shipment.hub_scan",
  "shipment.dispatch",
  "shipment.deliver",
  "shipment.fail_attempt",
  "shipment.collection",
  "shipment.return",
];

/** SRS section 3 defaults. Seeded once; admins edit them afterwards. */
export const DEFAULT_ROLES: RoleSeed[] = [
  {
    key: "merchant_user",
    name: "Merchant user",
    description: "E-commerce seller, SME or enterprise shipper.",
    surface: "portal",
    permissions: ["shipment.create", "shipment.bulk_upload", "shipment.read.own_account", "shipment.edit_consignee", "shipment.cancel", "label.print", "cod.read", "report.view", "report.export"],
  },
  {
    key: "cargo_shipper",
    name: "Cargo shipper",
    description: "Manufacturer, trader or importer booking vehicle capacity.",
    surface: "portal",
    permissions: ["shipment.create", "shipment.read.own_account", "shipment.cancel", "label.print", "report.view", "report.export"],
  },
  { key: "integrator", name: "Integrator", description: "Merchant developer or partner.", surface: "portal", permissions: ["shipment.read.own_account", "api_keys.manage"] },
  { key: "wakala_agent", name: "Wakala agent", description: "Retail drop and pickup point.", surface: "field", permissions: ["shipment.create", "shipment.receive", "shipment.collection", "shipment.deliver", "label.print"] },
  { key: "rider", name: "Rider", description: "Last-mile courier.", surface: "field", permissions: ["shipment.receive", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "shipment.return"] },
  { key: "truck_driver", name: "Truck driver", description: "Cargo driver.", surface: "field", permissions: ["shipment.dispatch", "shipment.deliver"] },
  { key: "carrier_partner", name: "Carrier partner", description: "3PL or transporter.", surface: "api", permissions: ["shipment.dispatch", "shipment.deliver", "shipment.fail_attempt"] },
  {
    key: "dispatcher",
    name: "Dispatcher",
    description: "Assigns tasks and vehicles.",
    surface: "console",
    permissions: ["shipment.read.all", "shipment.dispatch", "shipment.cancel", "shipment.bulk_action", "dispatch.manage", "label.print", "report.view"],
  },
  { key: "hub_operator", name: "Hub operator", description: "Sort centre or warehouse staff.", surface: "console", permissions: ["shipment.read.all", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.return", "label.print"] },
  {
    key: "control_tower",
    name: "Control tower operator",
    description: "Watches SLAs and manages exceptions.",
    surface: "console",
    permissions: ["shipment.read.all", ...LIFECYCLE_ALL, "shipment.override", "shipment.edit_consignee", "shipment.cancel", "shipment.bulk_action", "exception.manage", "dispatch.manage", "cod.read", "report.view", "report.export", "label.print", "dev.simulate"],
  },
  { key: "service_agent", name: "Service agent", description: "Bliss user handling customer cases.", surface: "console", permissions: ["shipment.read.all", "exception.manage"] },
  { key: "finance_officer", name: "Finance officer", description: "Reviews billable events and COD.", surface: "console", permissions: ["shipment.read.all", "cod.read", "report.view", "report.export"] },
  { key: "account_manager", name: "Account manager", description: "Follows merchant performance.", surface: "console", permissions: ["shipment.read.all", "report.view", "report.export"] },
  {
    key: "partner_admin",
    name: "Partner admin",
    description: "Runs a partner company on Tuma: cargo, fleet, clients and finance.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.cargo.operate", "partner.branches.manage", "partner.vehicles.manage", "partner.clients.manage", "partner.finance.manage", "team.manage", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "label.print"],
  },
  {
    key: "partner_ops",
    name: "Partner operations",
    description: "Warehouse and dispatch staff at a partner.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.cargo.operate", "partner.vehicles.manage", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "label.print"],
  },
  {
    key: "partner_finance",
    name: "Partner finance",
    description: "Invoices clients and reconciles payments for a partner.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.clients.manage", "partner.finance.manage"],
  },
  {
    key: "tuma_admin",
    name: "Tuma admin",
    description: "Platform administrator.",
    surface: "console",
    permissions: [...PERMISSION_KEYS],
  },
];

/**
 * Permissions a partner may grant in roles it creates for its own company. Platform-wide permissions
 * (read every shipment, settings, platform roles) can only be granted by Tuma.
 */
export const PARTNER_GRANTABLE: Permission[] = [
  "partner.cargo.read",
  "partner.cargo.operate",
  "partner.branches.manage",
  "partner.vehicles.manage",
  "partner.clients.manage",
  "partner.finance.manage",
  "team.manage",
  "shipment.receive",
  "shipment.hub_scan",
  "shipment.dispatch",
  "shipment.deliver",
  "shipment.fail_attempt",
  "shipment.collection",
  "shipment.return",
  "label.print",
];

/** Which surfaces a resolved permission set opens. */
export function canUsePortal(perms: ReadonlySet<Permission>): boolean {
  return perms.has("shipment.read.own_account");
}
export function canUsePartner(perms: ReadonlySet<Permission>): boolean {
  return perms.has("partner.cargo.read");
}
export function canUseConsole(perms: ReadonlySet<Permission>): boolean {
  return perms.has("shipment.read.all");
}
