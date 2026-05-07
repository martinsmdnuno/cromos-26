# CLAUDE.md — agent context for this repo

> Loaded automatically by Claude Code whenever a session starts in this repo.
> Read this top-to-bottom before suggesting changes; the "Lessons learned" section
> contains gotchas that broke this exact codebase and cost us hours to debug.

## What this is

**Cromos 26** — Panini FIFA World Cup 2026 sticker collection manager.
Track 980 stickers (48 teams × 20 + 9 opening + 11 FIFA Museum), share groups with friends
via 6-char invite code, multi-trade optimizer, mobile-first PWA-ish web app.

Public production URL: <https://stickers.martinsnuno.com>
Public repo: <https://github.com/martinsmdnuno/cromos-26>
Sister app (cross-sell): <https://github.com/martinsmdnuno/wc26> (predictions/betting pool, separate codebase)

## Architecture in 60 seconds

```
cromos-26/
├── apps/
│   ├── api/      Fastify + Prisma + Postgres + JWT-cookie auth + Google OAuth
│   └── web/      React 18 + Vite + Tailwind + TanStack Query + Framer Motion
├── packages/
│   └── shared/   Sticker config (980), trade optimizer, types — consumed by api+web
├── docker-compose.yml          dev (db + api in containers; web runs on host via vite)
├── docker-compose.prod.yml     prod (db + api + web-static + caddy)
├── Caddyfile                   prod reverse proxy + auto Let's Encrypt
└── .github/workflows/          ci.yml + deploy.yml (push to main → SSH deploy)
```

pnpm workspaces. Node 20. pnpm 9.12.0 (`packageManager` pinned).

## Production deploy facts (do not re-discover these)

