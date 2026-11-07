CREATE TABLE "dispatchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"plate" text NOT NULL,
	"status" text DEFAULT 'unvetted' NOT NULL,
	"trips" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispatchers" ADD CONSTRAINT "dispatchers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatchers" ADD CONSTRAINT "dispatchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dispatchers_acct_phone_uq" ON "dispatchers" USING btree ("account_id","phone");--> statement-breakpoint
CREATE INDEX "dispatchers_phone_idx" ON "dispatchers" USING btree ("phone");