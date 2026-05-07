# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifests for cached install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile=false

# Copy source.
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

# Generate Prisma client + build TS.
RUN pnpm --filter @cromos/api prisma:generate
RUN pnpm --filter @cromos/api build

# --- runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Bring runtime deps + compiled output + Prisma artifacts.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules

EXPOSE 3000
WORKDIR /app/apps/api

# Run pending migrations on boot, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