- **Server**: Hetzner CX23 in Helsinki, IPv4 `65.109.129.213`, IPv6 `2a01:4f9:c014:4f7c::1`.
- **SSH**: as user `cromos` (key-only, root SSH disabled). Deploy key at `~/.ssh/cromos-deploy` on owner's Mac. Public key in server's `~/.ssh/authorized_keys`.
- **DNS**: Cloudflare manages `martinsnuno.com`. `stickers` A record → server IPv4. **Set proxy to "DNS only" (grey cloud) for first cert issuance**, can be re-enabled to orange after Caddy has the cert.
- **GitHub Actions secrets**: `SSH_HOST`, `SSH_USER` (`cromos`), `SSH_KEY` (the private deploy key).
- **Env file on server**: `/home/cromos/cromos-26/.env.production` (chmod 600, NOT in git). Contains `JWT_SECRET`, `POSTGRES_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc. The file is regenerated only if the user explicitly says so.
- **Backups**: cron `0 3 * * *` running `scripts/backup.sh` → `/var/backups/cromos/cromos-YYYYMMDD-HHMMSS.sql.gz`, 14-day retention.

## Lessons learned (READ THIS — these all broke us once)

### Build / TypeScript

1. **`packages/shared` must emit to `dist/`.** API's `tsc -p tsconfig.build.json` enforces `rootDir`; if it tries to compile shared `.ts` sources via path-mapping, it fails with TS6059. Fix: shared has a real `build` script that emits `dist/`, the runtime imports `@cromos/shared` via `node_modules` symlink → `dist/index.d.ts`.
2. **Two tsconfigs in `apps/api`**:
   - `tsconfig.json` — `noEmit: true`, paths to shared **source**. Used by IDE, `tsx`, and `pnpm typecheck`. **No `rootDir`** (rootDir + paths-out-of-root = TS6059 even with noEmit).
   - `tsconfig.build.json` — emits to `dist/`. **No paths**. Resolves shared via package main.
3. **Pre-build order**: shared **must** be built before api can build OR typecheck. The Dockerfile runs `pnpm --filter @cromos/shared build` first. CI doesn't, but it gets away with it because tsconfig.json has paths to source.
4. **Imports in shared use `.js` extensions** (`from './stickers.js'`) because the compiled output is NodeNext ESM. Don't change those — even though the source is `.ts`, the spec says you import the post-compile filename.

### Docker / Alpine

5. **Prisma + Alpine needs explicit binary target.** `schema.prisma` has `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`. Without this, the API crash-loops on boot with `Could not parse schema engine response: SyntaxError: Unexpected token 'E', "Error load"...`.
6. **Both Dockerfile stages need `apk add --no-cache openssl libc6-compat`** for the same reason.
7. **`pino-pretty` was removed**. Don't reintroduce it. JSON logs in all envs (Docker logs are fine reading JSON).
8. **Healthcheck uses Node fetch, not busybox wget.** Busybox wget on `node:20-alpine` returns inconsistent exit codes for HTTP responses, making the container flap between healthy/unhealthy. Keep the Node-based healthcheck in `docker-compose.prod.yml`.

### Network / DNS / TLS

9. **Docker daemon needs explicit DNS on this Hetzner box.** Without `/etc/docker/daemon.json` set to `{"dns":["1.1.1.1","8.8.8.8"]}`, containers inherit `127.0.0.53` (systemd-resolved on host) which they can't reach. Caddy can't talk to Let's Encrypt. We fixed this on the server; if a fresh server, redo it.
10. **Hetzner Ubuntu image ships with system Caddy already running on ports 80/443.** First deploy will fail with `address already in use`. Fix: `sudo systemctl disable --now caddy` (the OS one, not the Docker one) before `docker compose up`.
11. **Cloudflare proxy must be OFF (grey cloud) for first cert issuance.** HTTP-01 challenge is intercepted otherwise. After cert is issued, can be re-enabled.
12. **Production env vars in compose**: `docker compose ... ps`/`logs` warn about missing vars even though they don't actually need them. Cosmetic. Only `up`/`build`/`exec` actually need `--env-file .env.production`.

### Database

13. **Migrations**: ALWAYS create them locally with `pnpm --filter @cromos/api exec prisma migrate dev --name <descr>` and **commit** the SQL file before pushing. The CI/CD `prisma migrate deploy` only runs already-committed migrations.
14. **Schema changes already applied**: User has optional `passwordHash` (Google-only users have null), unique `googleId`, optional `avatarUrl`. UserSticker, Group, GroupMembership unchanged from initial.
15. **Don't run the seed in prod** — it creates demo accounts (`joao@cromos.test` etc.) with a known password (`cromos2026`) anyone could use to sign in.

### Auth

16. **`@fastify/oauth2` v8 export shape**: `GOOGLE_CONFIGURATION` lives on the **named** export, not the default. Always import as `import oauthPlugin, { fastifyOauth2, type OAuth2Namespace } from '@fastify/oauth2'` and reference `fastifyOauth2.GOOGLE_CONFIGURATION`.
17. **Email/password rejects users with no `passwordHash`**: returns `use_google_signin` error so the frontend can prompt them to use the Google button.
18. **Google OAuth Console setup**: app is **published** (not in Testing) because we use only non-sensitive scopes (`userinfo.email` + `userinfo.profile` + `openid`) — no Google verification required. If scopes change, this may no longer hold.
19. **Authorized JS origins + redirect URIs**: registered in Google Cloud Console for both dev (`http://localhost:3000/5173/5174`) and prod (`https://stickers.martinsnuno.com`). Same `Client ID` used in both `.env` (dev) and `.env.production` (server).

### Frontend / Design system

20. **Cream `#F5E6D3` everywhere**, never pure white. White is for cards on cream.
21. **Three fonts only**: Anton (display), DM Sans (body), JetBrains Mono (numbers/labels). Loaded from Google Fonts in `index.html`. Don't add more.
22. **2–3px solid black `#1A1A1A` border on every card/button/chip**. No shadows. No gradients (except the album-progress bar red→orange→yellow). No glassmorphism.
23. **Trophy icon** at `apps/web/src/components/Trophy.tsx` is intentionally **not** a copy of the FIFA trophy — generic cup-on-pedestal in panini-yellow. Keep it that way (trademark).
24. **Decorative quilt shapes** (red/yellow/blue circles + squares) in heroes echo the album cover. Place behind content with `z-index: 0`.

