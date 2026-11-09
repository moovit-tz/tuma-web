CREATE TABLE "platform_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"offer" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"contract_ends_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "platform_partners_kind_idx" ON "platform_partners" USING btree ("kind","status");