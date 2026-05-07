# Cromos 26

A web app for managing your **Panini FIFA World Cup 2026 sticker collection** with friends.
Track owned/missing/duplicate stickers across all 980 entries, share groups with friends via a
6-character invite code, and let the multi-trade optimizer surface the best balanced swaps.

> Visual identity is directly inspired by the official album cover: cream backgrounds, primary-color
> quilt motifs, thick black borders, the iconic "26" numerals in Anton.

---

## Screenshots

> Replace these with screenshots of the running app once you've deployed.

- `design-refs/screen-collection.png` — sticker grid, filters, stats strip
- `design-refs/screen-group.png` — leaderboard + trade optimizer
- `design-refs/screen-stats.png` — completion hero, category breakdown

---

## Stack

| Layer            | Tech                                                          |
| ---------------- | ------------------------------------------------------------- |
| Frontend         | React 18 + Vite + TypeScript + Tailwind + Framer Motion       |
| Backend          | Node 20 + Fastify + TypeScript + Zod                          |
| Database         | PostgreSQL 16 + Prisma                                        |
| Auth             | email + bcrypt + JWT in `httpOnly` cookie                     |
| Real-time sync   | 15-second polling via TanStack Query (no WebSockets needed)   |
| Containerization | Docker + docker-compose                                       |
| Reverse proxy    | Caddy 2 (auto Let's Encrypt TLS)                              |
| CI/CD            | GitHub Actions: test+build on every push, deploy on `main`    |

Monorepo managed with **pnpm workspaces**.

---

## Repository structure

```
cromos-26/
├── apps/
│   ├── web/              React + Vite frontend
│   └── api/              Fastify backend (with Prisma)
├── packages/
│   └── shared/           Shared types + sticker config + trade optimizer
├── design-refs/          Source-of-truth design system (DESIGN.md, mockups, logos)
├── scripts/backup.sh     Daily Postgres backup
├── docker-compose.yml    Local dev (postgres + api)
├── docker-compose.prod.yml
├── Caddyfile             Production reverse proxy with auto-TLS
├── .github/workflows/    CI + deploy pipelines
└── DEPLOY.md             Step-by-step Hetzner deployment guide
```

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9.12+ (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker & Docker Compose

### 1. Install

```bash
pnpm install
cp .env.example .env
```

> The defaults in `.env.example` work as-is for local development. Set a real `JWT_SECRET`
> with `openssl rand -base64 48` if you plan to expose the dev server beyond localhost.

### 2. Start the database + API

```bash
docker compose up -d db api
docker compose exec api npx prisma migrate dev --name init   # first time only
docker compose exec api pnpm --filter @cromos/api seed       # demo data
```

The API is now at <http://localhost:3000/api/health>.

Demo accounts (created by the seed):

| User  | Email              | Password    |
| ----- | ------------------ | ----------- |
| João  | joao@cromos.test   | cromos2026  |
| Maria | maria@cromos.test  | cromos2026  |
| Pedro | pedro@cromos.test  | cromos2026  |

The seed also creates a **Café Friends** group with João as creator. The invite code is printed
when the seed runs.

### 3. Start the web app

```bash
pnpm --filter @cromos/web dev
```

Open <http://localhost:5173>.

The Vite dev server proxies `/api/*` to the API container, so `fetch('/api/...')` just works.

### Useful commands

```bash
pnpm typecheck                                    # workspace-wide TS check
pnpm test                                         # run unit tests (trade optimizer, etc.)
pnpm build                                        # build everything
pnpm --filter @cromos/api prisma:studio           # open the Prisma DB browser
pnpm --filter @cromos/api prisma:migrate          # create a new migration
docker compose down -v                            # nuke local DB
```

---

## Google OAuth setup (optional)

The app supports email/password sign-in plus "Continue with Google" via OAuth 2.0.
Google sign-in is **optional** — if you don't configure credentials, the button still
renders but clicking it 404s. To enable it:

1. Go to <https://console.cloud.google.com/> and create a project (e.g. `cromos-26`).
2. Open **APIs & Services → OAuth consent screen**.
   - User type: **External** (unless you have a Workspace).
   - App name: `Cromos 26`. Support email: yours.
   - On the **Scopes** screen pick `userinfo.email`, `userinfo.profile`, `openid`.
   - On **Test users**, add your own Google address while the app is in "Testing"
     mode — that's the easiest way to use it without going through Google's review.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID.**
   - Application type: **Web application**.
   - Authorised JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:3000
     https://yourdomain.com
     ```
   - Authorised redirect URIs:
     ```
     http://localhost:3000/api/auth/google/callback
     https://yourdomain.com/api/auth/google/callback
     ```
4. Copy the **Client ID** and **Client secret** into your `.env` (dev) or
   `.env.production` (prod):
   ```env
   GOOGLE_CLIENT_ID=<paste here>
   GOOGLE_CLIENT_SECRET=<paste here>
   ```
5. Restart the API: `docker compose restart api`.

When Google sign-in works:
- A new user signing in with Google gets a record with `googleId` set and no
  `passwordHash`. They cannot use the email/password form — only Google.
- An **existing** email/password user signing in with Google for the first time
  has their account **linked** by email. They can use both login methods after.

## Updating the sticker / team list

The current layout in `packages/shared/src/stickers.ts` follows the **official Panini 2026
album** (verified May 2026 against Panini America + checklist sources):

- `#1` Panini logo foil
- `#2–9` Tournament intro (8 stickers — emblems, mascots, slogan, ball, hosts)
- `#10–20` FIFA Museum (11 historical World Cup champions, Italy 1934 → Argentina 2022)
- `#21–980` 48 teams × 20 stickers each (1 crest foil + 1 team photo + 18 players)

**Total: 980 stickers.** The Coca-Cola exclusive 12-sticker insert is _not_ part of the base
set and isn't tracked here.

**Positions 46–48 of the team list are placeholders** — the official album lists those teams
but my source didn't include the exact tail order. Edit those names in `stickers.ts` once you
have the album physically in hand.

Each `CategoryDef` has an inclusive `[start, end]` range and a `colorKey` from the 8-color
palette. A runtime sanity check throws if ranges overlap or don't sum to 980. No DB migration
is required — categories are computed on the fly, so existing user data is preserved.

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for a complete, copy-pasteable Hetzner Cloud + custom domain setup,
including server hardening, Docker install, DNS, Caddy/TLS, GitHub Actions auto-deploy, and
backups.

---

## License

[MIT](./LICENSE)
