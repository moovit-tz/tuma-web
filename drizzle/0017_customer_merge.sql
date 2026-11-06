ALTER TABLE "customers" ADD COLUMN "other_phones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "dup_dismissed" boolean DEFAULT false NOT NULL;