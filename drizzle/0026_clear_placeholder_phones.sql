-- Ondi sends "federated_<provider>_<id>" as the phone of a Google / Microsoft / Apple sign-up that has no number yet;
-- it was saved as the person's phone. Clear anything that isn't a phone number so Tuma asks for a real one.
UPDATE "users" SET "phone" = NULL WHERE "phone" IS NOT NULL AND "phone" !~ '^\+[0-9]{9,15}$';
