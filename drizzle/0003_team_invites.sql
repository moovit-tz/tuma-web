ALTER TYPE "public"."account_status" ADD VALUE 'pending';--> statement-breakpoint
CREATE TABLE "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"roles" jsonb NOT NULL,
	"branch_id" uuid,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"locale" text DEFAULT 'sw' NOT NULL,
	"invited_by" text NOT NULL,
	"accepted_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_token_uq" ON "team_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "team_invites_account_idx" ON "team_invites" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "team_invites_phone_idx" ON "team_invites" USING btree ("phone","status");--> statement-breakpoint
-- Parcel agent owners can now build their team and add offices (also while their application is reviewed).
-- Roles are data: only add the grants if the role exists, and never touch other grants an admin made.
INSERT INTO "role_permissions" ("role_key", "permission")
SELECT 'parcel_agent', p FROM unnest(ARRAY['team.manage', 'partner.branches.manage']) AS p
WHERE EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'parcel_agent')
ON CONFLICT DO NOTHING;
