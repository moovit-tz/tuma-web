CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"tin" text,
	"reg_no" text,
	"contact_name" text,
	"region" text,
	"district" text,
	"landmark" text,
	"lat" double precision,
	"lng" double precision,
	"sent" integer DEFAULT 0 NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "goods_photo" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipper_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "consignee_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_account_kind_phone_uq" ON "customers" USING btree ("account_id","kind","phone");--> statement-breakpoint
CREATE INDEX "customers_account_seen_idx" ON "customers" USING btree ("account_id","last_seen_at");