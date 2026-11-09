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
  bigint,
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
  varchar,
} from "drizzle-orm/pg-core";

export type { ChargeLine };

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ------------------------------------------------------------------ enums */

/**
 * User groups: internal = Tuma Staff · merchant/shipper = Corp (businesses that send) ·
 * partner = Partners (warehouses, freight forwarders, parcel companies, transporters). "carrier" is legacy.
 */
export const accountType = pgEnum("account_type", ["merchant", "shipper", "carrier", "internal", "partner"]);
export const partnerKind = pgEnum("partner_kind", ["warehouse", "freight_forwarder", "parcel_company", "transporter", "parcel_agent"]);
/** pending = a self-onboarded business whose application is still being reviewed: it can set up, not transact. */
export const accountStatus = pgEnum("account_status", ["active", "suspended", "closed", "pending"]);
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
/** collection_point: a common collection point any business can route a parcel to for pickup. */
export const locationType = pgEnum("location_type", ["hub", "wakala", "yard", "collection_point"]);
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
  /** Add-on: this business may book counter parcels the receiver pays for on delivery (collected later). */
  payOnDelivery: boolean("pay_on_delivery").notNull().default(false),
  /** Short code in this business's invoice numbers (INV-KPL-2611-0001), so no two invoices in Tuma share a number. */
  invoiceCode: varchar("invoice_code", { length: 6 }).unique(),
  /** A sending company's rules for its team (see CompanyPolicy). Null = no limits. */
  companyPolicy: jsonb("company_policy").$type<CompanyPolicy>(),
  syncedAt: ts("synced_at").notNull().defaultNow(),
});

/**
 * What a sending company allows its team: how its parcels may be paid, the most one parcel may be worth, whether
 * each must be charged to a department, and how many parcels one person may send on the account in a month.
 */
export type CompanyPolicy = {
  payWith?: ("account" | "point" | "wallet")[];
  maxDeclaredValue?: number | null;
  requireDepartment?: boolean;
  monthlyParcelsPerSender?: number | null;
};

/** A person's saved places (home, work, favourites): picked on the map, offered first when they book. */
export const savedPlaces = pgTable(
  "saved_places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // home | work | favourite
    label: text("label").notNull(),
    line: text("line").notNull(),
    region: text("region").notNull(),
    district: text("district").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("saved_places_user_idx").on(t.userId), uniqueIndex("saved_places_one_home_uq").on(t.userId, t.kind).where(sql`${t.kind} in ('home','work')`)],
);

/** A sending company's departments: staff belong to one, and its parcels are charged to one for the reports. */
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    /** What the department may send in a month (TZS); null = no budget. */
    monthlyBudget: integer("monthly_budget"),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("departments_name_uq").on(t.accountId, t.name)],
);

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
    /**
     * Where the grant applies: "all", or a comma-separated list of "region:<name>" / "country:<CC>". Screens that list
     * parcels or money for the whole network filter to it.
     */
    scope: text("scope").notNull().default("all"),
    /** The most money (TZS) one action under this grant may move or approve; null = no limit. */
    maxAmount: bigint("max_amount", { mode: "number" }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permission] })],
);

