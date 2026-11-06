ALTER TABLE "accounts" ADD COLUMN "invoice_code" varchar(6);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_invoice_code_unique" UNIQUE("invoice_code");