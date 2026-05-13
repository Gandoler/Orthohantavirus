#!/bin/sh
set -eu

if [ $# -ne 1 ]; then
  echo "usage: $0 <backup.tar.gz>" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

backup="$1"
docker compose -f docker-compose.prod.yml stop minio
docker run --rm \
  -v orthohantavirus_minio_data:/data \
  -v "$(dirname "$backup"):/backup:ro" \
  alpine:3.20 \
  sh -c "rm -rf /data/* && tar -xzf /backup/$(basename "$backup") -C /data"
docker compose -f docker-compose.prod.yml up -d minio minio-init
