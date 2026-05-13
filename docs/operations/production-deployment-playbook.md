# Production Deployment And Update Playbook

Last updated: 2026-05-13

This is the operational plan for running the project on one VPS while keeping deploys fast, observable, and reversible.

## Target Topology

```text
internet
  |
  | 80/443
  v
Caddy reverse-proxy
  |-- /                 -> frontend:8080
  |-- /api/map/*        -> map-api:8000
  |-- /api/news/*       -> news-service:8001
  |-- /analytics/*      -> umami tracking/dashboard routes
  |
admin domain + basic auth
  |-- /analytics/*      -> umami
  |-- /grafana/*        -> grafana

internal Docker network
  |-- minio
  |-- umami-db
  |-- loki
  |-- alloy
  |-- data-ingestion one-shot jobs
```

Only Caddy is public. Everything else stays on the Docker network.

## Server Bootstrap

1. Create a dedicated VPS.
2. Add a deploy user.
3. Install Docker and the Compose plugin.
4. Configure firewall:
   - allow SSH only from trusted IPs if possible;
   - allow `80/tcp`;
   - allow `443/tcp`;
   - deny direct access to app/admin/storage ports.
5. Disable SSH password login.
6. Clone repo to `/opt/orthohantavirus/repo`.
7. Create `/opt/orthohantavirus/repo/.env` from `.env.prod.example`.
8. Replace every secret and example domain.
9. Generate admin basic-auth hash:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'long-random-password'
```

10. Set DNS:

```text
hanta.example.com        A/AAAA -> VPS IP
admin.hanta.example.com  A/AAAA -> VPS IP
```

For an IDN domain, configure both the Unicode name in the registrar panel and verify the punycode form with `dig`. Caddy ACME validation will fail with NXDOMAIN until both public and admin hostnames resolve to the VPS.

## First Deploy

```bash
cd /opt/orthohantavirus/repo
docker compose --env-file .env -f docker-compose.prod.yml config
./infra/scripts/deploy.sh
```

Run ingestion:

```bash
docker compose --env-file .env -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
```

Smoke:

```bash
curl -fsS https://hanta.example.com/api/map/health
curl -fsS https://hanta.example.com/api/news/health
curl -fsSI https://hanta.example.com/
curl -fsSI https://admin.hanta.example.com/grafana
```

Expected:

- public endpoints return 200;
- admin endpoint returns 401 without credentials;
- Caddy has issued HTTPS certificates;
- Grafana dashboard shows backend logs after health checks;
- MinIO contains `manifests/latest.json` and public artifacts.

## Fast Update Flow

Normal update:

```bash
cd /opt/orthohantavirus/repo
./infra/scripts/deploy.sh
```

Update after syncing the repository from a local workstation instead of pulling from Git:

```bash
SKIP_GIT_PULL=1 ./infra/scripts/deploy.sh
```

If DNS is not pointed at the server yet, skip the public-domain smoke during the first server bootstrap:

```bash
SKIP_GIT_PULL=1 SKIP_PUBLIC_SMOKE=1 ./infra/scripts/deploy.sh
```

After DNS propagation, run the same deploy without `SKIP_PUBLIC_SMOKE` so HTTPS and API routing are verified through the real public domain:

```bash
SKIP_GIT_PULL=1 ./infra/scripts/deploy.sh
```

Risky update with pre-deploy data backup:

```bash
BACKUP_BEFORE_DEPLOY=1 ./infra/scripts/deploy.sh
```

What the script does:

- rejects placeholder secrets and example domains;
- optionally backs up MinIO volume;
- pulls the latest git changes with `--ff-only`;
- validates production Compose config;
- builds images;
- runs `docker compose up -d --remove-orphans`;
- prints service status;
- smoke-checks public API health endpoints when `APP_PUBLIC_BASE_URL` is set.

## Rollback Plan

Short-term code rollback:

```bash
git log --oneline -n 20
git checkout <known-good-sha>
docker compose --env-file .env -f docker-compose.prod.yml up -d --build --remove-orphans
```

Data rollback:

```bash
./infra/scripts/restore-minio.sh ./data/backups/minio-YYYYmmddTHHMMSSZ.tar.gz
docker compose --env-file .env -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
```

Before doing a real rollback, capture:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=300 > rollback-context.log
```

## Scheduled Jobs

Ingestion:

```cron
15 */6 * * * cd /opt/orthohantavirus/repo && docker compose --env-file .env -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
```

Backups:

```cron
35 2 * * * cd /opt/orthohantavirus/repo && ./infra/scripts/backup-minio.sh
```

Add remote backup sync before public launch:

```text
local backup -> encrypted archive -> remote object storage / remote server
```

## Observability Plan

Daily checks:

- Grafana dashboard has fresh API logs;
- latest ingestion run succeeded;
- public manifest is not stale;
- MinIO disk usage is below threshold;
- Loki volume is not growing unexpectedly;
- Umami receives pageviews.

Incident checks:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 map-api
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 news-service
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 data-ingestion
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 reverse-proxy
```

Grafana/Loki queries:

```logql
{service_name=~"map-api|news-service|data-ingestion"}
{service_name=~"map-api|news-service"} |= "request_failed"
{service_name="data-ingestion"} |= "source_run"
```

Minimum alerts to add next:

- public frontend down;
- map API health down;
- news API health down;
- manifest older than expected ingestion interval;
- MinIO backup missing for 24 hours;
- disk usage above 80%;
- repeated 5xx responses.

## Release Discipline

For every production update:

- keep commits small and reviewable;
- run backend tests, frontend tests, Playwright smoke, and Compose config validation locally or in CI;
- deploy from a clean git tree;
- write down the deployed git SHA;
- check health endpoints and Grafana logs after deploy;
- keep the previous good SHA ready for rollback.

## Future Upgrade Path

Phase 1:

- current VPS + Docker Compose;
- server-side builds;
- cron ingestion;
- local MinIO.

Phase 2:

- GitHub Actions runs tests and builds images;
- push immutable images to GHCR;
- deploy script pulls exact image tags;
- remote encrypted backups.

Phase 3:

- managed S3 instead of VPS MinIO;
- external uptime checks;
- VPN or SSO for admin domain;
- optional Kubernetes only when one VPS stops being enough.
