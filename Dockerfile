# Tuma portal + API (Next.js standalone). Deployed like the other Hudumika tools: built on the box from the synced
# source, served behind hudumika-nginx at tuma.hudumika.tz.
#   runner  the web app and API (port 3000)
#   tools   one-off jobs against the database: migrations, platform seed, grant-role

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
# Slow or flaky links: wait longer and retry more per package, and keep the downloaded store between builds so a
# failed or repeated build doesn't fetch all ~670 packages again.
RUN --mount=type=cache,id=tuma-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --fetch-timeout=300000 --fetch-retries=6 --network-concurrency=6

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Migrations and seeds need drizzle-kit and tsx (dev dependencies), so they run from this image.
FROM deps AS tools
COPY . .
ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm drizzle-kit migrate && pnpm tsx scripts/seed.ts --platform"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN addgroup -S tuma && adduser -S tuma -G tuma && mkdir -p /data/uploads && chown -R tuma:tuma /data
COPY --from=build --chown=tuma:tuma /app/.next/standalone ./
COPY --from=build --chown=tuma:tuma /app/.next/static ./.next/static
COPY --from=build --chown=tuma:tuma /app/public ./public
USER tuma
EXPOSE 3000
VOLUME ["/data/uploads"]
CMD ["node", "server.js"]
