-- Parcels whose receiver paid the delivery charge at handover are paid for: count them in the business's takings.
UPDATE "shipments" s SET "paid_at" = c."collected_at", "prepay_method" = CASE WHEN c."method" = 'mobile_money' THEN 'mobile_money' ELSE 'cash' END
FROM "cod_records" c
WHERE c."shipment_id" = s."id" AND c."status" = 'collected' AND c."fee_collected" > 0 AND s."paid_at" IS NULL AND c."collected_at" IS NOT NULL;--> statement-breakpoint
UPDATE "invoices" i SET "status" = 'paid', "amount_paid" = i."total", "paid_with" = s."prepay_method"
FROM "shipments" s
WHERE i."shipment_id" = s."id" AND s."paid_at" IS NOT NULL AND i."status" IN ('issued', 'partially_paid');
