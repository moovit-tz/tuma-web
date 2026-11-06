ALTER TYPE "public"."location_type" ADD VALUE 'collection_point';--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "country" text DEFAULT 'TZ' NOT NULL;