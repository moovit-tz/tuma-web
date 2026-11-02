/**
 * Tuma data model — SRS sections 4.3 (waybill fields), 7.1 (event model), 10.1 (key entities).
 *
 * Conventions
 * - Money is integer TZS (no minor unit). Weights are integer grams. Lengths are integer cm.
 * - Timestamps are stored as timestamptz (UTC) and displayed in Africa/Dar_es_Salaam (FR-PLT-06).
 * - accounts and users are *snapshots* of CRM and Ondi records; those systems stay the system of record.
 */
import { sql } from "drizzle-orm";
import type { AppLocale, ChargeLine } from "../../domain/types";
import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type { ChargeLine };

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ------------------------------------------------------------------ enums */

/**
 * User groups: internal = Tuma Staff · merchant/shipper = Corp (businesses that send) ·
 * partner = Partners (warehouses, freight forwarders, parcel companies, transporters). "carrier" is legacy.
 */
export const accountType = pgEnum("account_type", ["merchant", "shipper", "carrier", "internal", "partner"]);
export const partnerKind = pgEnum("partner_kind", ["warehouse", "freight_forwarder", "parcel_company", "transporter"]);
export const accountStatus = pgEnum("account_status", ["active", "suspended", "closed"]);
export const waybillType = pgEnum("waybill_type", ["parcel", "cargo"]);
export const shipmentState = pgEnum("shipment_state", [
  "DRAFT",
  "CREATED",
  "AWAITING_HANDOVER",
  "RECEIVED",
  "AT_HUB",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "ATTEMPT_FAILED",
  "READY_FOR_COLLECTION",
  "DELIVERED",
  "RETURNING",
  "RETURNED",
  "REQUESTED",
  "QUOTED",
  "BOOKED",
  "ALLOCATED",
  "LOADING",
  "AT_CHECKPOINT",
  "ARRIVED",
  "OFFLOADING",
  "CLOSED",
  "DISPUTED",
  "CANCELLED",
]);
export const serviceLevel = pgEnum("service_level", ["same_day", "next_day", "standard"]);
/**
 * Who pays the delivery charge. "pay_on_delivery" = the receiver pays it at the door or Wakala point.
 * "cod" is legacy (before COD became a separate amount); cargo uses to_pay and advance_balance.
 */
export const paymentTerms = pgEnum("payment_terms", ["prepaid", "account", "pay_on_delivery", "cod", "to_pay", "advance_balance"]);
export const handoverMode = pgEnum("handover_mode", ["pickup", "wakala_dropoff", "hub_bulk"]);
export const deliveryMode = pgEnum("delivery_mode", ["door", "wakala_collect"]);
export const locationType = pgEnum("location_type", ["hub", "wakala", "yard"]);
export const eventSource = pgEnum("event_source", [
  "scan",
  "field_app",
  "telematics",
  "partner_api",
  "system",
  "manual",
  "portal",
  "api",
]);
export const exceptionStatus = pgEnum("exception_status", ["open", "assigned", "resolved"]);
export const codStatus = pgEnum("cod_status", ["due", "collected", "deposited", "remitted", "disputed", "none"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "failed"]);

/* ------------------------------------------------------- reference data */

/** Snapshot of the CRM account master (FR-CRM-01/02). Created in CRM only. */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(), // CRM account ID
  type: accountType("type").notNull(),
  partnerKind: partnerKind("partner_kind"),
  name: text("name").notNull(),
  tin: text("tin"),
  status: accountStatus("status").notNull().default("active"),
  /** Contract terms pulled from CRM. */
  allowedServiceLevels: jsonb("allowed_service_levels").$type<string[]>().notNull().default(["standard", "next_day"]),
  rateCardRef: text("rate_card_ref"),
  paymentPolicy: text("payment_policy").notNull().default("warn"), // warn | block (FR-FIN-03)
  podPolicy: text("pod_policy").notNull().default("otp_or_signature"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
});

/**
 * Roles are data: admins create them and grant permissions from the code catalog
 * (src/domain/roles.ts). Ondi role claims are matched to roles by key.
 */
export const roles = pgTable("roles", {
  key: text("key").primaryKey(), // matches the Ondi role claim, e.g. "merchant_user"
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  surface: text("surface").notNull(), // portal | console | field | api
  system: boolean("system").notNull().default(false), // seeded from SRS section 3; cannot be deleted
  /** null = platform role (managed by Tuma). Set = a role a partner created for its own company. */
  accountId: text("account_id"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade", onUpdate: "cascade" }),
    permission: text("permission").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permission] })],
);

