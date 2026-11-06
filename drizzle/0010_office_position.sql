ALTER TABLE "branches" ADD COLUMN "country" text DEFAULT 'TZ' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "lng" double precision;