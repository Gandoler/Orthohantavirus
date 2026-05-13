#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

backup_dir="${BACKUP_DIR:-./data/backups}"
case "$backup_dir" in
  /*) backup_path="$backup_dir" ;;
  *) backup_path="$(pwd)/$backup_dir" ;;
esac
mkdir -p "$backup_path"

project_name="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')}"
volume_name="${MINIO_VOLUME_NAME:-${project_name}_minio_data}"

if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
  echo "MinIO volume not found: $volume_name" >&2
  echo "Set MINIO_VOLUME_NAME if the Compose project name is custom." >&2
  exit 1
fi

archive="$backup_path/minio-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
docker run --rm \
  -v "${volume_name}:/data:ro" \
  -v "${backup_path}:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "$archive")" -C /data .

echo "$archive"
