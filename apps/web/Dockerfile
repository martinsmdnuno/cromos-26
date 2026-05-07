# Build the web app to static files. The output volume is shared with the
# Caddy container in production (see docker-compose.prod.yml).
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile=false

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

RUN pnpm --filter @cromos/web build

# This stage just exists so docker-compose.prod can copy /app/apps/web/dist
# into a named volume (via a one-shot `cp` command), which Caddy then serves.
FROM alpine:3.20 AS export
WORKDIR /export
COPY --from=builder /app/apps/web/dist .
# Default command keeps the container alive long enough for the volume to be mounted.
CMD ["sh", "-c", "cp -r /export/* /srv/web/ && echo 'web build copied' && tail -f /dev/null"]
