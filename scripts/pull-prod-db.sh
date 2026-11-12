#!/bin/sh
# Copies the PRODUCTION Tuma database into a separate local database, tuma_prod, and points .env.local at it, so
# signing in locally with Ondi shows the same businesses, parcels and roles as tuma.hudumika.tz.
#
#   - Production is only read (pg_dump in a throwaway container on the box); nothing there changes.
#   - Your seeded local database (tuma) is left as it is; switch back by restoring .env.local.bak.
#   - The dump holds real customer data: it is kept in a private temp folder and deleted after the restore.
#   - Run it again whenever you want a fresh copy (tuma_prod is replaced each time).
# Run from tuma/portal: sh scripts/pull-prod-db.sh
set -eu
KEY="$HOME/.ssh/hudumika-vps-13.140.152.64"
HOST=root@13.140.152.64
SSH="ssh -i $KEY -o ServerAliveInterval=15 -o ServerAliveCountMax=4 $HOST"
LOCAL=dev_postgres           # this machine's shared dev-infra Postgres (localhost:5432)
TARGET=tuma_prod
ENV=.env.local
[ -f "$ENV" ] || { echo "Run from tuma/portal (no $ENV here)."; exit 1; }
LUSER=$(docker exec "$LOCAL" printenv POSTGRES_USER)

TMP=$(mktemp -d); chmod 700 "$TMP"; DUMP="$TMP/tuma.sql"
trap 'rm -rf "$TMP"' EXIT
END_MARK="PostgreSQL database dump complete"

echo "== 1/4 dumping production (read-only)"
# Plain SQL, so it loads into dev-infra's older Postgres. docker exec hangs on this host, so pg_dump runs in its own
# container; and since containers there often don't exit, we stop waiting as soon as the dump's last line arrives.
$SSH 'set -eu
  NET=$(docker inspect -f "{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}" tuma-postgres | cut -d" " -f1)
  timeout 900 docker run --rm -i --name tuma-pg-dump --network "$NET" --env-file /root/newapps-deploy/infra/tuma-postgres.env postgres:16-alpine \
    sh -c "PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump -h tuma-postgres -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --no-owner --no-acl"
  ' >"$DUMP" 2>/dev/null &
PID=$!
i=0
while kill -0 $PID 2>/dev/null && [ $i -lt 900 ]; do
  tail -c 200 "$DUMP" 2>/dev/null | grep -q "$END_MARK" && break
  sleep 2; i=$((i + 2))
done
kill $PID 2>/dev/null || true
$SSH "docker rm -f tuma-pg-dump" >/dev/null 2>&1 || true
tail -c 200 "$DUMP" | grep -q "$END_MARK" || { echo "The dump didn't come through complete. Nothing changed locally."; exit 1; }
echo "  $(du -h "$DUMP" | cut -f1) received"

echo "== 2/4 recreating local database $TARGET"
docker exec "$LOCAL" dropdb -U "$LUSER" --if-exists --force "$TARGET"
docker exec "$LOCAL" createdb -U "$LUSER" "$TARGET"

echo "== 3/4 restoring"
# Settings a newer Postgres writes that this one doesn't know are harmless; anything else stops the restore.
ERRS=$(docker exec -i "$LOCAL" psql -U "$LUSER" -d "$TARGET" -q <"$DUMP" 2>&1 | grep ERROR | grep -v "unrecognized configuration parameter" || true)
[ -z "$ERRS" ] || { echo "$ERRS" | head -5; echo "The restore had errors; $TARGET may be incomplete."; exit 1; }
echo "  $(docker exec "$LOCAL" psql -U "$LUSER" -d "$TARGET" -At -c 'select count(*) from accounts') businesses, $(docker exec "$LOCAL" psql -U "$LUSER" -d "$TARGET" -At -c 'select count(*) from users') users"

echo "== 4/4 pointing $ENV at $TARGET"
grep -q "^DATABASE_URL=.*/$TARGET\$" "$ENV" || {
  cp "$ENV" "$ENV.bak"
  sed -i '' -E "s|^(DATABASE_URL=.*/)[A-Za-z0-9_]+$|\1$TARGET|" "$ENV"
}
grep -q "^DATABASE_URL=.*/$TARGET\$" "$ENV" || { echo "Couldn't update DATABASE_URL in $ENV; set its database name to $TARGET yourself."; exit 1; }
echo "Done. Local Tuma now uses a copy of production. Back to the seeded data: cp $ENV.bak $ENV"
