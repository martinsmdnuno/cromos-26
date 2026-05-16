# SETUP.md — bootstrapping this repo on a new machine

> Hand this to Claude on a fresh computer. `CLAUDE.md` (auto-loaded) covers
> architecture, gotchas, and day-to-day commands. This file is **only** the
> "I've never touched this repo on this machine before" checklist.

## 0. What you'll need from the other machine

These are not in git, so copy/transfer them yourself:

1. **`.env`** — the dev environment file at the repo root. The only values
   that genuinely matter for parity are `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`. Everything else can be regenerated.
   - If you don't have access to the old `.env`, see §4 to recreate.
2. **(Optional) `~/.ssh/cromos-deploy` + `~/.ssh/cromos-deploy.pub`** — the
   private deploy key for SSH'ing into the Hetzner box. Only needed if you
   want to run server-side ops manually. `git push origin main` deploys via
   GitHub Actions regardless of which machine you push from.
3. **(Optional) `~/.claude/`** — your Claude Code config + memory. Lives
   outside the repo. Copy if you want sessions to feel identical.

Nothing else from the old machine is needed.

## 1. System prerequisites

- **Node 20** (`nvm install 20 && nvm use 20`, or whatever you use)
- **pnpm 9.12.0** — pinned via `packageManager` in `package.json`. Easiest:
  `corepack enable` (ships with Node) and pnpm self-installs the right
  version on first run.
- **Docker Desktop** (or Colima / OrbStack). Used for the Postgres + API
  containers in dev.
- **Git**
- **zsh quality-of-life**: add `setopt interactivecomments` to `~/.zshrc`
  if you'll be pasting multi-line shell blocks with `#` comments. Without
  it, pastes break with `parse error near \`)\``.

Quick verify:

```bash
node --version    # v20.x
corepack --version
docker info       # daemon must be running
```

## 2. Clone

```bash
git clone git@github.com:martinsmdnuno/cromos-26.git
cd cromos-26
```

(SSH clone assumes your GitHub SSH key is set up on this machine. HTTPS
clone works fine too.)

## 3. Drop in the `.env`

Either:

- **Copy the old `.env` over** (recommended — same Google OAuth client),
  OR
- `cp .env.example .env` and edit per §4.

`.env` is gitignored. Never commit it.

## 4. (Only if recreating `.env` from scratch)

```bash
cp .env.example .env
```

Then edit:

- `JWT_SECRET` → `openssl rand -base64 48`
- `POSTGRES_PASSWORD` → anything (matches the value Postgres will be
  initialized with on first `docker compose up`; if you change it later,
  wipe the `db` volume)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → either:
  - Reuse the existing values from Google Cloud Console (project owner:
    `martins.nunomiguel@gmail.com`). `http://localhost:5173` and
    `http://localhost:3000` are already registered as authorized origins
    + redirect URIs, so the existing client works on any localhost.
  - Or leave blank to disable Google sign-in entirely. Email/password
    auth still works.
- `RESEND_API_KEY` / `FEEDBACK_NOTIFY_EMAIL` → leave blank in dev. The
  `/api/feedback` endpoint will accept submissions but won't email.

## 5. Install + first run

```bash
pnpm install                       # installs all workspaces
docker compose up -d db api        # postgres + api containers
pnpm --filter @cromos/web dev      # vite dev server on host
```

- Web: <http://localhost:5173>
- API: <http://localhost:3000>
- DB: localhost:5432 (`cromos` / `cromos` by default)

First-run side effects:
- Postgres volume `cromos-26_db-data` is created.
- API container runs `prisma migrate deploy` on boot — all migrations in
  `apps/api/prisma/migrations/` are applied automatically.

## 6. Sanity check

```bash
docker compose ps                  # db + api should both be "running (healthy)"
docker compose logs api | tail -50 # no JWT_SECRET errors, no Prisma engine errors
curl http://localhost:3000/health  # should return 200
```

Open <http://localhost:5173>, create an account (email/password or Google),
verify you land on the album page with 980 sticker slots.

## 7. Optional: seed demo data

The seed creates a few demo accounts and a shared group so you can poke at
the trade optimizer without manually populating 980 stickers.

```bash
docker compose exec api pnpm exec tsx prisma/seed.ts
```

**Do not run this in prod** — it creates accounts with a known password
(see CLAUDE.md gotcha #15).

## 8. Optional: deploy access

Only needed if you want to `ssh` into the server directly (logs, restore
backups, etc.). For normal code deploys, just `git push origin main`.

```bash
# On the new machine:
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# Copy cromos-deploy + cromos-deploy.pub from old machine to ~/.ssh/
chmod 600 ~/.ssh/cromos-deploy

# Test:
ssh -i ~/.ssh/cromos-deploy cromos@65.109.129.213
```

Add an entry to `~/.ssh/config` if you want `ssh cromos-prod` to just
work:

```
Host cromos-prod
  HostName 65.109.129.213
  User cromos
  IdentityFile ~/.ssh/cromos-deploy
```

## 9. After setup — what to read next

The repo is now self-documenting. In order:

1. **`CLAUDE.md`** — agent context, architecture, and the "lessons
   learned" list of things that have bitten us before. Auto-loaded by
   Claude Code on every session start.
2. **`README.md`** — user-facing project overview.
3. **`DEPLOY.md`** — production deployment details.

## Troubleshooting on first run

| Symptom | Fix |
|---|---|
| `pnpm install` complains about wrong pnpm version | `corepack enable`, then re-run |
| API container crash-loops with `Could not parse schema engine response` | Prisma binary target issue — should be fixed in `schema.prisma`, but rebuild the api image: `docker compose build --no-cache api` |
| API logs say `JWT_SECRET is required` | `.env` wasn't loaded; check it exists at repo root, restart `docker compose up -d api` |
| Web shows "Network error" on login | API isn't running, or `VITE_API_BASE_URL` in `.env` doesn't match where the API actually lives |
| Google sign-in 404s | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are blank in `.env` — either fill them in or use email/password |
| Port 5432 already in use | You have a host Postgres running. Either stop it (`brew services stop postgresql`) or change the published port in `docker-compose.yml` |
| Port 3000 or 5173 already in use | Kill the other process, or override with `API_PORT=3001` in `.env` / `pnpm --filter @cromos/web dev -- --port 5175` |
