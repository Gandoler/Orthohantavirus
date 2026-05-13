# Operations Runbook

## Local Development

```bash
cp .env.example .env
docker compose up --build
```

Useful URLs:

```text
frontend:     http://localhost:5173
map-api:      http://localhost:8000
news-service: http://localhost:8001
minio:        http://localhost:19000
minio-ui:     http://localhost:19001
```

Run ingestion:

```bash
docker compose run --rm data-ingestion python -m services.data_ingestion run-all
```

Local observability profile:

```bash
docker compose --profile observability up -d
```

Observability URLs:

```text
umami:   http://localhost:3000
grafana: http://localhost:3001
```

Alloy is configured to ship logs only from running containers in the current `orthohantavirus` Compose project.

## Production VPS Deploy

Server prerequisites:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

First deploy:

```bash
cp .env.prod.example .env
# edit .env and replace all change-me values
docker compose -f docker-compose.prod.yml up -d --build
```

Before exposing `ADMIN_DOMAIN`, add reverse-proxy basic auth, a VPN, or an IP allowlist in front of admin tools. Grafana and Umami have their own logins, but the admin domain should still be protected at the edge.

Regular deploy:

```bash
./infra/scripts/deploy.sh
```

Production routes:

```text
https://hanta.example.com/
https://hanta.example.com/api/map/health
https://hanta.example.com/api/news/health
https://admin.hanta.example.com/analytics
https://admin.hanta.example.com/grafana
```

## Scheduled Ingestion

Cron example:

```cron
15 */6 * * * cd /opt/orthohantavirus/repo && docker compose -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
```

## Backups

If production uses MinIO on the VPS:

```bash
./infra/scripts/backup-minio.sh
```

Restore:

```bash
./infra/scripts/restore-minio.sh ./data/backups/minio-YYYYmmddTHHMMSSZ.tar.gz
```

## Smoke Test

After deploy:

```bash
curl -f https://hanta.example.com/api/map/health
curl -f https://hanta.example.com/api/news/health
docker compose -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
docker compose -f docker-compose.prod.yml ps
```

Then check:

- public frontend loads;
- map renders case markers;
- news panel renders official updates;
- Umami dashboard records pageviews;
- Grafana shows service logs.
