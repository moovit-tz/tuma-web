#!/bin/sh
# Run ON the Hudumika box: sh fill-service-keys.sh (from anywhere). Fills the keys that let Tuma, CRM, Ondi and
# Bliss call each other, in the infra/*.env files, without printing any value. Keys already set are kept, so it is
# safe to run again. Then recreates tuma-portal and crm-portal so they read the new values.
#
#   infra/tuma.env  ONDI_ADMIN_KEY     = infra/ondi-api.env ADMIN_KEY   (Tuma provisions approved businesses in Ondi)
#   infra/tuma.env  CRM_SERVICE_KEY    = infra/crm.env TUMA_SERVICE_KEY (CRM reads Tuma customers)
#   infra/crm.env   BLISS_SERVICE_KEY  = Bliss's CRM_SERVICE_KEY        (CRM reads Bliss tickets; only if Bliss's env file exists)
set -eu
cd /root/newapps-deploy
TUMA=infra/tuma.env CRM=infra/crm.env ONDI=infra/ondi-api.env
for f in "$TUMA" "$CRM" "$ONDI"; do [ -f "$f" ] || { echo "Missing $f — stopping, nothing changed."; exit 1; }; done
BLISS=""
for f in infra/bliss-api.env infra/bliss.env; do [ -f "$f" ] && BLISS=$f && break; done

get() { grep "^$2=" "$1" 2>/dev/null | tail -1 | cut -d= -f2- || true; }
# A value that is empty or still the example's "<…>" placeholder counts as unset.
real() { case "$1" in "" | "<"*) return 1 ;; *) return 0 ;; esac; }
put() { # file name value: replace the line, or add it
  if grep -q "^$2=" "$1"; then
    tmp=$(mktemp) && awk -v k="$2" -v v="$3" 'BEGIN{FS=OFS="="} $1==k{print k "=" v; next} {print}' "$1" >"$tmp" && cat "$tmp" >"$1" && rm -f "$tmp"
  else printf '\n%s=%s\n' "$2" "$3" >>"$1"; fi
  echo "  set  $2 in $1"
}
keep() { echo "  kept $2 in $1"; }
pair() { # fileA nameA fileB nameB: both sides end up with the same key
  a=$(get "$1" "$2"); b=$(get "$3" "$4")
  if real "$a" && [ "$a" = "$b" ]; then keep "$1" "$2"; keep "$3" "$4"; return; fi
  if real "$a"; then v=$a; elif real "$b"; then v=$b; else v=$(openssl rand -hex 32); fi
  [ "$a" = "$v" ] && keep "$1" "$2" || put "$1" "$2" "$v"
  [ "$b" = "$v" ] && keep "$3" "$4" || put "$3" "$4" "$v"
}
default() { real "$(get "$1" "$2")" && keep "$1" "$2" || put "$1" "$2" "$3"; }

echo "Ondi → Tuma"
ADMIN=$(get "$ONDI" ADMIN_KEY)
real "$ADMIN" || { echo "ADMIN_KEY not found in $ONDI — stopping."; exit 1; }
[ "$(get "$TUMA" ONDI_ADMIN_KEY)" = "$ADMIN" ] && keep "$TUMA" ONDI_ADMIN_KEY || put "$TUMA" ONDI_ADMIN_KEY "$ADMIN"
default "$TUMA" ONDI_API_URL https://ondi.hudumika.tz

echo "CRM ↔ Tuma"
pair "$TUMA" CRM_SERVICE_KEY "$CRM" TUMA_SERVICE_KEY
default "$CRM" TUMA_API_URL https://tuma.hudumika.tz

echo "CRM ↔ Bliss"
if [ -n "$BLISS" ]; then
  pair "$CRM" BLISS_SERVICE_KEY "$BLISS" CRM_SERVICE_KEY
  URL=$(get "$TUMA" BLISS_API_URL)
  real "$URL" && default "$CRM" BLISS_API_URL "$URL" || echo "  BLISS_API_URL not in $TUMA — set it in $CRM by hand."
else
  echo "  No Bliss env file in infra/ — skipped. Run this again after Bliss is set up."
fi

chmod 600 "$TUMA" "$CRM"
echo "Restarting tuma-portal and crm-portal with the new keys…"
(cd tuma/deploy && docker compose -f compose.tuma.yml up -d --force-recreate tuma-portal)
(cd crm/deploy && docker compose -f compose.crm.yml up -d --force-recreate crm-portal)
echo "Done. Bliss keeps running its old env until Bliss itself is redeployed."
