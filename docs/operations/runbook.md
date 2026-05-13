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

Detailed hardening and deployment flow:

- `docs/security/security-review.md`
- `docs/operations/production-deployment-playbook.md`

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

Generate a new admin password hash before exposing `ADMIN_DOMAIN`:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'replace-with-long-password'
```

Set the resulting bcrypt value in `ADMIN_BASIC_AUTH_HASH`. Keep the value quoted in `.env` because bcrypt hashes contain `$` characters. Grafana and Umami still need strong own credentials, but Caddy basic auth is the first edge barrier for the whole admin domain.

Regular deploy:

```bash
./infra/scripts/deploy.sh
```

For risky updates, create a MinIO backup before rebuild/restart:

```bash
BACKUP_BEFORE_DEPLOY=1 ./infra/scripts/deploy.sh
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
15 */6 * * * cd /opt/orthohantavirus/repo && docker compose --env-file .env -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all >> /opt/orthohantavirus/ingestion.log 2>&1
```

## Backups

If production uses MinIO on the VPS:

```bash
./infra/scripts/backup-minio.sh
```

Cron example for daily local MinIO backups:

```cron
45 2 * * * cd /opt/orthohantavirus/repo && BACKUP_DIR=/opt/orthohantavirus/backups ./infra/scripts/backup-minio.sh >> /opt/orthohantavirus/backup.log 2>&1
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
- admin routes require basic auth;
- Grafana shows service logs in the provisioned `Orthohantavirus Backend Logs` dashboard.
