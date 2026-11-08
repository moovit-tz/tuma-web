CREATE TABLE "access_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"decision" text NOT NULL,
	"roles" jsonb NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text
);
--> statement-breakpoint
ALTER TABLE "access_reviews" ADD CONSTRAINT "access_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_reviews_user_idx" ON "access_reviews" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "approval_requests_subject_idx" ON "approval_requests" USING btree ("subject_id");--> statement-breakpoint
-- Staff roles get the admin console's permissions (the seed only adds them to roles it creates).
INSERT INTO "role_permissions" ("role_key", "permission")
  SELECT r.key, p.permission FROM (VALUES
    ('control_tower', 'tower.view'),
    ('service_agent', 'support.view'),
    ('finance_officer', 'finance.view'), ('finance_officer', 'finance.reconcile'),
    ('tuma_admin', 'tower.view'), ('tuma_admin', 'support.view'), ('tuma_admin', 'pii.view'), ('tuma_admin', 'finance.view'),
    ('tuma_admin', 'finance.reconcile'), ('tuma_admin', 'approvals.decide'), ('tuma_admin', 'access.review'),
    ('tuma_admin', 'corporate.manage')
  ) AS p(role_key, permission)
  JOIN "roles" r ON r.key = p.role_key
  ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles" ("key", "name", "description", "surface", "system")
  VALUES ('compliance_officer', 'Compliance officer', 'Reviews businesses, staff access and the audit trail; approves sensitive requests.', 'console', true)
  ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_key", "permission")
  SELECT 'compliance_officer', p FROM unnest(ARRAY['shipment.read.all','kyb.review','audit.read','access.review','approvals.decide','pii.view','support.view','finance.view']) AS p
  ON CONFLICT DO NOTHING;
