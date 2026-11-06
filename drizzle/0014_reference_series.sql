ALTER TABLE "reference_prefixes" DROP CONSTRAINT "reference_prefixes_prefix_unique";--> statement-breakpoint
ALTER TABLE "reference_prefixes" DROP CONSTRAINT "reference_prefixes_prefix_order_unique";--> statement-breakpoint
DROP INDEX "reference_prefixes_one_active";--> statement-breakpoint
ALTER TABLE "reference_allocator" ADD COLUMN "series" varchar(10) DEFAULT 'PARCEL' NOT NULL;--> statement-breakpoint
ALTER TABLE "reference_prefixes" ADD COLUMN "series" varchar(10) DEFAULT 'PARCEL' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_prefixes_series_prefix_uq" ON "reference_prefixes" USING btree ("series","prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_prefixes_series_order_uq" ON "reference_prefixes" USING btree ("series","prefix_order");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_prefixes_one_active" ON "reference_prefixes" USING btree ("series") WHERE status = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "reference_allocator" ADD CONSTRAINT "reference_allocator_series_unique" UNIQUE("series");