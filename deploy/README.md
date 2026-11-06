# Deploying Tuma to tuma.hudumika.tz

Same pattern as the rest of the Hudumika suite on `13.140.152.64`: source synced to `/root/newapps-deploy`, built on the
box with Docker Compose, served by `hudumika-nginx`. Tuma gets its own Postgres (`tuma-postgres`) and its own env files
in `/root/newapps-deploy/infra/`. DNS for `tuma.hudumika.tz` already points at the box.

## First time (on the box, once)

1. Check `/root/newapps-deploy/tuma` doesn't exist yet (deploy.sh syncs with `--delete` into it).
2. `docker inspect hudumika-nginx -f '{{json .NetworkSettings.Networks}}'` → put that network's name in
   `compose.tuma.yml` (`CHECK_NGINX_NETWORK`).
3. Create `infra/tuma.env` and `infra/tuma-postgres.env` from the `*.example` files here, with fresh secrets.
4. Register Tuma with Ondi: copy `register-ondi-client.sh` to the box and run it from `/root/newapps-deploy`. It reads
   Ondi's `ADMIN_KEY` from `infra/ondi-api.env` and writes `ONDI_CLIENT_ID` / `ONDI_CLIENT_SECRET` into `infra/tuma.env`.
5. Add `nginx-tuma.conf` to `infra/nginx.conf`, copying the TLS lines from a neighbouring `*.hudumika.tz` block (and
   extend the certificate to cover `tuma.hudumika.tz` if it isn't a wildcard).

## Things this box does differently

- `docker exec` hangs here. Test nginx with a throwaway container instead:
  `MOUNTS=$(docker inspect hudumika-nginx -f "{{range .Mounts}}-v {{.Source}}:{{.Destination}}:ro {{end}}"); eval "docker run --rm --network hudumika $MOUNTS nginx:alpine nginx -t"`
  and reload with `docker kill -s HUP hudumika-nginx`.
- `infra/nginx.conf` is bind-mounted as a single file. Editors that replace the file (`sed -i`, most editors) leave the
  container on the old copy, so a HUP reloads stale config. After such an edit, `docker restart hudumika-nginx`
  (a few seconds' blip for every site), or edit in place (`cat new > nginx.conf`) and HUP.
- The remote shell is zsh: unquoted `$VAR` doesn't word-split (use `eval` or `${=VAR}`).

## Every deploy (from your machine)

```sh
cd tuma/portal && ./deploy/deploy.sh
```

Syncs the source, builds `tuma-portal` and `tuma-tools`, applies migrations (`drizzle/`) and the platform seed
(roles, reason codes, hubs, Tuma's own account; no demo data), restarts the portal, checks and reloads nginx.

## After the first deploy

- Sign in once at https://tuma.hudumika.tz with your Ondi account, then make yourself admin:
  `docker compose -f deploy/compose.tuma.yml run --rm tuma-tools pnpm tsx scripts/grant-role.ts <your-email> tuma_admin acc_moovit_ops`
- KYB review stand-in: https://tuma.hudumika.tz/dev/complyos (needs the `kyb.review` permission; `tuma_admin` has it).
- App: `flutter build apk --release --dart-define=TUMA_API_URL=https://tuma.hudumika.tz`

## Schema changes

Dev keeps `drizzle-kit push`. For production, generate a migration (`pnpm db:generate --name <change>`), commit the
SQL in `drizzle/`, deploy: `tuma-tools` runs `drizzle-kit migrate`.
