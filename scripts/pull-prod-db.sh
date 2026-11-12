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
LOCAL=tuma_postgres          # the local Docker Postgres (port 5544)
TARGET=tuma_prod
ENV=.env.local
[ -f "$ENV" ] || { echo "Run from tuma/portal (no $ENV here)."; exit 1; }
LUSER=$(docker exec "$LOCAL" printenv POSTGRES_USER)

TMP=$(mktemp -d); chmod 700 "$TMP"; DUMP="$TMP/tuma.dump"
trap 'rm -rf "$TMP"' EXIT

echo "== 1/4 dumping production (read-only)"
# docker exec hangs on this host, so pg_dump runs in its own container on tuma-postgres's network, time-limited.
$SSH 'set -eu
  NET=$(docker inspect -f "{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}" tuma-postgres | cut -d" " -f1)
  timeout 900 docker run --rm -i --name tuma-pg-dump --network "$NET" --env-file /root/newapps-deploy/infra/tuma-postgres.env postgres:16-alpine \
    sh -c "PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump -h tuma-postgres -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Fc --no-owner --no-acl"
  ' >"$DUMP" || true
$SSH "docker rm -f tuma-pg-dump" >/dev/null 2>&1 || true
docker exec -i "$LOCAL" pg_restore -l <"$DUMP" >/dev/null 2>&1 || { echo "The dump didn't come through complete. Nothing changed locally."; exit 1; }
echo "  $(du -h "$DUMP" | cut -f1) received"

echo "== 2/4 recreating local database $TARGET"
docker exec "$LOCAL" dropdb -U "$LUSER" --if-exists --force "$TARGET"
docker exec "$LOCAL" createdb -U "$LUSER" "$TARGET"

echo "== 3/4 restoring"
docker exec -i "$LOCAL" pg_restore -U "$LUSER" -d "$TARGET" --no-owner --no-acl --exit-on-error <"$DUMP"
echo "  $(docker exec "$LOCAL" psql -U "$LUSER" -d "$TARGET" -At -c 'select count(*) from accounts') businesses, $(docker exec "$LOCAL" psql -U "$LUSER" -d "$TARGET" -At -c 'select count(*) from users') users"

echo "== 4/4 pointing $ENV at $TARGET"
grep -q "^DATABASE_URL=.*/$TARGET\$" "$ENV" || {
  cp "$ENV" "$ENV.bak"
  sed -i '' -E "s|^(DATABASE_URL=.*/)[A-Za-z0-9_]+$|\1$TARGET|" "$ENV"
}
grep -q "^DATABASE_URL=.*/$TARGET\$" "$ENV" || { echo "Couldn't update DATABASE_URL in $ENV; set its database name to $TARGET yourself."; exit 1; }
echo "Done. Local Tuma now uses a copy of production. Back to the seeded data: cp $ENV.bak $ENV"