/** Snapshot of the Ondi identity. Tuma keeps no passwords (FR-IDN-02). */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Ondi subject
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  /** Profile photo from Ondi (OIDC `picture`), refreshed at every sign-in; null = show initials. */
  avatarUrl: text("avatar_url"),
  accountId: text("account_id").references(() => accounts.id),
  /** Set when the person works at one branch: they then see only that branch's cargo and vehicles. */
  branchId: uuid("branch_id"),
  /** Their department in a sending company. */
  departmentId: uuid("department_id"),
  /** Role keys from the Ondi claim. While Ondi is stubbed, admins assign them in the console. */
  roles: jsonb("roles").$type<string[]>().notNull(),
  /**
   * Roles Tuma itself granted (KYB approval, driver registration). They are merged back into `roles` at every
   * sign-in, so a fresh Ondi claim doesn't take them away.
   */
  grantedRoles: jsonb("granted_roles").$type<string[]>().notNull().default([]),
  scope: jsonb("scope").$type<{ region?: string; hubId?: string; wakalaId?: string }>().notNull().default({}),
  locale: text("locale").notNull().default("en"),
  timeZone: text("time_zone").notNull().default("Africa/Dar_es_Salaam"),
  active: boolean("active").notNull().default(true),
  /** The person deleted their Tuma account: details wiped, signed out. Signing in with Ondi again starts afresh. */
  deletedAt: ts("deleted_at"),
  lastSeenAt: ts("last_seen_at"),
  /** Set up to send and receive parcels in the app (the sender's home): their area, for the nearest Tuma points. */
  senderProfile: jsonb("sender_profile").$type<{ region: string; district?: string; since: string }>(),
  /** Know-your-customer tier: 0 phone only, 1 name and ID number, 2 ID checked by Tuma, 3 business (KYB). */
  kycTier: smallint("kyc_tier").notNull().default(0),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(), // e.g. DAR-ILA-01
  type: locationType("type").notNull(),
  name: text("name").notNull(),
  country: text("country").notNull().default("TZ"), // ISO 3166-1 alpha-2
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
  kind: text("kind").notNull(), // failed_delivery | exception | override | cancellation
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
  company?: { tin?: string; regNo?: string; contactName?: string };
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
    /** Sent on a company's account (not the sender's own): the company sees it, it counts in its reports. */
    companyAccountId: text("company_account_id"),
    /** The company department it is charged to. */
    departmentId: uuid("department_id"),
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
    /** Collected at one of the booking company's own offices instead of a Wakala point. */
    deliveryBranchId: uuid("delivery_branch_id").references(() => branches.id),
    deliveryInstructions: text("delivery_instructions"),
    goodsDescription: text("goods_description").notNull(),
    goodsCategory: text("goods_category").notNull(),
    /** A photo of the goods taken at the counter (storage key), when there is one. */
    goodsPhoto: text("goods_photo"),
    /** The sender and receiver in the booking company's customer list. */
    shipperCustomerId: uuid("shipper_customer_id"),
    consigneeCustomerId: uuid("consignee_customer_id"),
    declaredValue: integer("declared_value"),
    /** Goods value to collect from the receiver (COD). Independent of who pays delivery. */
    codAmount: integer("cod_amount"),
    /** How the sender prepays (when paymentTerms = prepaid): cash | mobile_money */
    prepayMethod: text("prepay_method"),
    /** When the sender's counter payment was confirmed: at booking for cash, when HuduPay says so for mobile money. */
    paidAt: ts("paid_at"),
    /** Booked at the counter but only received once paid (a person paying by mobile money): no payment, no parcel. */
    receiveOnPayment: boolean("receive_on_payment").notNull().default(false),
    /** Extra services sold with it at the counter (insurance, packaging), already in totalCharge. */
    extras: jsonb("extras").$type<{ code: string; label: string; amount: number }[]>().notNull().default([]),
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
    index("shipments_company_idx").on(t.companyAccountId, t.createdAt),
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
    target: text("target").notNull(), // finops | hudufeed | bliss | crm | engine | complyos | seal
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
 * Customer-visible history of a support case (lost item, contact). Tuma writes the first entry; Bliss, which owns
 * the case, sends the rest through /api/hooks/bliss. `externalId` makes a redelivered Bliss event a no-op.
 */
export const supportUpdates = pgTable(
  "support_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => supportRequests.id),
    status: text("status").notNull(),
    note: text("note"),
    source: text("source").notNull(), // tuma | bliss
    externalId: text("external_id"),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
  },
  (t) => [index("support_updates_request_idx").on(t.requestId, t.occurredAt), uniqueIndex("support_updates_ext_uq").on(t.externalId)],
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
    country: text("country").notNull().default("TZ"), // ISO 3166-1 alpha-2, SADC/EAC
    region: text("region").notNull(),
    district: text("district"),
    address: text("address"),
    /** Where the office is, pinned on the map in the app: receivers get directions to it. */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
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

/* ------------------------------------------------------------ Tuma-X drivers */

/**
 * A rider or truck driver who works through the Tuma-X app. One row per user with the rider or truck_driver role.
 * accountId is the fleet the driver works for: Tuma's own pool (internal account) or a partner's fleet.
 * Jobs are offered only from that fleet, in the driver's region, for their vehicle.
 */
export const drivers = pgTable(
  "drivers",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    phone: text("phone").notNull(),
    region: text("region").notNull(),
    /** Tuma-X vehicle kind: boda | bajaji | van | pickup | lorry | trailer */
    vehicleKind: text("vehicle_kind").notNull(),
    plate: text("plate").notNull().default(""),
    /** pending (registered, waiting for review) | approved | suspended */
    status: text("status").notNull().default("pending"),
    /** Registration details the app collects (licence, ID, vehicle make, payout account …). */
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    online: boolean("online").notNull().default(false),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    lastSeenAt: ts("last_seen_at"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("drivers_phone_uq").on(t.phone), index("drivers_pool_idx").on(t.accountId, t.region, t.status)],
);

/**
 * One-time hand-off from the Ondi sign-in (done in the browser) to the Tuma-X app. The app gets the code on its
 * redirect URI and swaps it, with its PKCE verifier, for a token. Only hashes are stored.
 */
export const driverHandoffs = pgTable("driver_handoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeHash: text("code_hash").notNull(),
  /** The app's PKCE challenge (S256) for the swap. */
  challenge: text("challenge").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("driver_handoffs_code_uq").on(t.codeHash)]);