/** Snapshot of the Ondi identity. Tuma keeps no passwords (FR-IDN-02). */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Ondi subject
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  accountId: text("account_id").references(() => accounts.id),
  /** Set when the person works at one branch: they then see only that branch's cargo and vehicles. */
  branchId: uuid("branch_id"),
  /** Role keys from the Ondi claim. While Ondi is stubbed, admins assign them in the console. */
  roles: jsonb("roles").$type<string[]>().notNull(),
  scope: jsonb("scope").$type<{ region?: string; hubId?: string; wakalaId?: string }>().notNull().default({}),
  locale: text("locale").notNull().default("en"),
  timeZone: text("time_zone").notNull().default("Africa/Dar_es_Salaam"),
  active: boolean("active").notNull().default(true),
  lastSeenAt: ts("last_seen_at"),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(), // e.g. DAR-ILA-01
  type: locationType("type").notNull(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  district: text("district").notNull(),
  ward: text("ward"),
  street: text("street"),
  landmark: text("landmark"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  phone: text("phone"),
  hours: text("hours"),
  active: boolean("active").notNull().default(true),
});

/** Appendix B. Admins can add codes (FR-PLT-08). */
export const reasonCodes = pgTable("reason_codes", {
  code: text("code").primaryKey(),
  kind: text("kind").notNull(), // failed_delivery | exception
  labelEn: text("label_en").notNull(),
  labelSw: text("label_sw").notNull(),
  active: boolean("active").notNull().default(true),
});

/* -------------------------------------------------------------- waybill */

export type Address = {
  region: string; // mkoa
  district: string; // wilaya
  ward?: string; // kata
  street?: string; // mtaa
  landmark?: string;
  lat?: number;
  lng?: number;
};

export type Party = {
  name: string;
  phone: string; // E.164
  email?: string;
  language?: AppLocale;
  address: Address;
};

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waybill: text("waybill").notNull(),
    type: waybillType("type").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    merchantRef: text("merchant_ref"),
    /** Partner (warehouse, forwarder, parcel company, transporter) currently handling the shipment. */
    handlingPartnerId: text("handling_partner_id"),
    /** The partner's own client, when the partner booked it for one of their customers. */
    partnerClientId: uuid("partner_client_id"),
    /** Vehicle the cargo is currently loaded on (partner fleet). */
    vehicleId: uuid("vehicle_id"),
    /** The partner branch handling the cargo now. */
    handlingBranchId: uuid("handling_branch_id"),
    /** Partner invoice that billed this shipment, once invoiced. */
    partnerInvoiceId: uuid("partner_invoice_id"),
    state: shipmentState("state").notNull(),
    /** Overlay flag: a problem needs action while the state continues (section 4.4). */
    exception: boolean("exception").notNull().default(false),
    serviceLevel: serviceLevel("service_level"),
    paymentTerms: paymentTerms("payment_terms").notNull(),
    handoverMode: handoverMode("handover_mode"),
    deliveryMode: deliveryMode("delivery_mode"),
    shipper: jsonb("shipper").$type<Party>().notNull(),
    consignee: jsonb("consignee").$type<Party>().notNull(),
    pickupLocationId: text("pickup_location_id").references(() => locations.id),
    deliveryLocationId: text("delivery_location_id").references(() => locations.id),
    deliveryInstructions: text("delivery_instructions"),
    goodsDescription: text("goods_description").notNull(),
    goodsCategory: text("goods_category").notNull(),
    declaredValue: integer("declared_value"),
    /** Goods value to collect from the receiver (COD). Independent of who pays delivery. */
    codAmount: integer("cod_amount"),
    /** How the sender prepays (when paymentTerms = prepaid): mobile_money | card | bank_transfer */
    prepayMethod: text("prepay_method"),
    /** Methods the receiver may use at delivery: cash | mobile_money | card */
    collectMethods: jsonb("collect_methods").$type<string[]>().notNull().default(["cash", "mobile_money"]),
    specialHandling: jsonb("special_handling").$type<string[]>().notNull().default([]),
    prohibitedDeclared: boolean("prohibited_declared").notNull().default(false),
    piecesCount: smallint("pieces_count").notNull().default(1),
    actualWeightG: integer("actual_weight_g").notNull(),
    volumetricWeightG: integer("volumetric_weight_g").notNull(),
    chargeableWeightG: integer("chargeable_weight_g").notNull(),
    totalCharge: integer("total_charge").notNull().default(0),
    currency: text("currency").notNull().default("TZS"),
    promisedAt: ts("promised_at"),
    deliveredAt: ts("delivered_at"),
    attempts: smallint("attempts").notNull().default(0),
    returnOfId: uuid("return_of_id"),
    labelPrints: integer("label_prints").notNull().default(0),
    version: integer("version").notNull().default(1),
    channel: text("channel").notNull(), // portal | app | api | console
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("shipments_waybill_uq").on(t.waybill),
    index("shipments_account_created_idx").on(t.accountId, t.createdAt),
    index("shipments_state_idx").on(t.state),
    index("shipments_partner_idx").on(t.handlingPartnerId, t.state),
    index("shipments_merchant_ref_idx").on(t.accountId, t.merchantRef),
    index("shipments_consignee_phone_idx").on(sql`(${t.consignee}->>'phone')`),
  ],
);

