CREATE TABLE "generated_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(12) NOT NULL,
	"reference_type_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"source_system" varchar(30) NOT NULL,
	"tenant_id" text,
	"prefix_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"format_version" smallint NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(100) NOT NULL,
	CONSTRAINT "generated_references_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "reference_allocator" (
	"id" smallint PRIMARY KEY NOT NULL,
	"active_prefix_id" uuid NOT NULL,
	"next_sequence" integer NOT NULL,
	"format_version" smallint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_system" varchar(30) NOT NULL,
	"idempotency_key" varchar(150) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"generated_reference_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_prefixes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" varchar(3) NOT NULL,
	"prefix_order" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"allocated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exhausted_at" timestamp with time zone,
	CONSTRAINT "reference_prefixes_prefix_unique" UNIQUE("prefix"),
	CONSTRAINT "reference_prefixes_prefix_order_unique" UNIQUE("prefix_order")
);
--> statement-breakpoint
CREATE TABLE "reference_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"description" varchar(150) NOT NULL,
	"source_system" varchar(30) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "generated_references" ADD CONSTRAINT "generated_references_reference_type_id_reference_types_id_fk" FOREIGN KEY ("reference_type_id") REFERENCES "public"."reference_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_references" ADD CONSTRAINT "generated_references_prefix_id_reference_prefixes_id_fk" FOREIGN KEY ("prefix_id") REFERENCES "public"."reference_prefixes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_allocator" ADD CONSTRAINT "reference_allocator_active_prefix_id_reference_prefixes_id_fk" FOREIGN KEY ("active_prefix_id") REFERENCES "public"."reference_prefixes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_idempotency" ADD CONSTRAINT "reference_idempotency_generated_reference_id_generated_references_id_fk" FOREIGN KEY ("generated_reference_id") REFERENCES "public"."generated_references"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generated_references_entity_uq" ON "generated_references" USING btree ("source_system","reference_type_id","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generated_references_prefix_seq_uq" ON "generated_references" USING btree ("prefix_id","sequence_number");--> statement-breakpoint
CREATE INDEX "generated_references_issued_idx" ON "generated_references" USING btree ("issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_idempotency_uq" ON "reference_idempotency" USING btree ("source_system","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_prefixes_one_active" ON "reference_prefixes" USING btree ("status") WHERE status = 'ACTIVE';--> statement-breakpoint
-- Hudumika reference registry guards (Reference Number Service spec §4 "Database integrity rules").
-- Issued references and their idempotency records are append-only, prefixes never come back once exhausted or
-- retired, and the allocator cursor only moves forward. An administrative correction has to disable a trigger
-- deliberately (and be audited); application code can't get round these.
CREATE OR REPLACE FUNCTION hudumika_ref_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: issued references are never changed or deleted', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS generated_references_append_only ON generated_references;--> statement-breakpoint
CREATE TRIGGER generated_references_append_only BEFORE UPDATE OR DELETE ON generated_references FOR EACH ROW EXECUTE FUNCTION hudumika_ref_append_only();--> statement-breakpoint
DROP TRIGGER IF EXISTS reference_idempotency_append_only ON reference_idempotency;--> statement-breakpoint
CREATE TRIGGER reference_idempotency_append_only BEFORE UPDATE OR DELETE ON reference_idempotency FOR EACH ROW EXECUTE FUNCTION hudumika_ref_append_only();--> statement-breakpoint
CREATE OR REPLACE FUNCTION hudumika_ref_prefix_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'reference prefixes are never deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.prefix <> OLD.prefix OR NEW.prefix_order <> OLD.prefix_order THEN
    RAISE EXCEPTION 'a reference prefix cannot be renamed or reordered' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status IN ('EXHAUSTED', 'RETIRED') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'prefix % is % and can never be reactivated', OLD.prefix, OLD.status USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS reference_prefixes_guard ON reference_prefixes;--> statement-breakpoint
CREATE TRIGGER reference_prefixes_guard BEFORE UPDATE OR DELETE ON reference_prefixes FOR EACH ROW EXECUTE FUNCTION hudumika_ref_prefix_guard();--> statement-breakpoint
CREATE OR REPLACE FUNCTION hudumika_ref_allocator_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_order int; new_order int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'the reference allocator cannot be deleted' USING ERRCODE = 'check_violation';
  END IF;
  SELECT prefix_order INTO old_order FROM reference_prefixes WHERE id = OLD.active_prefix_id;
  SELECT prefix_order INTO new_order FROM reference_prefixes WHERE id = NEW.active_prefix_id;
  IF new_order < old_order OR (new_order = old_order AND NEW.next_sequence <= OLD.next_sequence) THEN
    RAISE EXCEPTION 'the reference allocator only moves forward' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS reference_allocator_guard ON reference_allocator;--> statement-breakpoint
CREATE TRIGGER reference_allocator_guard BEFORE UPDATE OR DELETE ON reference_allocator FOR EACH ROW EXECUTE FUNCTION hudumika_ref_allocator_guard();--> statement-breakpoint
ALTER TABLE reference_allocator DROP CONSTRAINT IF EXISTS reference_allocator_singleton;--> statement-breakpoint
ALTER TABLE reference_allocator ADD CONSTRAINT reference_allocator_singleton CHECK (id = 1);--> statement-breakpoint
ALTER TABLE reference_allocator DROP CONSTRAINT IF EXISTS reference_allocator_seq_range;--> statement-breakpoint
ALTER TABLE reference_allocator ADD CONSTRAINT reference_allocator_seq_range CHECK (next_sequence BETWEEN 1 AND 999);
