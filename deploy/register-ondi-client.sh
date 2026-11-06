#!/bin/sh
# Run ON the Hudumika box from /root/newapps-deploy. Registers Tuma as an Ondi OAuth client and writes the client id
# and secret into infra/tuma.env without printing the secret. Uses Ondi's own ADMIN_KEY from infra/ondi-api.env.
set -eu
cd /root/newapps-deploy
ADMIN_KEY=$(grep '^ADMIN_KEY=' infra/ondi-api.env | cut -d= -f2-)
[ -n "$ADMIN_KEY" ] || { echo "ADMIN_KEY not found in infra/ondi-api.env"; exit 1; }
grep -q '^ONDI_CLIENT_ID=.\+' infra/tuma.env && { echo "Tuma already has an Ondi client in infra/tuma.env"; exit 0; }
RES=$(curl -sf -X POST https://ondi.hudumika.tz/v1/clients/register \
  -H 'content-type: application/json' -H "x-admin-key: $ADMIN_KEY" \
  -d '{"name":"Tuma","scopes":["openid","profile","email","phone","organizations"],
       "grantTypes":["authorization_code","refresh_token"],"isFirstParty":true,
       "redirectUris":["https://tuma.hudumika.tz/api/driver/auth/callback","https://tuma.hudumika.tz/api/auth/callback",
                       "http://localhost:3100/api/driver/auth/callback","http://localhost:3100/api/auth/callback"]}')
ID=$(echo "$RES" | sed -n 's/.*"clientId":"\([^"]*\)".*/\1/p')
SECRET=$(echo "$RES" | sed -n 's/.*"clientSecret":"\([^"]*\)".*/\1/p')
[ -n "$ID" ] && [ -n "$SECRET" ] || { echo "Unexpected response from Ondi (keys: $(echo "$RES" | grep -o '"[a-zA-Z_]*":' | tr -d '\n'))"; exit 1; }
sed -i "s|^ONDI_CLIENT_ID=.*|ONDI_CLIENT_ID=$ID|; s|^ONDI_CLIENT_SECRET=.*|ONDI_CLIENT_SECRET=$SECRET|" infra/tuma.env
echo "Registered Tuma with Ondi: client_id=$ID (secret saved to infra/tuma.env)"
