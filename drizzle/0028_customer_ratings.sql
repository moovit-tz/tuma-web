CREATE TABLE "customer_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"shipment_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"role" text NOT NULL,
	"stars" smallint NOT NULL,
	"note" text,
	"rated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_rated_by_users_id_fk" FOREIGN KEY ("rated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_ratings_once_uq" ON "customer_ratings" USING btree ("account_id","shipment_id","phone");--> statement-breakpoint
CREATE INDEX "customer_ratings_phone_idx" ON "customer_ratings" USING btree ("phone","created_at");