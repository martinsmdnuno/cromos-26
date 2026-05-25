#!/usr/bin/env bash
# Flag a user as admin. Run on the server, from the repo root:
#   ./scripts/make-admin.sh you@example.com
#
# Requires the prod docker-compose stack to be running so psql can reach the
# `db` container. Safe to re-run; idempotent.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <email>" >&2
  exit 1
fi

EMAIL="$1"

# Default to prod env unless caller has set COMPOSE_FILE to override.
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

# Pass the email as a psql variable so its value is safely quoted by psql
# (`:'email'`) instead of being interpolated straight into the SQL string.
# The heredoc delimiter is quoted so the shell leaves the `:'email'` refs alone.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U cromos -d cromos -v ON_ERROR_STOP=1 -v email="$EMAIL" <<'SQL'
UPDATE "User" SET "isAdmin" = TRUE WHERE LOWER(email) = LOWER(:'email');
SELECT id, email, "isAdmin" FROM "User" WHERE LOWER(email) = LOWER(:'email');
SQL
