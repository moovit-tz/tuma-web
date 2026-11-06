CREATE TABLE "payment_settings" (
	"account_id" text PRIMARY KEY NOT NULL,
	"momo_enabled" boolean DEFAULT false NOT NULL,
	"payout" jsonb,
	"payout_schedule" text DEFAULT 'daily' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
