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
  { key: "dispatch.manage", group: "Operations", label: "Dispatch board", description: "Create jobs for Tuma's drivers and follow them." },
  { key: "drivers.manage", group: "Operations", label: "Manage drivers", description: "Approve, suspend and review Tuma-X drivers." },
  // Field app
  { key: "driver.jobs", group: "Field app", label: "Take jobs in Tuma-X", description: "Go online, accept jobs and report progress from the driver app." },
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
  { key: "partner.dispatch.manage", group: "Partner", label: "Dispatch to drivers", description: "Create jobs for the company's own drivers, approve drivers and follow their runs." },
  { key: "corporate.send", group: "Company", label: "Send for the company", description: "Book parcels in the company's name, pay on its account, and follow the ones you sent." },
  { key: "corporate.manage", group: "Company", label: "Manage the company", description: "See every parcel sent on the company's account; manage staff, departments, policies, the company wallet, invoices and reports." },
  { key: "team.manage", group: "Partner", label: "Manage team and roles", description: "Create roles for your own company and assign them to your team." },
  // Parcel agents (self-onboarded through KYB in the Tuma app)
  { key: "agent.workspace", group: "Parcel agent", label: "Agent workspace", description: "Open the agent dashboard and parcel operations in the Tuma app." },
  { key: "agent.wallet.manage", group: "Parcel agent", label: "Float wallet", description: "Top up the float that pays Tuma's commission, and see its statement." },
  { key: "agent.workflow.manage", group: "Parcel agent", label: "Operations workflow", description: "Choose which steps (receive, dispatch, offload, deliver) the office runs." },
  { key: "kyb.review", group: "Administration", label: "Review business applications", description: "Follow KYB applications and their ComplyOS decisions." },
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
  { key: "rider", name: "Rider", description: "Last-mile courier.", surface: "field", permissions: ["driver.jobs", "shipment.receive", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "shipment.return"] },
  { key: "truck_driver", name: "Truck driver", description: "Cargo driver.", surface: "field", permissions: ["driver.jobs", "shipment.receive", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt"] },
  { key: "carrier_partner", name: "Carrier partner", description: "3PL or transporter.", surface: "api", permissions: ["shipment.dispatch", "shipment.deliver", "shipment.fail_attempt"] },
  {
    key: "dispatcher",
    name: "Dispatcher",
    description: "Assigns tasks and vehicles.",
    surface: "console",
    permissions: ["shipment.read.all", "shipment.dispatch", "shipment.cancel", "shipment.bulk_action", "dispatch.manage", "drivers.manage", "label.print", "report.view"],
  },
  { key: "hub_operator", name: "Hub operator", description: "Sort centre or warehouse staff.", surface: "console", permissions: ["shipment.read.all", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.return", "label.print"] },
  {
    key: "control_tower",
    name: "Control tower operator",
    description: "Watches SLAs and manages exceptions.",
    surface: "console",
    permissions: ["shipment.read.all", ...LIFECYCLE_ALL, "shipment.override", "shipment.edit_consignee", "shipment.cancel", "shipment.bulk_action", "exception.manage", "dispatch.manage", "drivers.manage", "cod.read", "report.view", "report.export", "label.print", "dev.simulate"],
  },
  { key: "service_agent", name: "Service agent", description: "Bliss user handling customer cases.", surface: "console", permissions: ["shipment.read.all", "exception.manage"] },
  { key: "finance_officer", name: "Finance officer", description: "Reviews billable events and COD.", surface: "console", permissions: ["shipment.read.all", "cod.read", "report.view", "report.export"] },
  { key: "account_manager", name: "Account manager", description: "Follows merchant performance.", surface: "console", permissions: ["shipment.read.all", "report.view", "report.export"] },
  {
    key: "partner_admin",
    name: "Partner admin",
    description: "Runs a partner company on Tuma: cargo, fleet, clients and finance.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.cargo.operate", "partner.branches.manage", "partner.vehicles.manage", "partner.clients.manage", "partner.finance.manage", "partner.dispatch.manage", "team.manage", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "label.print"],
  },
  {
    key: "partner_ops",
    name: "Partner operations",
    description: "Warehouse and dispatch staff at a partner.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.cargo.operate", "partner.vehicles.manage", "partner.dispatch.manage", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "label.print"],
  },
  {
    key: "partner_finance",
    name: "Partner finance",
    description: "Invoices clients and reconciles payments for a partner.",
    surface: "partner",
    permissions: ["partner.cargo.read", "partner.clients.manage", "partner.finance.manage"],
  },
  {
    key: "parcel_agent",
    name: "Parcel agent",
    description: "Owner of a self-onboarded parcel agent office: parcel operations, float wallet, invoices and customers.",
    surface: "field",
    permissions: ["agent.workspace", "agent.wallet.manage", "agent.workflow.manage", "team.manage", "partner.branches.manage", "partner.cargo.read", "partner.cargo.operate", "partner.clients.manage", "partner.finance.manage", "shipment.create", "shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.collection", "shipment.deliver", "shipment.fail_attempt", "shipment.cancel", "label.print", "report.view"],
  },
  {
    key: "corporate_admin",
    name: "Company admin",
    description: "Runs a company's sending on Tuma: sees all its parcels, manages its staff, departments, policies, wallet and invoices, and sees its reports.",
    surface: "partner",
    permissions: ["corporate.send", "corporate.manage", "team.manage", "report.view"],
  },
  {
    key: "corporate_sender",
    name: "Company sender",
    description: "Books parcels in the company's name and follows the company's parcels.",
    surface: "partner",
    permissions: ["corporate.send"],
  },
  {
    key: "agent_staff",
    name: "Office staff",
    description: "Works the counter at a parcel agent office: receives, hands over and sends on parcels.",
    surface: "partner",
    permissions: ["agent.workspace", "partner.cargo.read", "partner.cargo.operate", "shipment.create", "shipment.receive", "shipment.collection", "shipment.deliver", "shipment.fail_attempt", "label.print"],
  },
  {
    key: "agent_rider",
    name: "Courier / rider / driver",
    description: "Carries parcels for a parcel agent: picks them up, takes them on and delivers to the door.",
    surface: "partner",
    permissions: ["agent.workspace", "partner.cargo.read", "partner.cargo.operate", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "shipment.return"],
  },
  {
    key: "agent_storekeeper",
    name: "Store keeper",
    description: "Looks after the parcels kept at a parcel agent office: checks them in, keeps them and gets them ready for collection.",
    surface: "partner",
    permissions: ["agent.workspace", "partner.cargo.read", "partner.cargo.operate", "shipment.receive", "shipment.hub_scan", "shipment.collection", "label.print"],
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
  "partner.dispatch.manage",
  "team.manage",
  "shipment.receive",
  "shipment.hub_scan",
  "shipment.dispatch",
  "shipment.deliver",
  "shipment.fail_attempt",
  "shipment.collection",
  "shipment.return",
  "shipment.create",
  "label.print",
  "agent.workspace",
  "report.view",
];

/**
 * What a business may do while its application is still being reviewed: build its team and roles, add offices and
 * clients, and look at reports. Everything that moves parcels or money waits for approval. Applied to every person
 * in the company, whatever their roles grant (src/server/rbac.ts).
 */
export const SETUP_PERMISSIONS: Permission[] = ["team.manage", "partner.branches.manage", "partner.clients.manage", "report.view", "corporate.manage"];

/**
 * While under review a business may also handle a limited number of parcels (the pendingParcelAllowance setting).
 * Each person keeps only the ones their own roles give, and the app opens the agent home. Finance, wallet and
 * dispatch wait for approval.
 */
export const TRIAL_PERMISSIONS: Permission[] = [
  "agent.workspace",
  "shipment.create",
  "shipment.receive",
  "shipment.collection",
  "shipment.deliver",
  "shipment.fail_attempt",
  "partner.cargo.read",
  "partner.cargo.operate",
  "label.print",
  // A company under review sends on its account up to its own allowance (pendingCompanyParcelAllowance).
  "corporate.send",
];
/** The ones that take in a new parcel. They close when the allowance is used up; parcels in hand can still be finished. */
export const TRIAL_INTAKE: Permission[] = ["shipment.create", "shipment.receive"];

/** Can set up a business that is waiting for approval. */
export function canSetUp(perms: ReadonlySet<Permission>): boolean {
  return perms.has("team.manage") || perms.has("partner.branches.manage");
}

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

/** The kinds of staff a parcel agent adds in the app, in the order they're offered. "Other" is a role the owner makes. */
export const AGENT_STAFF_ROLES = ["agent_staff", "agent_rider", "agent_storekeeper"] as const;

/**
 * What the owner of a parcel agent can give a custom staff role ("Other"), grouped for the app. The workspace itself
 * is always included; running the team stays with the owner.
 */
export const AGENT_CUSTOM_GRANTABLE: Permission[] = [
  "shipment.create",
  "shipment.receive",
  "shipment.collection",
  "shipment.deliver",
  "shipment.fail_attempt",
  "shipment.dispatch",
  "shipment.return",
  "shipment.hub_scan",
  "label.print",
  "partner.clients.manage",
  "partner.finance.manage",
  "partner.branches.manage",
  "report.view",
];
