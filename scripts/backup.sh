#!/usr/bin/env bash
# Cromos 26 — daily Postgres backup.
# Runs pg_dump inside the db container and writes a timestamped, gzipped SQL file
# to /var/backups/cromos. Set up via cron:  0 3 * * * /home/cromos/cromos-26/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/cromos}"
KEEP_DAYS="${KEEP_DAYS:-14}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"

mkdir -p "$BACKUP_DIR"

# Read POSTGRES_USER / DB from .env.production if present.
if [[ -f "$PROJECT_DIR/.env.production" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$PROJECT_DIR/.env.production"
  set +a
fi

PG_USER="${POSTGRES_USER:-cromos}"
PG_DB="${POSTGRES_DB:-cromos}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/cromos-$TIMESTAMP.sql.gz"

echo "[backup] dumping $PG_DB to $OUT"
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl \
  | gzip -9 > "$OUT"

echo "[backup] wrote $(du -h "$OUT" | cut -f1) to $OUT"

# Prune backups older than $KEEP_DAYS days.
find "$BACKUP_DIR" -name 'cromos-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "[backup] done"
