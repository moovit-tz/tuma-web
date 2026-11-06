-- Portal search uses trigram similarity.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('merchant', 'shipper', 'carrier', 'internal', 'partner');--> statement-breakpoint
CREATE TYPE "public"."cod_status" AS ENUM('due', 'collected', 'deposited', 'remitted', 'disputed', 'none');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('door', 'wakala_collect');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('scan', 'field_app', 'telematics', 'partner_api', 'system', 'manual', 'portal', 'api');--> statement-breakpoint
CREATE TYPE "public"."exception_status" AS ENUM('open', 'assigned', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."handover_mode" AS ENUM('pickup', 'wakala_dropoff', 'hub_bulk');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."kyb_status" AS ENUM('submitted', 'in_review', 'needs_info', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('hub', 'wakala', 'yard');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."partner_kind" AS ENUM('warehouse', 'freight_forwarder', 'parcel_company', 'transporter', 'parcel_agent');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('prepaid', 'account', 'pay_on_delivery', 'cod', 'to_pay', 'advance_balance');--> statement-breakpoint
CREATE TYPE "public"."service_level" AS ENUM('same_day', 'next_day', 'standard');--> statement-breakpoint
CREATE TYPE "public"."shipment_state" AS ENUM('DRAFT', 'CREATED', 'AWAITING_HANDOVER', 'RECEIVED', 'AT_HUB', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ATTEMPT_FAILED', 'READY_FOR_COLLECTION', 'DELIVERED', 'RETURNING', 'RETURNED', 'REQUESTED', 'QUOTED', 'BOOKED', 'ALLOCATED', 'LOADING', 'AT_CHECKPOINT', 'ARRIVED', 'OFFLOADING', 'CLOSED', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'on_trip', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."waybill_type" AS ENUM('parcel', 'cargo');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "account_type" NOT NULL,
	"partner_kind" "partner_kind",
	"name" text NOT NULL,
	"tin" text,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"allowed_service_levels" jsonb DEFAULT '["standard","next_day"]'::jsonb NOT NULL,
	"rate_card_ref" text,
	"payment_policy" text DEFAULT 'warn' NOT NULL,
	"pod_policy" text DEFAULT 'otp_or_signature' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"account_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kyb_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"workflow" jsonb NOT NULL,
	"commission_bps" integer NOT NULL,
	"wallet_ref" text,
	"seal_site_ref" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"device" text,
	"prev_hash" text,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"region" text NOT NULL,
	"district" text,
	"address" text,
	"phone" text,
	"is_head" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"tax_ref" text,
	"finops_ref" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cod_records" (
	"shipment_id" uuid PRIMARY KEY NOT NULL,
	"amount_due" integer NOT NULL,
	"amount_collected" integer DEFAULT 0 NOT NULL,
	"fee_due" integer DEFAULT 0 NOT NULL,
	"fee_collected" integer DEFAULT 0 NOT NULL,
	"method" text,
	"holder_id" text,
	"status" "cod_status" DEFAULT 'due' NOT NULL,
	"collected_at" timestamp with time zone,
	"deposited_at" timestamp with time zone,
	"remitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "driver_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"challenge" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"phone" text NOT NULL,
	"region" text NOT NULL,
	"vehicle_kind" text NOT NULL,
	"plate" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"last_seen_at" timestamp with time zone,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" uuid NOT NULL,
	"piece_seq" smallint,
	"type" text NOT NULL,
	"state_after" "shipment_state",
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"clock_skew" boolean DEFAULT false NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"location_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"source" "event_source" NOT NULL,
	"reason_code" text,
	"estimated" boolean DEFAULT false NOT NULL,
	"note" text,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"status" "exception_status" DEFAULT 'open' NOT NULL,
	"owner_id" text,
	"note" text,
	"sla_due_at" timestamp with time zone NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"bliss_case_id" text
);
--> statement-breakpoint
CREATE TABLE "job_shipments" (
	"job_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "job_shipments_job_id_shipment_id_pk" PRIMARY KEY("job_id","shipment_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"account_id" text NOT NULL,
	"kind" "waybill_type" NOT NULL,
	"region" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"required_vehicle" text,
	"pickup" jsonb NOT NULL,
	"weight_g" integer DEFAULT 0 NOT NULL,
	"payout" integer NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"sla_at" timestamp with time zone,
	"driver_id" text,
	"phase" text,
	"distance_m" integer,
	"trail" jsonb,
	"note" text,
	"cancel_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kyb_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"user_id" text NOT NULL,
	"account_kind" text DEFAULT 'parcel_agent' NOT NULL,
	"status" "kyb_status" DEFAULT 'submitted' NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"tin" text NOT NULL,
	"licence_number" text,
	"licence_file" text,
	"office" jsonb NOT NULL,
	"contact" jsonb NOT NULL,
	"workflow" jsonb NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"comply_ref" text,
	"decision_note" text,
	"account_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyb_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "kyb_status" NOT NULL,
	"note" text,
	"source" text NOT NULL,
	"external_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "location_type" NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"district" text NOT NULL,
	"ward" text,
	"street" text,
	"landmark" text,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"hours" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"template" text NOT NULL,
	"language" text NOT NULL,
	"channel" text NOT NULL,
	"recipient_masked" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"topic" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"waybill" text,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "partner_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_account_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"tin" text,
	"region" text,
	"credit_terms_days" integer DEFAULT 14 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_account_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"number" text NOT NULL,
	"issue_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'issued' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_account_id" text NOT NULL,
	"client_id" uuid,
	"invoice_id" uuid,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"received_at" timestamp with time zone NOT NULL,
	"reconciled_at" timestamp with time zone,
	"reconciled_by" text,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pieces" (
	"shipment_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"weight_g" integer NOT NULL,
	"length_cm" integer NOT NULL,
	"width_cm" integer NOT NULL,
	"height_cm" integer NOT NULL,
	"description" text,
	CONSTRAINT "pieces_shipment_id_seq_pk" PRIMARY KEY("shipment_id","seq")
);
--> statement-breakpoint
CREATE TABLE "reason_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"label_en" text NOT NULL,
	"label_sw" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_key" text NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_key_permission_pk" PRIMARY KEY("role_key","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"surface" text NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"account_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waybill" text NOT NULL,
	"type" "waybill_type" NOT NULL,
	"account_id" text NOT NULL,
	"merchant_ref" text,
	"handling_partner_id" text,
	"partner_client_id" uuid,
	"vehicle_id" uuid,
	"handling_branch_id" uuid,
	"partner_invoice_id" uuid,
	"state" "shipment_state" NOT NULL,
	"exception" boolean DEFAULT false NOT NULL,
	"service_level" "service_level",
	"payment_terms" "payment_terms" NOT NULL,
	"handover_mode" "handover_mode",
	"delivery_mode" "delivery_mode",
	"shipper" jsonb NOT NULL,
	"consignee" jsonb NOT NULL,
	"pickup_location_id" text,
	"delivery_location_id" text,
	"delivery_instructions" text,
	"goods_description" text NOT NULL,
	"goods_category" text NOT NULL,
	"declared_value" integer,
	"cod_amount" integer,
	"prepay_method" text,
	"collect_methods" jsonb DEFAULT '["cash","mobile_money"]'::jsonb NOT NULL,
	"special_handling" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prohibited_declared" boolean DEFAULT false NOT NULL,
	"pieces_count" smallint DEFAULT 1 NOT NULL,
	"actual_weight_g" integer NOT NULL,
	"volumetric_weight_g" integer NOT NULL,
	"chargeable_weight_g" integer NOT NULL,
	"total_charge" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"promised_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"return_of_id" uuid,
	"label_prints" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"channel" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"kind" text NOT NULL,
	"waybill" text,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"body" jsonb NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"source" text NOT NULL,
	"external_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waybill" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"account_id" text,
	"branch_id" uuid,
	"roles" jsonb NOT NULL,
	"granted_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"time_zone" text DEFAULT 'Africa/Dar_es_Salaam' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"plate" text NOT NULL,
	"kind" text NOT NULL,
	"make" text,
	"capacity_kg" integer NOT NULL,
	"volume_m3" double precision,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"branch_id" uuid,
	"driver_name" text,
	"driver_phone" text,
	"insurance_expiry" timestamp with time zone,
	"inspection_expiry" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_kyb_id_kyb_applications_id_fk" FOREIGN KEY ("kyb_id") REFERENCES "public"."kyb_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_snapshots" ADD CONSTRAINT "charge_snapshots_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cod_records" ADD CONSTRAINT "cod_records_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_handoffs" ADD CONSTRAINT "driver_handoffs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_reason_code_reason_codes_code_fk" FOREIGN KEY ("reason_code") REFERENCES "public"."reason_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_reason_code_reason_codes_code_fk" FOREIGN KEY ("reason_code") REFERENCES "public"."reason_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shipments" ADD CONSTRAINT "job_shipments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shipments" ADD CONSTRAINT "job_shipments_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyb_applications" ADD CONSTRAINT "kyb_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyb_applications" ADD CONSTRAINT "kyb_applications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyb_events" ADD CONSTRAINT "kyb_events_application_id_kyb_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."kyb_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_partner_account_id_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_partner_account_id_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_client_id_partner_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."partner_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_partner_account_id_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_client_id_partner_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."partner_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_invoice_id_partner_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."partner_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pickup_location_id_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_location_id_locations_id_fk" FOREIGN KEY ("delivery_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_updates" ADD CONSTRAINT "support_updates_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_code_uq" ON "branches" USING btree ("account_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "charge_snapshots_version_uq" ON "charge_snapshots" USING btree ("shipment_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_handoffs_code_uq" ON "driver_handoffs" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_phone_uq" ON "drivers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "drivers_pool_idx" ON "drivers" USING btree ("account_id","region","status");--> statement-breakpoint
CREATE INDEX "events_shipment_occurred_idx" ON "events" USING btree ("shipment_id","occurred_at");--> statement-breakpoint
CREATE INDEX "exceptions_status_idx" ON "exceptions" USING btree ("status","sla_due_at");--> statement-breakpoint
CREATE INDEX "job_shipments_shipment_idx" ON "job_shipments" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_ref_uq" ON "jobs" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "jobs_pool_idx" ON "jobs" USING btree ("account_id","status","region");--> statement-breakpoint
CREATE INDEX "jobs_driver_idx" ON "jobs" USING btree ("driver_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "kyb_user_uq" ON "kyb_applications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kyb_ref_uq" ON "kyb_applications" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "kyb_status_idx" ON "kyb_applications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "kyb_events_ext_uq" ON "kyb_events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "kyb_events_app_idx" ON "kyb_events" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE INDEX "notifications_shipment_idx" ON "notifications" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idem_uq" ON "outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_status_idx" ON "outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "partner_clients_partner_idx" ON "partner_clients" USING btree ("partner_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_invoices_number_uq" ON "partner_invoices" USING btree ("partner_account_id","number");--> statement-breakpoint
CREATE INDEX "partner_invoices_client_idx" ON "partner_invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "partner_payments_partner_idx" ON "partner_payments" USING btree ("partner_account_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_waybill_uq" ON "shipments" USING btree ("waybill");--> statement-breakpoint
CREATE INDEX "shipments_account_created_idx" ON "shipments" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "shipments_state_idx" ON "shipments" USING btree ("state");--> statement-breakpoint
CREATE INDEX "shipments_partner_idx" ON "shipments" USING btree ("handling_partner_id","state");--> statement-breakpoint
CREATE INDEX "shipments_merchant_ref_idx" ON "shipments" USING btree ("account_id","merchant_ref");--> statement-breakpoint
CREATE INDEX "shipments_consignee_phone_idx" ON "shipments" USING btree (("consignee"->>'phone'));--> statement-breakpoint
CREATE UNIQUE INDEX "support_requests_ref_uq" ON "support_requests" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "support_requests_kind_idx" ON "support_requests" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "support_updates_request_idx" ON "support_updates" USING btree ("request_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_updates_ext_uq" ON "support_updates" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "tracking_otps_waybill_idx" ON "tracking_otps" USING btree ("waybill","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_uq" ON "vehicles" USING btree ("account_id","plate");