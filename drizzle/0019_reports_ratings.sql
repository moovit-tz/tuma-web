CREATE TABLE "customer_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"customer_id" uuid,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"reported_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"phone" text NOT NULL,
	"stars" smallint,
	"issue" text,
	"comment" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "customer_reports" ADD CONSTRAINT "customer_reports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reports" ADD CONSTRAINT "customer_reports_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reports" ADD CONSTRAINT "customer_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_ratings" ADD CONSTRAINT "parcel_ratings_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_ratings" ADD CONSTRAINT "parcel_ratings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_reports_phone_idx" ON "customer_reports" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_reports_once_uq" ON "customer_reports" USING btree ("account_id","phone","reason");--> statement-breakpoint
CREATE UNIQUE INDEX "parcel_ratings_shipment_uq" ON "parcel_ratings" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parcel_ratings_token_uq" ON "parcel_ratings" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "parcel_ratings_account_idx" ON "parcel_ratings" USING btree ("account_id","rated_at");