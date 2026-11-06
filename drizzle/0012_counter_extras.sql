ALTER TABLE "accounts" ADD COLUMN "pay_on_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "receive_on_payment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "extras" jsonb DEFAULT '[]'::jsonb NOT NULL;