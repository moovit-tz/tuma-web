-- The kinds of staff a parcel agent adds in the app: office staff (was "Counter staff"), courier / rider / driver,
-- and store keeper. Data only; existing grants are left as they are.
UPDATE "roles" SET "name" = 'Office staff' WHERE "key" = 'agent_staff' AND "name" = 'Counter staff';--> statement-breakpoint
INSERT INTO "roles" ("key", "name", "description", "surface", "system") VALUES
  ('agent_rider', 'Courier / rider / driver', 'Carries parcels for a parcel agent: picks them up, takes them on and delivers to the door.', 'partner', true),
  ('agent_storekeeper', 'Store keeper', 'Looks after the parcels kept at a parcel agent office: checks them in, keeps them and gets them ready for collection.', 'partner', true)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_key", "permission")
SELECT r.k, p.perm FROM (VALUES
  ('agent_rider', 'agent.workspace'), ('agent_rider', 'partner.cargo.read'), ('agent_rider', 'partner.cargo.operate'),
  ('agent_rider', 'shipment.dispatch'), ('agent_rider', 'shipment.deliver'), ('agent_rider', 'shipment.fail_attempt'), ('agent_rider', 'shipment.return'),
  ('agent_storekeeper', 'agent.workspace'), ('agent_storekeeper', 'partner.cargo.read'), ('agent_storekeeper', 'partner.cargo.operate'),
  ('agent_storekeeper', 'shipment.receive'), ('agent_storekeeper', 'shipment.hub_scan'), ('agent_storekeeper', 'shipment.collection'), ('agent_storekeeper', 'label.print')
) AS p(k2, perm)
JOIN (VALUES ('agent_rider'), ('agent_storekeeper')) AS r(k) ON r.k = p.k2
WHERE NOT EXISTS (SELECT 1 FROM "role_permissions" rp WHERE rp.role_key = r.k AND rp.permission = p.perm);
