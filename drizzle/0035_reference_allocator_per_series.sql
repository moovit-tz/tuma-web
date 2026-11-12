-- 0001 allowed one allocator row (CHECK id = 1); 0014 gave each series (PARCEL, CASE, …) its own row but kept that
-- check, so the first case reference in production failed. One row per series is enforced by
-- reference_allocator_series_unique; the forward-only/no-delete trigger and the 1–999 range still apply per row.
ALTER TABLE reference_allocator DROP CONSTRAINT IF EXISTS reference_allocator_singleton;
