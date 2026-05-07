# DEPLOY.md — Cromos 26 on Hetzner Cloud

Complete, copy-pasteable guide to deploying Cromos 26 to a fresh Hetzner Cloud VPS with a
custom `.com` domain you already own. The whole stack (Postgres, API, web, Caddy) runs in
Docker, fronted by Caddy with automatic Let's Encrypt TLS.

> Before you start, replace **`yourdomain.com`** everywhere below — including in `Caddyfile`
> and the `.env.production` you'll create — with your actual domain.

---

## 1. Server provisioning (Hetzner Cloud)

1. Sign in to <https://console.hetzner.cloud>, create a new project (e.g. `cromos`).
2. Click **Add Server** and pick:
   - **Location**: Falkenstein (FSN1) or Helsinki (HEL1) — best latency from Europe.
   - **Image**: Ubuntu 24.04 LTS.
   - **Type**: **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD) is enough for Cromos 26 (≈ €4.59/month
     at time of writing — verify current pricing in the Hetzner UI).
     CPX11 also works if you want a slightly beefier box.
   - **Networking**: enable both IPv4 and IPv6.
   - **SSH keys**: paste your public key (you'll log in as `root` first, then create your own user).
   - **Name**: `cromos-prod`.
3. Click **Create & Buy now**. Note the public IPv4 (and IPv6) — you'll need both for DNS.

### Firewall

Hetzner has its own Cloud Firewall on top of the OS firewall. Create one and attach it to
the server:

- Inbound: TCP 22 (SSH), TCP 80, TCP 443. Source: `0.0.0.0/0, ::/0`.
- Outbound: leave defaults (allow all).

You'll also enable UFW on the OS (step 2). Both is fine — defence in depth.

---

## 2. Initial server hardening

SSH in as root from your laptop:

```bash
ssh root@<server-ip>
```

Then:

```bash
# Create a non-root sudo user
adduser cromos
usermod -aG sudo cromos

# Copy your SSH keys to the new user
rsync --archive --chown=cromos:cromos ~/.ssh /home/cromos

# Verify you can log in as `cromos` from another terminal BEFORE locking root:
#   ssh cromos@<server-ip>

# Disable root SSH and password auth
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh

# OS firewall (defence in depth)
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# Brute-force protection for SSH
apt update
apt install -y fail2ban
systemctl enable --now fail2ban

# Automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades   # answer "Yes"
```

From now on, SSH in as `cromos`:

```bash
ssh cromos@<server-ip>
```

---

## 3. Install Docker

Use Docker's official apt repo (not the Snap package — it's older and has volume issues).
Commands from <https://docs.docker.com/engine/install/ubuntu/>:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
                        docker-buildx-plugin docker-compose-plugin

# Run docker without sudo
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect:
exit
ssh cromos@<server-ip>

# Verify
docker --version && docker compose version
```

---

## 4. Domain DNS configuration

You already own the `.com`. Point it at the Hetzner server. In your DNS provider (Cloudflare,
Namecheap, OVH, etc.):

| Type  | Host  | Value                       | TTL |
| ----- | ----- | --------------------------- | --- |
| A     | `@`   | `<your IPv4>`               | 5m  |
| AAAA  | `@`   | `<your IPv6>`               | 5m  |
| CNAME | `www` | `yourdomain.com.`           | 5m  |

> If you're on Cloudflare, **set proxy to "DNS only" (grey cloud)** initially so Caddy can
> obtain its Let's Encrypt cert. You can re-enable proxying afterwards if you want.

Wait a few minutes for propagation, then verify:

```bash
dig +short yourdomain.com
dig +short AAAA yourdomain.com
dig +short www.yourdomain.com
```

Each should return the matching server IP. If not, wait longer (TTLs from your previous DNS
records may still be cached).

---

## 5. Clone the repo and configure

```bash
# On the server
cd ~
git clone https://github.com/<your-username>/cromos-26.git
cd cromos-26

# Replace yourdomain.com in the Caddyfile
sed -i 's/yourdomain\.com/yourdomain.com/g; s/admin@yourdomain\.com/admin@yourdomain.com/g' Caddyfile
# (or just open Caddyfile in your editor and replace by hand)

# Production env file
cp .env.example .env.production
```

Edit `.env.production` with real values:

```env
NODE_ENV=production
APP_URL=https://yourdomain.com
COOKIE_DOMAIN=yourdomain.com

# generate with: openssl rand -base64 48
JWT_SECRET=<paste-the-output-here>
JWT_EXPIRES_IN=30d

# pick strong values
POSTGRES_USER=cromos
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=cromos
DATABASE_URL=postgresql://cromos:<same-password>@db:5432/cromos?schema=public

