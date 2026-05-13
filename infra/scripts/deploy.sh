#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f .env ]; then
  echo ".env is missing. Copy .env.prod.example to .env and fill secrets." >&2
  exit 1
fi

if grep -Eq '=(change-me|change-me-after-first-setup)$|hanta\.example\.com|admin\.hanta\.example\.com' .env; then
  echo ".env still contains example domains or placeholder secrets." >&2
  exit 1
fi

if grep -Fq '$2a$14$8lZyEXLF/KIxqsOVAFRQC.9cdrjRFoRLqv63vVGcIJsQneONQUYK6' .env; then
  echo ".env still contains the example admin basic-auth hash." >&2
  exit 1
fi

compose() {
  docker compose --env-file .env -f "$compose_file" "$@"
}

if [ "${BACKUP_BEFORE_DEPLOY:-0}" = "1" ]; then
  ./infra/scripts/backup-minio.sh
fi

if [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
  git pull --ff-only
fi
compose config >/dev/null
compose build
compose up -d --remove-orphans
compose ps

public_base_url="$(grep '^APP_PUBLIC_BASE_URL=' .env | cut -d= -f2- || true)"
if [ "${SKIP_PUBLIC_SMOKE:-0}" != "1" ] && [ -n "$public_base_url" ] && command -v curl >/dev/null 2>&1; then
  curl -fsS "$public_base_url/api/map/health" >/dev/null
  curl -fsS "$public_base_url/api/news/health" >/dev/null
fi
