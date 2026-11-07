ALTER TABLE "team_invites" ADD COLUMN "code_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_code_uq" ON "team_invites" USING btree ("code_hash");