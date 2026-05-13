#!/bin/sh
set -eu

if [ $# -ne 1 ]; then
  echo "usage: $0 <backup.tar.gz>" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
backup="$1"
case "$backup" in
  /*) backup_path="$backup" ;;
  *) backup_path="$(pwd)/$backup" ;;
esac

project_name="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')}"
volume_name="${MINIO_VOLUME_NAME:-${project_name}_minio_data}"

if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
  echo "MinIO volume not found: $volume_name" >&2
  echo "Set MINIO_VOLUME_NAME if the Compose project name is custom." >&2
  exit 1
fi

compose() {
  if [ -f .env ]; then
    docker compose --env-file .env -f "$compose_file" "$@"
  else
    docker compose -f "$compose_file" "$@"
  fi
}

compose stop minio
docker run --rm \
  -v "${volume_name}:/data" \
  -v "$(dirname "$backup_path"):/backup:ro" \
  alpine:3.20 \
  sh -c "rm -rf /data/* && tar -xzf /backup/$(basename "$backup_path") -C /data"
compose up -d minio minio-init
