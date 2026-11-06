-- Why a parcel in hand at an agent's counter was cancelled (the app asks for one).
INSERT INTO "reason_codes" ("code", "kind", "label_en", "label_sw") VALUES
  ('CN01', 'cancellation', 'Sender asked to cancel', 'Mtumaji ameomba kusitisha'),
  ('CN02', 'cancellation', 'Prohibited or restricted item found', 'Bidhaa iliyokatazwa au yenye masharti imegundulika'),
  ('CN03', 'cancellation', 'Damaged or badly packed; sender took it back', 'Kimeharibika au kimefungwa vibaya; mtumaji amekichukua'),
  ('CN04', 'cancellation', 'Booked by mistake (wrong details or twice)', 'Kimesajiliwa kimakosa (taarifa si sahihi au mara mbili)'),
  ('CN05', 'cancellation', 'Sender never paid', 'Mtumaji hajalipa'),
  ('CN06', 'cancellation', 'Other (see the note)', 'Nyingine (angalia maelezo)')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
-- The owner of a parcel agent office may cancel a parcel it holds (with one of the reasons above).
INSERT INTO "role_permissions" ("role_key", "permission")
SELECT 'parcel_agent', 'shipment.cancel' WHERE EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'parcel_agent')
ON CONFLICT DO NOTHING;
