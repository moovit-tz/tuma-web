# Deploying the MySafari Parcel portal

The portal is a Next.js app packaged as a Docker image. In the browser it only
ever talks to its own address; the portal server forwards `/api/*` to the
MySafari backend (`BACKEND_URL`) and serves its own `/api/portal-insights/*`
routes. So it works on any domain without CORS changes on the backend.

## First deploy

On the server (Docker installed):

```bash
git clone https://github.com/ibrahimnkya/parcel-web-beta.git mysafari-portal
cd mysafari-portal
# optional: a different backend, or port
echo "BACKEND_URL=https://parcel.mysafari.co.tz" > .env
echo "PORTAL_PORT=3000" >> .env
docker compose up -d --build
docker compose logs -f portal     # wait for "Ready"
curl -I http://127.0.0.1:3000/en  # 200
```

`BACKEND_URL` is baked in at build time, so change it and rebuild
(`docker compose up -d --build`) if the backend moves.

## Put it behind HTTPS

Point the domain at the server and proxy it to the container, e.g. nginx:

```nginx
server {
    server_name portal.mysafari.co.tz;   # your portal domain
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 200s;   # some insight pages aggregate for a while
    }
    listen 80;
}
```

then `certbot --nginx -d portal.mysafari.co.tz` for the certificate.

If the portal shares a domain with the backend, the backend's own `/api` must
not be routed to the portal (and vice versa); a separate subdomain is simplest.

## Updating

```bash
cd mysafari-portal
git pull
docker compose up -d --build   # builds the new image, then swaps the container
```

The old container keeps serving until the new image has built; the swap
itself takes a few seconds. Roll back with `git checkout <previous commit>`
and the same command.

## Checks after a deploy

- `/en` (landing), `/en/login`, `/en/tracking` load
- sign in and open a dashboard (uses `/api/portal-insights/*`)
- `docker compose ps` shows the container as healthy