/**
 * A run a dispatcher hands to one driver: a pickup and one or more waybills to deliver.
 * open (offered to eligible drivers) → assigned (a driver accepted) → in_progress → completed | cancelled.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    /** Fleet whose drivers see the job: Tuma's internal account or a partner. */
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    kind: waybillType("kind").notNull(),
    /** Delivery area the job is offered in (the pickup's region). */
    region: text("region").notNull(),
    status: text("status").notNull().default("open"),
    /** Tuma-X vehicle kind the job needs, or null for any vehicle that fits. */
    requiredVehicle: text("required_vehicle"),
    pickup: jsonb("pickup").$type<{ name: string; address: string; phone?: string; lat: number; lng: number; instructions?: string }>().notNull(),
    weightG: integer("weight_g").notNull().default(0),
    /** What the driver earns for the job (TZS). */
    payout: integer("payout").notNull(),
    currency: text("currency").notNull().default("TZS"),
    slaAt: ts("sla_at"),
    driverId: text("driver_id").references(() => users.id),
    /** Last phase the app reported (toPickup, atPickup, inTransit …). */
    phase: text("phase"),
    distanceM: integer("distance_m"),
    trail: jsonb("trail").$type<[number, number][]>(),
    note: text("note"),
    cancelReason: text("cancel_reason"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    acceptedAt: ts("accepted_at"),
    completedAt: ts("completed_at"),
  },
  (t) => [uniqueIndex("jobs_ref_uq").on(t.ref), index("jobs_pool_idx").on(t.accountId, t.status, t.region), index("jobs_driver_idx").on(t.driverId, t.status)],
);

export const jobShipments = pgTable(
  "job_shipments",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    seq: smallint("seq").notNull(),
    /** pending | delivered | failed */
    outcome: text("outcome").notNull().default("pending"),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.shipmentId] }), index("job_shipments_shipment_idx").on(t.shipmentId)],
);

/**
 * A dispatch manifest: parcels an office sends out together, who carries them and where they go. A door run goes to
 * receivers' doors (the office's own courier, or a Tuma courier job); a point run takes them to another Tuma point,
 * which offloads them against this list. on_the_way → arrived (point run, everything scanned in) | done (door run).
 */
export const manifests = pgTable(
  "manifests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    fromBranchId: uuid("from_branch_id").references(() => branches.id),
    /** door | point */
    mode: text("mode").notNull(),
    toAccountId: text("to_account_id").references(() => accounts.id),
    toBranchId: uuid("to_branch_id").references(() => branches.id),
    /** staff (one of the office's people) | tuma (a Tuma courier, see jobId) | transporter (a bus, lorry or boda). */
    carrier: jsonb("carrier")
      .$type<{
        kind: "staff" | "tuma" | "transporter";
        userId?: string;
        name: string;
        phone?: string;
        company?: string;
        plate?: string;
        ref?: string;
        /** A custom carrier's entry in the dispatcher network, and the photo of their receipt or ticket (a storage key). */
        dispatcherId?: string;
        receiptKey?: string;
      }>()
      .notNull(),
    jobId: uuid("job_id").references(() => jobs.id),
    status: text("status").notNull().default("on_the_way"),
    note: text("note"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    arrivedAt: ts("arrived_at"),
  },
  (t) => [uniqueIndex("manifests_ref_uq").on(t.ref), index("manifests_from_idx").on(t.accountId, t.createdAt), index("manifests_to_idx").on(t.toBranchId, t.status)],
);

/**
 * The dispatcher network: riders, drivers and transporters an office has sent parcels with who aren't Tuma couriers
 * or on its team. Each is saved the first time it's used (name, phone, vehicle number) so the office can pick them
 * again, and stays unvetted until Tuma checks them and invites them onto the network. One row per office and phone.
 */
export const dispatchers = pgTable(
  "dispatchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    /** E.164 */
    phone: text("phone").notNull(),
    plate: text("plate").notNull(),
    /** unvetted (saved by an office) | vetted (checked by Tuma) | invited (asked to join as a Tuma courier) */
    status: text("status").notNull().default("unvetted"),
    trips: integer("trips").notNull().default(0),
    lastUsedAt: ts("last_used_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dispatchers_acct_phone_uq").on(t.accountId, t.phone), index("dispatchers_phone_idx").on(t.phone)],
);

export const manifestItems = pgTable(
  "manifest_items",
  {
    manifestId: uuid("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    seq: smallint("seq").notNull(),
    /** When the receiving point scanned it in. */
    arrivedAt: ts("arrived_at"),
    arrivedBy: text("arrived_by"),
  },
  (t) => [primaryKey({ columns: [t.manifestId, t.shipmentId] }), index("manifest_items_shipment_idx").on(t.shipmentId)],
);

/* ------------------------------------------------------------ KYB and agents */

export const kybStatus = pgEnum("kyb_status", ["submitted", "in_review", "needs_info", "approved", "rejected"]);

/**
 * A business applying to work on Tuma (for now: parcel agents), filled in by the owner in the Tuma app and checked by
 * ComplyOS. One per Ondi user. The applicant can correct and resubmit while ComplyOS asks for more information.
 */
export const kybApplications = pgTable(
  "kyb_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(), // KYB-2611-XXXXX, shown to the applicant
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** What the business will be on Tuma. Only parcel_agent is open today. */
    accountKind: text("account_kind").notNull().default("parcel_agent"),
    status: kybStatus("status").notNull().default("submitted"),
    businessName: text("business_name").notNull(),
    businessType: text("business_type").notNull(), // sole_trader | partnership | company
    tin: text("tin").notNull(),
    licenceNumber: text("licence_number"),
    /** Upload key of the business licence photo or PDF. */
    licenceFile: text("licence_file"),
    /** The BRELA record the applicant picked to fill the form (number, registered name, kind, status, address). */
    registration: jsonb("registration").$type<KybRegistration>(),
    /** Office: region, district, street, landmark, phone, lat/lng, hours. */
    office: jsonb("office").$type<KybOffice>().notNull(),
    contact: jsonb("contact").$type<{ name: string; phone: string; email?: string; role?: string }>().notNull(),
    /** The parcel operation steps this office runs, in order (receive, dispatch, offload, deliver). */
    workflow: jsonb("workflow").$type<string[]>().notNull(),
    /** Bumped on each resubmission; part of the ComplyOS idempotency key. */
    version: smallint("version").notNull().default(1),
    complyRef: text("comply_ref"),
    /** What ComplyOS told the applicant (needs info / rejected). */
    decisionNote: text("decision_note"),
    /** Set on approval. */
    accountId: text("account_id").references(() => accounts.id),
    submittedAt: ts("submitted_at").notNull().defaultNow(),
    decidedAt: ts("decided_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kyb_user_uq").on(t.userId), uniqueIndex("kyb_ref_uq").on(t.ref), index("kyb_status_idx").on(t.status, t.submittedAt)],
);

