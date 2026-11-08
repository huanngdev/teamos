# syntax=docker/dockerfile:1
# Production images for compose.prod.yaml. Targets: `migrate`, `api`, and `web`.

ARG BUN_VERSION=1.3.14

FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
# Manifests first so dependency installation stays cached until they change.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

FROM deps AS source
COPY . .

# Drizzle Kit is a dev dependency, so migrations run from the full workspace.
FROM source AS migrate
WORKDIR /app/packages/db
CMD ["bun", "run", "db:migrate"]

FROM source AS api-build
RUN bun run build --filter=@teamos/api

FROM source AS web-build
# Vite inlines the API origin at build time.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" && bun run build --filter=@teamos/web

FROM oven/bun:${BUN_VERSION}-slim AS api
WORKDIR /app
ENV NODE_ENV=production
# `bun build` bundles every dependency, so the runtime image needs only dist.
COPY --from=api-build /app/apps/api/dist ./dist
USER bun
EXPOSE 4001
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:4001/health'); process.exit(r.ok ? 0 : 1)"]
CMD ["bun", "dist/server.js"]

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/apps/web/dist /srv
