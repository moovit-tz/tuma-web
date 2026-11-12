#!/bin/sh
# Copies Tuma's Ondi client id and secret from the box (infra/tuma.env) into the local .env.local, without printing
# either value. Run from tuma/portal: sh scripts/pull-ondi-client.sh
# Local sign-in then works only if that Ondi client also lists http://localhost:3100/auth/callback as a redirect URI.
set -eu
KEY="$HOME/.ssh/hudumika-vps-13.140.152.64"
HOST=root@13.140.152.64
ENV=.env.local
[ -f "$ENV" ] || { echo "Run from tuma/portal (no $ENV here)."; exit 1; }

VALS=$(ssh -i "$KEY" -o ConnectTimeout=20 "$HOST" "grep -E '^ONDI_CLIENT_(ID|SECRET)=' /root/newapps-deploy/infra/tuma.env")
cp "$ENV" "$ENV.bak"
for k in ONDI_CLIENT_ID ONDI_CLIENT_SECRET; do
  v=$(printf '%s\n' "$VALS" | grep "^$k=" | tail -1 | cut -d= -f2-)
  [ -n "$v" ] || { echo "  $k not set on the box; left as it is"; continue; }
  # Replace the line, or add it; awk takes the value from the environment so it never appears in a command line.
  if grep -q "^$k=" "$ENV"; then
    V="$v" awk -v k="$k" 'BEGIN{FS=OFS="="} $1==k{print k "=" ENVIRON["V"]; next} {print}' "$ENV" >"$ENV.tmp" && cat "$ENV.tmp" >"$ENV" && rm -f "$ENV.tmp"
  else
    printf '%s=%s\n' "$k" "$v" >>"$ENV"
  fi
  echo "  set $k (${#v} characters)"
done
chmod 600 "$ENV"
echo "Done. Previous file: $ENV.bak"