/** A labelled item under a parcel waybill (FR-WB-05). */
export const pieces = pgTable(
  "pieces",
  {
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    seq: smallint("seq").notNull(),
    weightG: integer("weight_g").notNull(),
    lengthCm: integer("length_cm").notNull(),
    widthCm: integer("width_cm").notNull(),
    heightCm: integer("height_cm").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.shipmentId, t.seq] })],
);

/** Append-only event ledger (FR-TRK-01). Status is derived from these rows, never typed over. */
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(), // evt_<ulid>
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    pieceSeq: smallint("piece_seq"),
    type: text("type").notNull(), // e.g. shipment.out_for_delivery
    stateAfter: shipmentState("state_after"),
    occurredAt: ts("occurred_at").notNull(), // device time
    receivedAt: ts("received_at").notNull().defaultNow(), // server time
    clockSkew: boolean("clock_skew").notNull().default(false), // FR-TRK-06
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    locationId: text("location_id").references(() => locations.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    source: eventSource("source").notNull(),
    reasonCode: text("reason_code").references(() => reasonCodes.code),
    estimated: boolean("estimated").notNull().default(false), // synthetic milestone (FR-TRK-03)
    note: text("note"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [index("events_shipment_occurred_idx").on(t.shipmentId, t.occurredAt)],
);


/** Price breakdown at confirmation and at each re-pricing (FR-PCL-03). Ledger stays in FinOps. */
export const chargeSnapshots = pgTable(
  "charge_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    version: integer("version").notNull(),
    lines: jsonb("lines").$type<ChargeLine[]>().notNull(),
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("TZS"),
    taxRef: text("tax_ref"),
    finopsRef: text("finops_ref"),
    reason: text("reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("charge_snapshots_version_uq").on(t.shipmentId, t.version)],
);

/**
 * Money collected at delivery (FR-PCL-09): COD goods value and, for pay-on-delivery, the delivery fee.
 * Operational record only — money movement is posted in FinOps.
 */
export const codRecords = pgTable("cod_records", {
  shipmentId: uuid("shipment_id")
    .primaryKey()
    .references(() => shipments.id),
  /** COD goods value due */
  amountDue: integer("amount_due").notNull(),
  amountCollected: integer("amount_collected").notNull().default(0),
  /** Delivery fee due from the receiver (pay on delivery) */
  feeDue: integer("fee_due").notNull().default(0),
  feeCollected: integer("fee_collected").notNull().default(0),
  method: text("method"), // cash | mobile_money | card
  holderId: text("holder_id"),
  status: codStatus("status").notNull().default("due"),
  collectedAt: ts("collected_at"),
  depositedAt: ts("deposited_at"),
  remittedAt: ts("remitted_at"),
});

export const exceptions = pgTable(
  "exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    reasonCode: text("reason_code")
      .notNull()
      .references(() => reasonCodes.code),
    status: exceptionStatus("status").notNull().default("open"),
    ownerId: text("owner_id"),
    note: text("note"),
    slaDueAt: ts("sla_due_at").notNull(),
    openedBy: text("opened_by").notNull(),
    openedAt: ts("opened_at").notNull().defaultNow(),
    resolvedAt: ts("resolved_at"),
    resolution: text("resolution"),
    blissCaseId: text("bliss_case_id"),
  },
  (t) => [index("exceptions_status_idx").on(t.status, t.slaDueAt)],
);

/** Tamper-evident, append-only audit log (FR-PLT-04, NFR-15). Each row hashes the previous one. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: ts("at").notNull().defaultNow(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    device: text("device"),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
);

/**
 * Transactional outbox for integration messages (section 9.1): FinOps billable/COD events,
 * HuduFeed notifications, Bliss cases. Written in the same transaction as the change,
 * delivered at least once by the dispatcher, de-duplicated by idempotency key.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    target: text("target").notNull(), // finops | hudufeed | bliss | crm | engine
    topic: text("topic").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    waybill: text("waybill"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: smallint("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: ts("created_at").notNull().defaultNow(),
    sentAt: ts("sent_at"),
  },
  (t) => [uniqueIndex("outbox_idem_uq").on(t.idempotencyKey), index("outbox_status_idx").on(t.status, t.createdAt)],
);

/** Notification log per waybill (FR-MSG-02). Delivery happens in HuduFeed. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    template: text("template").notNull(),
    language: text("language").notNull(),
    channel: text("channel").notNull(), // sms | email
    recipientMasked: text("recipient_masked").notNull(),
    status: text("status").notNull().default("queued"), // queued | sent | delivered | failed
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_shipment_idx").on(t.shipmentId)],
);

/**
 * Public requests from the website: lost-item reports, contact messages and business enquiries.
 * Lost items and contact messages become Bliss cases; business enquiries become CRM leads (via the outbox).
 */
export const supportRequests = pgTable(
  "support_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    kind: text("kind").notNull(), // lost_item | contact | business
    waybill: text("waybill"),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    body: jsonb("body").$type<Record<string, unknown>>().notNull(),
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull().default("new"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("support_requests_ref_uq").on(t.ref), index("support_requests_kind_idx").on(t.kind, t.createdAt)],
);

/**
 * Receiver codes for seeing full tracking details (receiver name, phone, address).
 * Issued when the parcel is booked and sent in the receiver's first SMS (HuduFeed); reusable until it
 * expires or is replaced by a resend. Only a hash of the code is stored.
 */
export const trackingOtps = pgTable(
  "tracking_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waybill: text("waybill").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    attempts: smallint("attempts").notNull().default(0),
    verifiedAt: ts("verified_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("tracking_otps_waybill_idx").on(t.waybill, t.createdAt)],
);

/* --------------------------------------------------------------- partners */

export const vehicleStatus = pgEnum("vehicle_status", ["available", "on_trip", "maintenance", "inactive"]);

/**
 * Partner fleet. Moovit's own fleet lives in the Mobility Engine (FR-ENG-01); partners manage theirs here
 * until the Engine can hold partner fleets.
 */
/**
 * A company's branches (offices, warehouses, depots). Cargo is handled at a branch, vehicles are based at one, and
 * staff can be tied to one, in which case they only see that branch.
 */
export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    code: text("code").notNull(), // short label for lists and labels, e.g. ARK
    region: text("region").notNull(),
    district: text("district"),
    address: text("address"),
    phone: text("phone"),
    isHead: boolean("is_head").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("branches_code_uq").on(t.accountId, t.code)],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    plate: text("plate").notNull(),
    kind: text("kind").notNull(), // truck | van | motorbike | trailer
    make: text("make"),
    capacityKg: integer("capacity_kg").notNull(),
    volumeM3: doublePrecision("volume_m3"),
    status: vehicleStatus("status").notNull().default("available"),
    branchId: uuid("branch_id"),
    driverName: text("driver_name"),
    driverPhone: text("driver_phone"),
    insuranceExpiry: ts("insurance_expiry"),
    inspectionExpiry: ts("inspection_expiry"),
    notes: text("notes"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vehicles_plate_uq").on(t.accountId, t.plate)],
);

/** A partner's own customer book. */
export const partnerClients = pgTable(
  "partner_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerAccountId: text("partner_account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    tin: text("tin"),
    region: text("region"),
    creditTermsDays: integer("credit_terms_days").notNull().default(14),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("partner_clients_partner_idx").on(t.partnerAccountId)],
);

