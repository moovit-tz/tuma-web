#!/bin/sh
# Installs deploy/nginx/nginx.conf on the Hudumika box: every proxy_pass looks its container up per request, so one
# stopped or slow container no longer stops hudumika-nginx from starting (the 2026-11-12 outage: every site down for
# ~25 min because "tasks-api"/"sign-api" weren't resolvable at the moment nginx restarted).
#
# Safe by construction:
#   - refuses if the live nginx.conf has changed since nginx.live-20261112.conf was taken (nothing is overwritten
#     blind); re-run transform.py on the new live file instead;
#   - backs up, validates in a throwaway nginx (time-limited, judged by its output);
#   - RELOADS nginx (SIGHUP) instead of restarting it: it keeps serving throughout, and if it rejected the file the
#     old config simply stays live;
#   - checks every site from outside and prints the one-line restore.
# Run from tuma/portal: ./deploy/nginx/install.sh
set -eu
KEY="$HOME/.ssh/hudumika-vps-13.140.152.64"
HOST=root@13.140.152.64
SSH="ssh -i $KEY -o ServerAliveInterval=15 -o ServerAliveCountMax=4 $HOST"
CONF=/root/newapps-deploy/infra/nginx.conf
HERE=$(cd "$(dirname "$0")" && pwd)
BAK=$CONF.bak-resolve-per-request-$(date +%Y%m%d%H%M%S)
SITES="sign.hudumika.tz/ hudumika.tz/ tuma.hudumika.tz/en crm.hudumika.tz/ ondi.hudumika.tz/ bliss.hudumika.tz/ bliss.hudumika.tz/v1/health tasks.hudumika.tz/ calendar.hudumika.tz/ contacts.hudumika.tz/ petti.hudumika.tz/ notes.hudumika.tz/ kanji.hudumika.tz/ complyos-api.hudumika.tz/"

sites() { # prints each site's status; returns non-zero if any is unreachable (000) or a 5xx
  bad=0
  for u in $SITES; do
    c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$u" || true)
    printf "  %-30s %s\n" "$u" "$c"
    case "$c" in 000 | 5*) bad=1 ;; esac
  done
  return $bad
}

echo "== 0/6 pre-flight: sites now"
sites || { echo "Something is already down; fix that first. Nothing changed."; exit 1; }

echo "== 1/6 is the live config still the one this was made from?"
LIVE=$($SSH "sha256sum $CONF" | cut -c1-64)
[ "$LIVE" = "$(cat "$HERE/nginx.live-20261112.sha256")" ] || {
  echo "The live nginx.conf has changed since 2026-11-12. Nothing changed. Refresh it:"
  echo "  scp $HOST:$CONF $HERE/nginx.live-20261112.conf && python3 $HERE/transform.py $HERE/nginx.live-20261112.conf $HERE/nginx.conf"
  echo "  shasum -a 256 $HERE/nginx.live-20261112.conf | cut -c1-64 > $HERE/nginx.live-20261112.sha256   # then review and re-run"
  exit 1
}

echo "== 2/6 backup → $BAK"
$SSH "cp $CONF $BAK"

echo "== 3/6 upload"
scp -i "$KEY" "$HERE/nginx.conf" "$HOST:/root/nginx.conf.new"

echo "== 4/6 validate (throwaway nginx on the real network with the real certs)"
OUT=$($SSH "timeout 60 docker run --rm --name nginx-conf-check --network hudumika -v /root/nginx.conf.new:/etc/nginx/nginx.conf:ro \
  -v newapps-deploy_certbot_certs:/etc/letsencrypt:ro nginx:alpine nginx -t" 2>&1) || true
$SSH "docker rm -f nginx-conf-check" >/dev/null 2>&1 || true
echo "$OUT" | grep -E "nginx: " || true
echo "$OUT" | grep -q "test is successful" || { echo "nginx rejected the new file. Nothing changed."; exit 1; }

echo "== 5/6 install (in place: nginx.conf is bind-mounted as a single file) and reload, no restart"
$SSH "cat /root/nginx.conf.new > $CONF && grep -q 'resolver 127.0.0.11 valid=10s ipv6=off;' $CONF"
$SSH "timeout 30 docker kill -s HUP hudumika-nginx" >/dev/null
sleep 5

echo "== 6/6 sites after"
if sites; then
  echo "Done. nginx now looks containers up per request."
else
  echo "WARNING: a site is down. Restore (reload, no restart):"
  echo "  $SSH 'cat $BAK > $CONF && docker kill -s HUP hudumika-nginx'"
  exit 1
fi
