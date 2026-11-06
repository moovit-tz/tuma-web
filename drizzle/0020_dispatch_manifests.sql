CREATE TABLE "manifest_items" (
	"manifest_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"arrived_at" timestamp with time zone,
	"arrived_by" text,
	CONSTRAINT "manifest_items_manifest_id_shipment_id_pk" PRIMARY KEY("manifest_id","shipment_id")
);
--> statement-breakpoint
CREATE TABLE "manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"account_id" text NOT NULL,
	"from_branch_id" uuid,
	"mode" text NOT NULL,
	"to_account_id" text,
	"to_branch_id" uuid,
	"carrier" jsonb NOT NULL,
	"job_id" uuid,
	"status" text DEFAULT 'on_the_way' NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"arrived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "manifest_items" ADD CONSTRAINT "manifest_items_manifest_id_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifest_items" ADD CONSTRAINT "manifest_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manifest_items_shipment_idx" ON "manifest_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manifests_ref_uq" ON "manifests" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "manifests_from_idx" ON "manifests" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "manifests_to_idx" ON "manifests" USING btree ("to_branch_id","status");