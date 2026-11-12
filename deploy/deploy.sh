#!/bin/sh
# Ship Tuma to tuma.hudumika.tz the way the other Hudumika tools ship: rsync the source to the box, build there,
# migrate, restart, reload nginx. Run from tuma/portal on your machine: ./deploy/deploy.sh. First run: deploy/README.md.
set -eu
KEY="$HOME/.ssh/hudumika-vps-13.140.152.64"
HOST=root@13.140.152.64
DEST=/root/newapps-deploy/tuma
SSH="ssh -i $KEY $HOST"
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
$SSH "cd $DEST/deploy && docker compose -f compose.tuma.yml run --rm tuma-tools pnpm drizzle-kit migrate"
# Reference data is re-seeded on every deploy and is safe to skip: a failed seed warns, it never blocks the restart.
$SSH "cd $DEST/deploy && docker compose -f compose.tuma.yml run --rm tuma-tools pnpm tsx scripts/seed.ts --platform" ||
  echo "⚠️  Seeding reference data failed (see above). The new version still goes live; re-run the seed later."
for i in 1 2 3; do
  $SSH "cd $DEST/deploy && docker compose -f compose.tuma.yml up -d tuma-portal" && break
  echo "restart interrupted, retrying ($i)"; sleep 8
done
echo "Waiting for https://tuma.hudumika.tz …"
for i in $(seq 1 30); do curl -sf -o /dev/null https://tuma.hudumika.tz/en && { echo "Live."; exit 0; }; sleep 3; done
echo "Not answering yet: $SSH 'docker logs --tail 50 tuma-portal'"; exit 1
