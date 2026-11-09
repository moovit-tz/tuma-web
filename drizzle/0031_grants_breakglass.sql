CREATE TABLE "access_elevations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role_key" text NOT NULL,
	"reason" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "scope" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "max_amount" bigint;--> statement-breakpoint
ALTER TABLE "access_elevations" ADD CONSTRAINT "access_elevations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_elevations_user_idx" ON "access_elevations" USING btree ("user_id","expires_at");--> statement-breakpoint
-- Break-glass: the permission for Tuma admins and a new on-call role.
INSERT INTO "roles" ("key", "name", "description", "surface", "system")
  VALUES ('on_call', 'On-call', 'Watches the network out of hours; can take a staff role for a few hours in an emergency (break-glass).', 'console', true)
  ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_key", "permission")
  SELECT p.role_key, p.permission FROM (VALUES
    ('on_call', 'shipment.read.all'), ('on_call', 'tower.view'), ('on_call', 'breakglass.request'),
    ('tuma_admin', 'breakglass.request')
  ) AS p(role_key, permission)
  JOIN "roles" r ON r.key = p.role_key
  ON CONFLICT DO NOTHING;--> statement-breakpoint
-- A finance officer may ask for wallet adjustments up to TZS 1,000,000 each; admins can change it on the grant.
UPDATE "role_permissions" SET "max_amount" = 1000000 WHERE "role_key" = 'finance_officer' AND "permission" = 'finance.reconcile' AND "max_amount" IS NULL;