### i18n

25. **Custom in-house i18n** — no `react-i18next`. Dictionaries live in `apps/web/src/i18n/messages.ts` (EN + PT-PT). Hook is `useT()`, provider `LangProvider`. localStorage key: `cromos.lang`. Auto-detects via `navigator.language` (any `pt-*` → pt, otherwise en).
26. **Category names use the `category.<id>` key pattern**. When you add a sticker config category in `packages/shared/src/stickers.ts`, you MUST add the matching entry to BOTH `en` and `pt` blocks in `messages.ts` (e.g. `'category.team-49': 'NewTeam'`). Otherwise the UI shows the literal key.

### Sticker config

27. **`packages/shared/src/stickers.ts` is the single source of truth** for the 980-sticker layout. The runtime sanity check at the bottom throws if ranges don't sum to 980 — keep that.
28. **Team order matches the official Panini album** (1=Mexico ... 48=Panama). Comes from `checklistinsider.com` + the album wiki. If the user says the order is wrong, trust them — they have the album in hand.
29. **Adding/changing a category** does NOT need a DB migration. Sticker counts are stored against `stickerNumber` integers — categories are computed on the fly.

### CI/CD

30. **`pnpm install --frozen-lockfile=false`** in CI because `pnpm-lock.yaml` may not always be in sync (especially after Claude edits dependencies). If you want stricter, regenerate the lockfile and switch to `--frozen-lockfile`.
31. **Both jobs in `deploy.yml` (`build-and-test` + `deploy`) MUST pass `--env-file .env.production`** to docker compose. Without it, env vars become empty strings and the API boots with no JWT_SECRET.

## Common operations

```bash
# Local dev
pnpm install
docker compose up -d db api                                    # postgres + api in docker
pnpm --filter @cromos/web dev                                  # web on host with hot reload

# DB schema change
pnpm --filter @cromos/api exec prisma migrate dev --name <descr>
git add apps/api/prisma/migrations/<...>/migration.sql
git commit -am "feat(db): <descr>"

# Deploy
git push origin main                                           # GitHub Actions auto-deploys

# On server (when something's wrong)
ssh cromos@65.109.129.213
cd ~/cromos-26
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production exec api sh

# Rollback
git checkout <previous-tag-or-sha>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# ⚠️ Prisma migrations are forward-only. If the bad release added a destructive migration,
# restore from /var/backups/cromos/ before/after rolling back code.

# Restore a backup
gunzip -c /var/backups/cromos/cromos-<ts>.sql.gz \
  | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
      psql -U cromos -d cromos
```

## Owner profile (Nuno)

- Personal GitHub: `martinsmdnuno`. Work: `nuno-martins_dft` (don't push cromos there).
- macOS user: `nuno.martins`, project lives at `~/Desktop/worldcup26-stickers`.
- zsh by default does NOT treat `#` as a comment in interactive mode. Multi-line code blocks
  with `#` comments break with `parse error near \`)\'`. Either run `setopt interactivecomments`
  in `~/.zshrc`, OR strip comments from blocks before pasting. Default to comment-free blocks
  when giving multi-line pastes.
- Prefers Portuguese (PT-PT) when chatting; deliverables in either, code/comments in English.
- Sister app `wc26` already cross-linked from cromos onboarding (`ToolkitCard`) and stats
  footer. Don't duplicate the cross-sell.

## When you (the agent) start a fresh session

1. Read this file fully. Skim `README.md` and `DEPLOY.md` after.
2. Run `git log --oneline -20` to see recent commits.
3. If user asks about a feature, grep the codebase first (`apps/web/src` and `apps/api/src`).
4. If user asks for a deploy/devops change, prefer editing existing config files
   (`docker-compose.prod.yml`, `Caddyfile`, `.github/workflows/*`) over creating new ones.
5. Schema changes ALWAYS need a migration committed alongside the code change.
6. **Never commit secrets**. `.env*` files are in `.gitignore` (except `.env.example`). The
   server's `.env.production` is generated once and lives only on the server.