export type KybRegistration = {
  source: "brela";
  number: string;
  name: string;
  kind: "company" | "business_name";
  subtype?: string | null;
  status?: string | null;
  registeredOn?: string | null;
  address?: string | null;
};

export type KybOffice = {
  region: string;
  district: string;
  street: string;
  landmark?: string;
  phone: string;
  hours?: string;
  lat?: number;
  lng?: number;
};

/** Status history of an application. ComplyOS events carry an id so a redelivery is applied once. */
export const kybEvents = pgTable(
  "kyb_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => kybApplications.id),
    status: kybStatus("status").notNull(),
    note: text("note"),
    source: text("source").notNull(), // tuma | complyos
    externalId: text("external_id"),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kyb_events_ext_uq").on(t.externalId), index("kyb_events_app_idx").on(t.applicationId, t.occurredAt)],
);

/**
 * A parcel agent business, created when its KYB is approved. The float wallet lives in FinOps (walletRef);
 * parcels on the office floor are tracked in SEAL (sealSiteRef).
 */
export const agents = pgTable("agents", {
  accountId: text("account_id")
    .primaryKey()
    .references(() => accounts.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  kybId: uuid("kyb_id")
    .notNull()
    .references(() => kybApplications.id),
  /** Head office branch. */
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  workflow: jsonb("workflow").$type<string[]>().notNull(),
  /** Tuma's commission on each parcel the agent handles, in basis points. PLACEHOLDER rate until pricing is agreed. */
  commissionBps: integer("commission_bps").notNull(),
  walletRef: text("wallet_ref"),
  sealSiteRef: text("seal_site_ref"),
  status: text("status").notNull().default("active"), // active | suspended
  createdAt: ts("created_at").notNull().defaultNow(),
});

/**
 * An invitation to join a company on Tuma. The owner (or anyone with team.manage) invites by phone; Tuma texts a link,
 * the person signs in with Ondi and accepts, and gets the roles and office chosen here. Only a hash of the link's
 * token is stored. Someone who signs in with the invited phone or email also sees the invitation in the app.
 */
export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // E.164
    email: text("email"),
    roles: jsonb("roles").$type<string[]>().notNull(),
    branchId: uuid("branch_id").references(() => branches.id),
    tokenHash: text("token_hash").notNull(),
    /** The short join code (hashed) the person can type in the app instead of opening the link. */
    codeHash: text("code_hash"),
    status: text("status").notNull().default("pending"), // pending | accepted | revoked | declined
    locale: text("locale").notNull().default("sw"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id),
    acceptedBy: text("accepted_by").references(() => users.id),
    expiresAt: ts("expires_at").notNull(),
    respondedAt: ts("responded_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("team_invites_token_uq").on(t.tokenHash), uniqueIndex("team_invites_code_uq").on(t.codeHash), index("team_invites_account_idx").on(t.accountId, t.status), index("team_invites_phone_idx").on(t.phone, t.status)],
);

/* ------------------------------------------------------------------ Hudumika global references
 * The Reference Number Service's registry (spec §4). In production the shared service owns these tables and Tuma
 * calls it (REFERENCE_MODE=http); in development, tests, and until that service is live, Tuma runs the same
 * allocator against these tables in its own database (REFERENCE_MODE=local). Append-only: database triggers
 * (drizzle/0001_references.sql) refuse updates and deletes of issued references and reactivation of prefixes.
 */

export const referenceTypes = pgTable("reference_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 30 }).notNull().unique(), // PARCEL | CARGO | CASE
  description: varchar("description", { length: 150 }).notNull(),
  sourceSystem: varchar("source_system", { length: 30 }).notNull(), // owning product: TRANSX | BLISS
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const referencePrefixes = pgTable(
  "reference_prefixes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Whose sequence: PARCEL | CARGO | CASE (each kind counts on its own). */
    series: varchar("series", { length: 10 }).notNull().default("PARCEL"),
    prefix: varchar("prefix", { length: 3 }).notNull(),
    prefixOrder: integer("prefix_order").notNull(),
    status: varchar("status", { length: 20 }).notNull(), // ACTIVE | EXHAUSTED | RETIRED
    allocatedAt: ts("allocated_at").notNull().defaultNow(),
    exhaustedAt: ts("exhausted_at"),
  },
  // One active prefix per sequence.
  (t) => [
    uniqueIndex("reference_prefixes_series_prefix_uq").on(t.series, t.prefix),
    uniqueIndex("reference_prefixes_series_order_uq").on(t.series, t.prefixOrder),
    uniqueIndex("reference_prefixes_one_active").on(t.series).where(sql`status = 'ACTIVE'`),
  ],
);

/**
 * One cursor per sequence (id = REF_SERIES[type].cursor: 1 parcels, 2 cargo, 3 cases): the active prefix and the
 * next number to hand out. Locked for every allocation of that kind.
 */
export const referenceAllocator = pgTable("reference_allocator", {
  id: smallint("id").primaryKey(),
  series: varchar("series", { length: 10 }).notNull().default("PARCEL").unique(),
  activePrefixId: uuid("active_prefix_id")
    .notNull()
    .references(() => referencePrefixes.id),
  nextSequence: integer("next_sequence").notNull(),
  formatVersion: smallint("format_version").notNull().default(1),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const generatedReferences = pgTable(
  "generated_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceNumber: varchar("reference_number", { length: 12 }).notNull().unique(),
    referenceTypeId: uuid("reference_type_id")
      .notNull()
      .references(() => referenceTypes.id),
    entityId: uuid("entity_id").notNull(),
    sourceSystem: varchar("source_system", { length: 30 }).notNull(), // the product that asked
    tenantId: text("tenant_id"),
    prefixId: uuid("prefix_id")
      .notNull()
      .references(() => referencePrefixes.id),
    sequenceNumber: integer("sequence_number").notNull(),
    formatVersion: smallint("format_version").notNull(),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 100 }).notNull(),
  },
  (t) => [
    uniqueIndex("generated_references_entity_uq").on(t.sourceSystem, t.referenceTypeId, t.entityId),
    uniqueIndex("generated_references_prefix_seq_uq").on(t.prefixId, t.sequenceNumber),
    index("generated_references_issued_idx").on(t.issuedAt),
  ],
);

