#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

backup_dir="${BACKUP_DIR:-./data/backups}"
mkdir -p "$backup_dir"

archive="$backup_dir/minio-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
docker run --rm \
  -v orthohantavirus_minio_data:/data:ro \
  -v "$(pwd)/$backup_dir:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "$archive")" -C /data .

echo "$archive"
