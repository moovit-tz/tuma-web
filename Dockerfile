# MySafari Parcel portal (Next.js), production image
# Build:  docker build --build-arg BACKEND_URL=https://parcel.mysafari.co.tz -t mysafari-portal .
# Run:    docker run -d -p 3000:3000 --name mysafari-portal mysafari-portal

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The backend /api/* is forwarded to (baked into the build)
ARG BACKEND_URL=https://parcel.mysafari.co.tz
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm exec next build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
ARG BACKEND_URL=https://parcel.mysafari.co.tz
ENV BACKEND_URL=$BACKEND_URL
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/en >/dev/null || exit 1
CMD ["node", "server.js"]
