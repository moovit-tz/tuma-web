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