export const referenceIdempotency = pgTable(
  "reference_idempotency",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceSystem: varchar("source_system", { length: 30 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 150 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    generatedReferenceId: uuid("generated_reference_id")
      .notNull()
      .references(() => generatedReferences.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reference_idempotency_uq").on(t.sourceSystem, t.idempotencyKey)],
);

/** Platform-wide settings Tuma staff change from the portal (settings.manage). One row per key; values are JSON. */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/**
 * A business's customers: everyone who sent or received a parcel through its counters, saved as they are booked so
 * the next booking is a pick, not typing. People and companies (with their TIN and BRELA number).
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    kind: text("kind").notNull(), // individual | company
    name: text("name").notNull(),
    phone: text("phone").notNull(), // E.164
    email: text("email"),
    tin: text("tin"),
    regNo: text("reg_no"),
    contactName: text("contact_name"),
    /** Where parcels to them last went. */
    region: text("region"),
    district: text("district"),
    landmark: text("landmark"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    sent: integer("sent").notNull().default(0),
    received: integer("received").notNull().default(0),
    /** Numbers of customers merged into this one: a booking with one of them counts here. */
    otherPhones: jsonb("other_phones").$type<string[]>().notNull().default([]),
    /** Told "not the same person" when offered a merge with others of the same name. */
    dupDismissed: boolean("dup_dismissed").notNull().default(false),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_account_kind_phone_uq").on(t.accountId, t.kind, t.phone), index("customers_account_seen_idx").on(t.accountId, t.lastSeenAt)],
);

/**
 * A mobile-money request for a counter parcel: HuduPay pushes a prompt to the payer's phone, and the outcome comes
 * back on its callback (or a status poll). One parcel may have several tries; the first success pays it.
 */
export const parcelPayments = pgTable(
  "parcel_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    /** Our reference to HuduPay (idempotent there), and its payment id. */
    reference: text("reference").notNull(),
    providerId: text("provider_id"),
    msisdn: text("msisdn").notNull(), // 255XXXXXXXXX
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TZS"),
    status: text("status").notNull().default("pending"), // pending | paid | failed
    failureMessage: text("failure_message"),
    requestedBy: text("requested_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [uniqueIndex("parcel_payments_reference_uq").on(t.reference), index("parcel_payments_shipment_idx").on(t.shipmentId)],
);

/**
 * Invoices a business issues to its company customers, made automatically when a company sends a parcel at the
 * counter. Tuma keeps the operational record; the ledger entries go to Hudumika FinOps through the outbox.
 */
/**
 * How a business takes money in the app. Mobile money is opt-in: once on, customers pay by a push to their phone and
 * the takings are paid out to the business (its wallet or bank) with Tuma's commission taken off first, so those
 * parcels don't draw on the float. Pay on delivery itself lives on accounts.payOnDelivery.
 */
export const paymentSettings = pgTable("payment_settings", {
  accountId: text("account_id").primaryKey(),
  momoEnabled: boolean("momo_enabled").notNull().default(false),
  /** Where mobile-money takings go: { method: "mobile_money", phone, name } | { method: "bank", bank, accountName, accountNumber, branch? } */
  payout: jsonb("payout").$type<Record<string, string>>(),
  /** instant | daily | weekly */
  payoutSchedule: text("payout_schedule").notNull().default("daily"),
  updatedBy: text("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    customerId: uuid("customer_id").references(() => customers.id),
    shipmentId: uuid("shipment_id").references(() => shipments.id),
    number: text("number").notNull(),
    /** Who is billed, as on the day: name, TIN, phone, contact. */
    billTo: jsonb("bill_to").$type<{ name: string; tin?: string; phone: string; contactName?: string; email?: string }>().notNull(),
    issueDate: ts("issue_date").notNull(),
    dueDate: ts("due_date").notNull(),
    currency: text("currency").notNull().default("TZS"),
    lines: jsonb("lines").$type<{ waybill?: string; description: string; amount: number }[]>().notNull(),
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    amountPaid: integer("amount_paid").notNull().default(0),
    paidWith: text("paid_with"),
    status: invoiceStatus("status").notNull().default("issued"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invoices_number_uq").on(t.accountId, t.number), uniqueIndex("invoices_shipment_uq").on(t.shipmentId), index("invoices_customer_idx").on(t.customerId)],
);

/**
 * A business reporting a customer for fraud or abuse (fake payments, prohibited goods, threats…). Shared across
 * Tuma: another agent booking with the same number is warned. Tuma ops review them; the reporter is never shown.
 */
export const customerReports = pgTable(
  "customer_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    /** The number reported (E.164): how other agents are warned. */
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    reason: text("reason").notNull(), // fake_payment | prohibited_goods | abuse | no_show | identity | other
    note: text("note"),
    /** open (counts in warnings) | upheld | dismissed (by Tuma ops). */
    status: text("status").notNull().default("open"),
    reportedBy: text("reported_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("customer_reports_phone_idx").on(t.phone), uniqueIndex("customer_reports_once_uq").on(t.accountId, t.phone, t.reason)],
);

/**
 * How a receiver rated the agent that handed their parcel over. Texted a link once the parcel is delivered;
 * one rating per parcel. Feeds the agent's points and Tuma's customer-experience follow-up.
 */
export const parcelRatings = pgTable(
  "parcel_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    /** The business rated: the one that booked or handed the parcel over. */
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    tokenHash: text("token_hash").notNull(),
    phone: text("phone").notNull(),
    stars: smallint("stars"),
    /** What went wrong, when something did. */
    issue: text("issue"), // late | damaged | missing | rude | overcharged | other
    comment: text("comment"),
    sentAt: ts("sent_at").notNull().defaultNow(),
    ratedAt: ts("rated_at"),
  },
  (t) => [uniqueIndex("parcel_ratings_shipment_uq").on(t.shipmentId), uniqueIndex("parcel_ratings_token_uq").on(t.tokenHash), index("parcel_ratings_account_idx").on(t.accountId, t.ratedAt)],
);

/**
 * How a business (a Tuma point or a courier's fleet) rated a customer it served on a parcel: the sender who brought
 * it or the receiver who collected it. One per business, parcel and person. The person sees their score in the app.
 */
export const customerRatings = pgTable(
  "customer_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    /** The person rated (E.164). */
    phone: text("phone").notNull(),
    /** sender | receiver */
    role: text("role").notNull(),
    stars: smallint("stars").notNull(),
    note: text("note"),
    ratedBy: text("rated_by")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_ratings_once_uq").on(t.accountId, t.shipmentId, t.phone), index("customer_ratings_phone_idx").on(t.phone, t.createdAt)],
);

/**
 * A sender's Tuma wallet: money they put in ahead (a mobile-money top-up through HuduPay) and spend on their parcels
 * when a Tuma point prices them, with refunds coming back in. The balance is the sum of the settled entries; a
 * top-up counts once HuduPay says it's paid. Tuma holds the money and pays the point out as for mobile money.
 */
export const walletEntries = pgTable(
  "wallet_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Who: their own wallet, or (with accountId) the person who moved the company's money. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** Set for a company's wallet: the balance is the company's, not the person's. */
    accountId: text("account_id"),
    kind: text("kind").notNull(), // topup | parcel | refund
    /** Signed: + money in (top-up, refund), − money out (a parcel). */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TZS"),
    status: text("status").notNull().default("paid"), // pending | paid | failed
    /** Our reference (to HuduPay for a top-up), its payment id, and the phone that paid. */
    reference: text("reference").notNull(),
    providerId: text("provider_id"),
    msisdn: text("msisdn"),
    shipmentId: uuid("shipment_id").references(() => shipments.id),
    waybill: text("waybill"),
    failureMessage: text("failure_message"),
    createdAt: ts("created_at").notNull().defaultNow(),
    settledAt: ts("settled_at"),
  },
  (t) => [
    uniqueIndex("wallet_entries_reference_uq").on(t.reference),
    index("wallet_entries_user_idx").on(t.userId, t.createdAt),
    index("wallet_entries_account_idx").on(t.accountId, t.createdAt),
    // A parcel is charged to a wallet once.
    uniqueIndex("wallet_entries_parcel_uq").on(t.shipmentId).where(sql`${t.kind} = 'parcel'`),
  ],
);

/**
 * Phones with the Tuma app that take push notifications: one row per FCM token, owned by the signed-in person. A
 * token HuduFeed reports dead is switched off; signing out removes it.
 */
export const pushDevices = pgTable(
  "push_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull(),
    platform: text("platform").notNull().default("android"), // android | ios
    appVersion: text("app_version"),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    disabledAt: ts("disabled_at"),
  },
  (t) => [uniqueIndex("push_devices_token_uq").on(t.token), index("push_devices_user_idx").on(t.userId)],
);

/**
 * Four-eyes: something sensitive one person asked for (a staff role for someone, a wallet adjustment) waits here until a
 * second person with approvals.decide approves it. Nobody decides their own. Approval applies it.
 */
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(), // role_grant | wallet_adjust
    /** Who or what it is about: the user, or the wallet's owner. */
    subjectId: text("subject_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | cancelled
    requestedBy: text("requested_by").notNull(),
    requestedAt: ts("requested_at").notNull().defaultNow(),
    decidedBy: text("decided_by"),
    decidedAt: ts("decided_at"),
    decisionNote: text("decision_note"),
  },
  (t) => [index("approval_requests_status_idx").on(t.status, t.requestedAt), index("approval_requests_subject_idx").on(t.subjectId)],
);

/** A reviewer's look at one staff member's access: kept as it is, or their staff roles taken away. */
export const accessReviews = pgTable(
  "access_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    reviewerId: text("reviewer_id").notNull(),
    decision: text("decision").notNull(), // keep | revoke
    roles: jsonb("roles").$type<string[]>().notNull(),
    note: text("note"),
    at: ts("at").notNull().defaultNow(),
  },
  (t) => [index("access_reviews_user_idx").on(t.userId, t.at)],
);

/**
 * Break-glass: someone on call takes a staff role for a few hours (1–8) with a reason, without waiting for a second
 * person. It ends by itself at `expiresAt` (or earlier when ended), and every one shows in the access review.
 */
export const accessElevations = pgTable(
  "access_elevations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    roleKey: text("role_key").notNull(),
    reason: text("reason").notNull(),
    startedAt: ts("started_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    endedAt: ts("ended_at"),
    endedBy: text("ended_by"),
    /** Set when a reviewer has looked at it in the access review. */
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [index("access_elevations_user_idx").on(t.userId, t.expiresAt)],
);

/* ================================================================ Phase 2: trust */

/**
 * A claim for a lost, damaged, short-delivered or late parcel. The adjuster gathers evidence (the booking photo, proof
 * of delivery and scans come from the parcel's own record), decides who was liable, and proposes a settlement; paying
 * it waits for a second person with approvals.decide. What's recovered from the liable party is recorded after.
 */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id),
    waybill: text("waybill").notNull(),
    kind: text("kind").notNull(), // lost | damaged | short | late
    /** Who claims: a Tuma user (paid into their wallet) or just a name and phone. */
    claimantUserId: text("claimant_user_id").references(() => users.id),
    claimantName: text("claimant_name").notNull(),
    claimantPhone: text("claimant_phone"),
    declaredValue: integer("declared_value"),
    amountClaimed: integer("amount_claimed").notNull(),
    description: text("description").notNull(),
    evidence: jsonb("evidence").$type<{ kind: string; note: string; url?: string; by: string; at: string }[]>().notNull().default([]),
    /** point | rider | carrier | border | tuma | customer | none */
    liableParty: text("liable_party"),
    liableId: text("liable_id"),
    /** open | investigating | proposed | settled | rejected */
    status: text("status").notNull().default("open"),
    proposedAmount: integer("proposed_amount"),
    settledAmount: integer("settled_amount"),
    recoveredAmount: integer("recovered_amount").notNull().default(0),
    decisionNote: text("decision_note"),
    handledBy: text("handled_by"),
    approvalId: uuid("approval_id"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    decidedAt: ts("decided_at"),
  },
  (t) => [uniqueIndex("claims_ref_uq").on(t.ref), index("claims_status_idx").on(t.status, t.createdAt), index("claims_shipment_idx").on(t.shipmentId)],
);

/** A risk rule the checks run: its switch and its thresholds. */
export const riskRules = pgTable("risk_rules", {
  key: text("key").primaryKey(), // velocity | ghost_delivery | cash_shortfall | reported_phone
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  params: jsonb("params").$type<Record<string, number>>().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Something a rule found. One per rule, subject and day (dedupeKey). */
export const riskAlerts = pgTable(
  "risk_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rule: text("rule").notNull(),
    subjectType: text("subject_type").notNull(), // user | account | shipment
    subjectId: text("subject_id").notNull(),
    subjectLabel: text("subject_label").notNull(),
    score: integer("score").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("open"), // open | case | dismissed
    caseId: uuid("case_id"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("risk_alerts_dedupe_uq").on(t.dedupeKey), index("risk_alerts_status_idx").on(t.status, t.createdAt), index("risk_alerts_subject_idx").on(t.subjectType, t.subjectId)],
);

/** An investigation: alerts about one subject, notes, and the outcome (which feeds the rules). */
export const riskCases = pgTable(
  "risk_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    subjectLabel: text("subject_label").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"), // open | closed
    outcome: text("outcome"), // fraud | not_fraud | inconclusive
    notes: jsonb("notes").$type<{ by: string; name: string; at: string; text: string }[]>().notNull().default([]),
    ownerId: text("owner_id"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    closedAt: ts("closed_at"),
  },
  (t) => [uniqueIndex("risk_cases_ref_uq").on(t.ref), index("risk_cases_status_idx").on(t.status, t.createdAt)],
);

/**
 * A freeze on a person or a business: while it's on they can only look, not act. One person can place it; releasing it
 * waits for a second (approval kind risk_release).
 */
export const riskHolds = pgTable(
  "risk_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subject_type").notNull(), // user | account
    subjectId: text("subject_id").notNull(),
    subjectLabel: text("subject_label").notNull(),
    reason: text("reason").notNull(),
    caseId: uuid("case_id"),
    placedBy: text("placed_by").notNull(),
    placedAt: ts("placed_at").notNull().defaultNow(),
    releasedBy: text("released_by"),
    releasedAt: ts("released_at"),
    approvalId: uuid("approval_id"),
  },
  (t) => [index("risk_holds_subject_idx").on(t.subjectType, t.subjectId)],
);

/** A know-your-customer check of one person's identity: what was shown, and the tier it gives once approved. */
export const kycRecords = pgTable(
  "kyc_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tier: smallint("tier").notNull(),
    fullName: text("full_name").notNull(),
    idType: text("id_type").notNull(), // nida | voter | passport | driving_licence
    /** Only the last four characters are kept. */
    idLast4: text("id_last4").notNull(),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    note: text("note"),
    submittedBy: text("submitted_by").notNull(),
    submittedAt: ts("submitted_at").notNull().defaultNow(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [index("kyc_records_status_idx").on(t.status, t.submittedAt), index("kyc_records_user_idx").on(t.userId)],
);

/** Names to screen against: sanctions and PEP lists (loaded from ComplyOS) and Tuma's own. */
export const watchlistEntries = pgTable("watchlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // sanctions | pep | internal
  country: text("country"),
  source: text("source").notNull(),
  note: text("note"),
  addedBy: text("added_by").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** One AML screening of a name, its possible matches, and the reviewer's verdict. */
export const amlScreenings = pgTable(
  "aml_screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subject_type").notNull(), // user | account | name
    subjectId: text("subject_id"),
    name: text("name").notNull(),
    /** clear | possible_match → confirmed | false_positive */
    result: text("result").notNull(),
    matches: jsonb("matches").$type<{ id: string; name: string; kind: string; score: number }[]>().notNull().default([]),
    screenedBy: text("screened_by").notNull(),
    screenedAt: ts("screened_at").notNull().defaultNow(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    note: text("note"),
  },
  (t) => [index("aml_screenings_result_idx").on(t.result, t.screenedAt)],
);

/** A data-subject request under the PDPA: see my data, correct it, or erase it. Due 30 days after it's made. */
export const dsrRequests = pgTable(
  "dsr_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    kind: text("kind").notNull(), // access | correction | erasure
    detail: text("detail").notNull().default(""),
    status: text("status").notNull().default("open"), // open | done | rejected
    dueAt: ts("due_at").notNull(),
    response: text("response"),
    handledBy: text("handled_by"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    closedAt: ts("closed_at"),
  },
  (t) => [uniqueIndex("dsr_requests_ref_uq").on(t.ref), index("dsr_requests_status_idx").on(t.status, t.dueAt)],
);

/**
 * Money Tuma owes a driver (completed jobs) or an agent point (parcels it handed over for others) for a period.
 * proposed → approved (by a second person) → sent (to FinOps) → paid; or rejected.
 */
export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull(),
    payeeType: text("payee_type").notNull(), // driver | point
    payeeId: text("payee_id").notNull(),
    payeeName: text("payee_name").notNull(),
    periodFrom: ts("period_from").notNull(),
    periodTo: ts("period_to").notNull(),
    amount: integer("amount").notNull(),
    lineCount: integer("line_count").notNull(),
    status: text("status").notNull().default("proposed"),
    approvalId: uuid("approval_id"),
    proposedBy: text("proposed_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    paidAt: ts("paid_at"),
    providerRef: text("provider_ref"),
  },
  (t) => [uniqueIndex("payouts_ref_uq").on(t.ref), index("payouts_status_idx").on(t.status, t.createdAt), index("payouts_payee_idx").on(t.payeeType, t.payeeId)],
);

/** What a payout pays for: each job or parcel once, ever (unless its payout is rejected). */
export const payoutLines = pgTable(
  "payout_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payoutId: uuid("payout_id")
      .notNull()
      .references(() => payouts.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // job | parcel
    sourceId: text("source_id").notNull(),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
  },
  (t) => [uniqueIndex("payout_lines_source_uq").on(t.sourceType, t.sourceId), index("payout_lines_payout_idx").on(t.payoutId)],
);

/**
 * Requests the app sent with an Idempotency-Key (the offline outbox replays them when the network is back): the
 * answer is kept, so a request sent twice is done once and answered the same both times. Cleared after 30 days.
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    body: jsonb("body"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] }), index("idempotency_keys_created_idx").on(t.createdAt)],
);