export const invoiceStatus = pgEnum("invoice_status", ["draft", "issued", "partially_paid", "paid", "void"]);

/**
 * Invoices a partner issues to its clients. Operational record in Tuma; the ledger entry is posted to
 * Hudumika FinOps through the outbox (FR-FIN-01).
 */
export const partnerInvoices = pgTable(
  "partner_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerAccountId: text("partner_account_id")
      .notNull()
      .references(() => accounts.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => partnerClients.id),
    number: text("number").notNull(),
    issueDate: ts("issue_date").notNull(),
    dueDate: ts("due_date").notNull(),
    currency: text("currency").notNull().default("TZS"),
    lines: jsonb("lines").$type<{ waybill?: string; description: string; amount: number }[]>().notNull(),
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    amountPaid: integer("amount_paid").notNull().default(0),
    status: invoiceStatus("status").notNull().default("issued"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("partner_invoices_number_uq").on(t.partnerAccountId, t.number), index("partner_invoices_client_idx").on(t.clientId)],
);

/** Payments received by a partner. invoiceId is null until reconciled. */
export const partnerPayments = pgTable(
  "partner_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerAccountId: text("partner_account_id")
      .notNull()
      .references(() => accounts.id),
    clientId: uuid("client_id").references(() => partnerClients.id),
    invoiceId: uuid("invoice_id").references(() => partnerInvoices.id),
    amount: integer("amount").notNull(),
    method: text("method").notNull(), // mobile_money | bank_transfer | cash | card
    reference: text("reference"),
    receivedAt: ts("received_at").notNull(),
    reconciledAt: ts("reconciled_at"),
    reconciledBy: text("reconciled_by"),
    recordedBy: text("recorded_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("partner_payments_partner_idx").on(t.partnerAccountId, t.invoiceId)],
);
