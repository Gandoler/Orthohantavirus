#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
  echo ".env is missing. Copy .env.prod.example to .env and fill secrets." >&2
  exit 1
fi

git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