API_PORT=3000
```

Lock down the file so it isn't world-readable:

```bash
chmod 600 .env.production
```

---

## 6. First deploy

```bash
# Pull base images, build the API & web bundles, start everything.
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Run pending Prisma migrations (the API container also runs this on boot, but doing it
# explicitly the first time gives clearer error messages if something is off).
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx prisma migrate deploy

# Optional: seed demo data the first time only.
# docker compose -f docker-compose.prod.yml --env-file .env.production exec api pnpm --filter @cromos/api seed

# Verify everything is healthy
docker compose -f docker-compose.prod.yml ps
```

Open <https://yourdomain.com> in your browser. Caddy will request a Let's Encrypt cert on the
first request and serve the app over HTTPS. (Behind the scenes Caddy proxies `/api/*` to the
API container; everything else is the React SPA served from the `web-static` volume.)

> If you get a TLS error: check `docker compose logs caddy` — usually the issue is DNS not
> propagating, or Cloudflare orange-cloud blocking the HTTP-01 challenge.

---

## 7. CI/CD — automatic deploys on push to main

`.github/workflows/deploy.yml` already wires this up. Two pieces of setup needed:

### 7a. Generate a deploy key

On your **laptop** (or anywhere with `ssh-keygen`):

```bash
ssh-keygen -t ed25519 -C "cromos-deploy" -f cromos-deploy -N ""
```

This creates two files: `cromos-deploy` (private) and `cromos-deploy.pub` (public).

On the **server**, append the public key to `cromos`'s `authorized_keys`:

```bash
# from the server
cat >> ~/.ssh/authorized_keys
# paste the contents of cromos-deploy.pub, then Ctrl-D
chmod 600 ~/.ssh/authorized_keys
```

### 7b. Add GitHub secrets

In your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value                                                |
| ----------- | ---------------------------------------------------- |
| `SSH_HOST`  | server IPv4 (or domain)                              |
| `SSH_USER`  | `cromos`                                             |
| `SSH_KEY`   | full contents of the **private** `cromos-deploy` file |

Push to `main`. The `Deploy` workflow runs lint+typecheck+test+build, then SSHs in and runs:

```bash
git fetch --all && git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
docker image prune -f
```

---

## 8. Backups

A `pg_dump` script is in `scripts/backup.sh`. Schedule it nightly via cron:

```bash
sudo mkdir -p /var/backups/cromos
sudo chown cromos:cromos /var/backups/cromos

crontab -e
```

Add:

```
0 3 * * * /home/cromos/cromos-26/scripts/backup.sh >> /var/log/cromos-backup.log 2>&1
```

By default the script keeps 14 days of backups locally. **Recommended next step (not yet
implemented)**: copy backups offsite via `rclone` to a Hetzner Storage Box or Backblaze B2
bucket. A simple `rclone copy /var/backups/cromos b2:cromos-backups/` line at the end of
`backup.sh` would do it once you've configured an `rclone` remote.

### Restore

```bash
gunzip -c /var/backups/cromos/cromos-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db \
      psql -U cromos -d cromos
```

---

## 9. Monitoring & logs

### Live logs

```bash
docker compose -f docker-compose.prod.yml logs -f          # everything
docker compose -f docker-compose.prod.yml logs -f api      # just the API
docker compose -f docker-compose.prod.yml logs -f caddy    # cert renewals, access
```

### Uptime checks

Either:

- **Self-hosted**: add a sibling `uptime-kuma:1` service to `docker-compose.prod.yml` and route
  it via Caddy at `status.yourdomain.com`. Watches `https://yourdomain.com/api/health`.
- **External**: free [UptimeRobot](https://uptimerobot.com/) tier — 5-minute interval ping of
  `https://yourdomain.com/api/health`.

### Caddy access logs (optional)

Uncomment the `log` block at the bottom of the `Caddyfile`, redeploy, then `tail -f` the file
inside the caddy container.

---

## 10. Rollback procedure

If a deploy breaks something:

```bash
# On the server
cd ~/cromos-26
git fetch --tags
git checkout <previous-tag-or-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

> ⚠️ **Migration caveat:** Prisma migrations are forward-only. If the bad release added a
> migration that drops or alters a column, rolling back the **code** alone won't restore the
> schema. For schema changes that are risky to revert, restore the latest Postgres backup as
> well (see the Restore snippet above).
>
> Best practice: deploy schema changes in two steps — first a backwards-compatible migration
> (additive), then later a cleanup migration once the new code has been stable for a while.

---

## Quick reference

```bash
# Restart everything (e.g. after editing .env.production)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Open a Postgres shell
docker compose -f docker-compose.prod.yml exec db psql -U cromos -d cromos

# Manually run migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Seed demo data
docker compose -f docker-compose.prod.yml exec api pnpm --filter @cromos/api seed

# Check disk usage
df -h
docker system df
```

That's it. You should now have Cromos 26 running at `https://yourdomain.com` with HTTPS, daily
backups, and pushes to `main` auto-deploying.
