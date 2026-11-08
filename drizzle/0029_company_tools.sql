CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"monthly_budget" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"line" text NOT NULL,
	"region" text NOT NULL,
	"district" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "company_policy" jsonb;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "company_account_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_uq" ON "departments" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "saved_places_user_idx" ON "saved_places" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_places_one_home_uq" ON "saved_places" USING btree ("user_id","kind") WHERE "saved_places"."kind" in ('home','work');--> statement-breakpoint
CREATE INDEX "shipments_company_idx" ON "shipments" USING btree ("company_account_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_entries_account_idx" ON "wallet_entries" USING btree ("account_id","created_at");--> statement-breakpoint
-- Parcels already sent in a company's name belong to that company.
UPDATE "shipments" s SET "company_account_id" = a."id" FROM "accounts" a
  WHERE a."type" = 'shipper' AND a."tin" IS NOT NULL AND s."shipper"->'company'->>'tin' = a."tin" AND s."company_account_id" IS NULL;--> statement-breakpoint
-- The company admin manages the company (staff, departments, policies, wallet, invoices, reports).
INSERT INTO "role_permissions" ("role_key", "permission")
  SELECT 'corporate_admin', 'corporate.manage' WHERE EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'corporate_admin')
  ON CONFLICT DO NOTHING;
