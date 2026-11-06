CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"customer_id" uuid,
	"shipment_id" uuid,
	"number" text NOT NULL,
	"bill_to" jsonb NOT NULL,
	"issue_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"paid_with" text,
	"status" "invoice_status" DEFAULT 'issued' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"reference" text NOT NULL,
	"provider_id" text,
	"msisdn" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_message" text,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_payments" ADD CONSTRAINT "parcel_payments_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_payments" ADD CONSTRAINT "parcel_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "invoices" USING btree ("account_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_shipment_uq" ON "invoices" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parcel_payments_reference_uq" ON "parcel_payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "parcel_payments_shipment_idx" ON "parcel_payments" USING btree ("shipment_id");