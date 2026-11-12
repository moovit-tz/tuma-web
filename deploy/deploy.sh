#!/bin/sh
# Ship Tuma to tuma.hudumika.tz the way the other Hudumika tools ship: rsync the source to the box, build there,
# migrate, restart, reload nginx. Run from tuma/portal on your machine: ./deploy/deploy.sh. First run: deploy/README.md.
set -eu
KEY="$HOME/.ssh/hudumika-vps-13.140.152.64"
HOST=root@13.140.152.64
DEST=/root/newapps-deploy/tuma
# Keepalives make a connection this host has dropped fail instead of hanging forever.
SSH="ssh -i $KEY -o ServerAliveInterval=15 -o ServerAliveCountMax=4 $HOST"
rsync -az --delete -e "ssh -i $KEY" --exclude node_modules --exclude .next --exclude uploads --exclude '.env*' \
  ./ "$HOST:$DEST/"
# Images are built here (the box is short on memory) and loaded there. `docker exec` hangs on this host, so nothing
# below uses it; nginx is untouched by routine deploys (its tuma block only proxies to tuma-portal).
docker build --platform linux/amd64 --target runner -t tuma-portal:prod .
docker build --platform linux/amd64 --target tools -t tuma-tools:prod .
# Upload as a file with resumable rsync: one long `docker save | ssh` stream gets cut off by this host.
IMG=$(mktemp -t tuma-images).tar.gz
docker save tuma-portal:prod tuma-tools:prod | gzip -1 > "$IMG"
for i in 1 2 3 4 5; do
  rsync -a --partial --timeout=60 -e "ssh -i $KEY -o ServerAliveInterval=15" "$IMG" "$HOST:/root/tuma-images.tar.gz" && break
  echo "upload interrupted, resuming ($i)"; sleep 5
done
rm -f "$IMG"
$SSH 'gunzip -c /root/tuma-images.tar.gz | docker load && rm /root/tuma-images.tar.gz'
# Migrations and the restart run as separate, retried connections: this host drops long-lived sessions, and a drop
# after the migration used to leave the old container running.
# The tools container doesn't always exit once its work is done (drizzle-kit keeps its connection open), so each step
# is time-limited on the box and judged by its output, and leftover tools containers are removed after.
RUN="cd $DEST/deploy && timeout 300 docker compose -f compose.tuma.yml run --rm -T tuma-tools"
MIG=$($SSH "$RUN pnpm drizzle-kit migrate" 2>&1) || true
echo "$MIG" | tail -3
echo "$MIG" | grep -q "migrations applied successfully" || { echo "❌ Migrations did not finish; the old version stays live."; exit 1; }
# Reference data is re-seeded on every deploy and is safe to skip: a failed seed warns, it never blocks the restart.
SEED=$($SSH "$RUN pnpm tsx scripts/seed.ts --platform" 2>&1) || true
echo "$SEED" | grep -q "^Done\." && echo "Reference data seeded." || { echo "$SEED" | tail -5; echo "⚠️  Seeding reference data didn't finish. The new version still goes live; re-run the seed later."; }
$SSH "docker ps -aq --filter name=tuma-tools-run | xargs -r docker rm -f" >/dev/null 2>&1 || true
for i in 1 2 3; do
  $SSH "cd $DEST/deploy && docker compose -f compose.tuma.yml up -d tuma-portal" && break
  echo "restart interrupted, retrying ($i)"; sleep 8
done
echo "Waiting for https://tuma.hudumika.tz …"
for i in $(seq 1 30); do curl -sf -o /dev/null https://tuma.hudumika.tz/en && { echo "Live."; exit 0; }; sleep 3; done
echo "Not answering yet: $SSH 'docker logs --tail 50 tuma-portal'"; exit 1
