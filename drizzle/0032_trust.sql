CREATE TABLE "aml_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"name" text NOT NULL,
	"result" text NOT NULL,
	"matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screened_by" text NOT NULL,
	"screened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"shipment_id" uuid NOT NULL,
	"waybill" text NOT NULL,
	"kind" text NOT NULL,
	"claimant_user_id" text,
	"claimant_name" text NOT NULL,
	"claimant_phone" text,
	"declared_value" integer,
	"amount_claimed" integer NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"liable_party" text,
	"liable_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"proposed_amount" integer,
	"settled_amount" integer,
	"recovered_amount" integer DEFAULT 0 NOT NULL,
	"decision_note" text,
	"handled_by" text,
	"approval_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dsr_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"kind" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"response" text,
	"handled_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kyc_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tier" smallint NOT NULL,
	"full_name" text NOT NULL,
	"id_type" text NOT NULL,
	"id_last4" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"submitted_by" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payout_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"payee_type" text NOT NULL,
	"payee_id" text NOT NULL,
	"payee_name" text NOT NULL,
	"period_from" timestamp with time zone NOT NULL,
	"period_to" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"line_count" integer NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"approval_id" uuid,
	"proposed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"provider_ref" text
);
--> statement-breakpoint
CREATE TABLE "risk_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_label" text NOT NULL,
	"score" integer NOT NULL,
	"details" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"case_id" uuid,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_label" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"outcome" text,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "risk_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"subject_label" text NOT NULL,
	"reason" text NOT NULL,
	"case_id" uuid,
	"placed_by" text NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by" text,
	"released_at" timestamp with time zone,
	"approval_id" uuid
);
--> statement-breakpoint
CREATE TABLE "risk_rules" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"params" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"country" text,
	"source" text NOT NULL,
	"note" text,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_tier" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_user_id_users_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsr_requests" ADD CONSTRAINT "dsr_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_lines" ADD CONSTRAINT "payout_lines_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aml_screenings_result_idx" ON "aml_screenings" USING btree ("result","screened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claims_ref_uq" ON "claims" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "claims_shipment_idx" ON "claims" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dsr_requests_ref_uq" ON "dsr_requests" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "dsr_requests_status_idx" ON "dsr_requests" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "kyc_records_status_idx" ON "kyc_records" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "kyc_records_user_idx" ON "kyc_records" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_lines_source_uq" ON "payout_lines" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "payout_lines_payout_idx" ON "payout_lines" USING btree ("payout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_ref_uq" ON "payouts" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payouts_payee_idx" ON "payouts" USING btree ("payee_type","payee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_alerts_dedupe_uq" ON "risk_alerts" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "risk_alerts_status_idx" ON "risk_alerts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "risk_alerts_subject_idx" ON "risk_alerts" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_cases_ref_uq" ON "risk_cases" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "risk_cases_status_idx" ON "risk_cases" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "risk_holds_subject_idx" ON "risk_holds" USING btree ("subject_type","subject_id");--> statement-breakpoint
INSERT INTO "roles" ("key", "name", "description", "surface", "system") VALUES
  ('claims_adjuster', 'Claims adjuster', 'Handles claims for lost and damaged parcels: evidence, liability and settlement proposals.', 'console', true),
  ('risk_analyst', 'Risk & fraud analyst', 'Works the risk alerts and cases, tunes the rules and freezes accounts.', 'console', true)
  ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_key", "permission")
  SELECT p.role_key, p.permission FROM (VALUES
    ('claims_adjuster', 'shipment.read.all'), ('claims_adjuster', 'support.view'), ('claims_adjuster', 'claims.handle'), ('claims_adjuster', 'claims.decide'),
    ('risk_analyst', 'shipment.read.all'), ('risk_analyst', 'tower.view'), ('risk_analyst', 'risk.view'), ('risk_analyst', 'risk.manage'), ('risk_analyst', 'risk.freeze'), ('risk_analyst', 'aml.screen'),
    ('compliance_officer', 'kyc.review'), ('compliance_officer', 'aml.screen'), ('compliance_officer', 'dsr.handle'), ('compliance_officer', 'risk.view'),
    ('finance_officer', 'payout.propose'), ('service_agent', 'claims.handle'),
    ('tuma_admin', 'claims.handle'), ('tuma_admin', 'claims.decide'), ('tuma_admin', 'risk.view'), ('tuma_admin', 'risk.manage'), ('tuma_admin', 'risk.freeze'),
    ('tuma_admin', 'kyc.review'), ('tuma_admin', 'aml.screen'), ('tuma_admin', 'dsr.handle'), ('tuma_admin', 'payout.propose')
  ) AS p(role_key, permission)
  JOIN "roles" r ON r.key = p.role_key
  ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "risk_rules" ("key", "name", "description", "params") VALUES
  ('velocity', 'Booking velocity', 'One sender books far more parcels in an hour than usual.', '{"perHour": 30}'),
  ('ghost_delivery', 'Ghost delivery', 'Delivered far from the drop-off pin, or within seconds of going out for delivery.', '{"maxKm": 2, "minSeconds": 60}'),
  ('cash_shortfall', 'Cash shortfall', 'Cash collected on delivery and not handed in after some days.', '{"days": 3, "minAmount": 50000}'),
  ('reported_phone', 'Reported by agents', 'A phone number reported by several agent offices.', '{"reports": 2}')
  ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Owners of approved businesses passed KYB: tier 3.
UPDATE "users" SET "kyc_tier" = 3 WHERE "id" IN (SELECT "user_id" FROM "kyb_applications" WHERE "status" = 'approved');
