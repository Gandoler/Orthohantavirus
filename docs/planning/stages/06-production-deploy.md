# Stage 06: Production Deploy

## Goal

Deploy the MVP on a VPS with Docker Compose, HTTPS, storage, backups, health checks, and scheduled ingestion.

## Exit Criteria

- production Compose stack starts on a VPS;
- public site is available over HTTPS;
- APIs are routed behind the same public domain;
- admin tools are protected;
- ingestion runs on a schedule;
- backups are documented or automated;
- rollback path is documented.

## Deliverables

- `docker-compose.prod.yml`;
- Caddy config;
- `.env.prod.example`;
- deploy script;
- backup script for MinIO if used;
- cron example for ingestion;
- production runbook;
- health check verification.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-016 | Add production Caddy reverse proxy config | infra | P0 | done |
| OHV-017 | Add production deploy script | infra | P1 | done |
| OHV-018 | Add ingestion cron documentation and command | infra | P1 | done |
| OHV-002 | Choose production storage: MinIO on VPS or managed S3 | infra | P0 | done |
| TBD | Add `.env.prod.example` | infra | P0 | done |
| TBD | Add backup and restore docs | infra | P1 | done |
| TBD | Add production smoke test checklist | infra | P1 | done |

## Acceptance Criteria

- [x] `docker compose -f docker-compose.prod.yml config` renders with `.env.prod.example`.
- [ ] Public frontend is reachable on HTTPS.
- [ ] `/api/map/health` and `/api/news/health` are reachable through reverse proxy.
- [ ] Admin analytics and Grafana require authentication.
- [x] Ingestion can be triggered manually through documented Compose command.
- [x] Scheduled ingestion is documented with cron example.
- [x] S3/MinIO data uses persistent volume.
- [x] Backup/restore commands are documented.

## Production Smoke Test

After deploy:

- [ ] open public frontend;
- [ ] map loads;
- [ ] news panel loads;
- [ ] source links open;
- [ ] map API health is ok;
- [ ] news API health is ok;
- [ ] Umami receives a test pageview;
- [ ] Grafana shows logs for API services;
- [ ] ingestion job writes a new manifest or exits with a managed warning.

## Risks

- VPS disk can fill if MinIO and Loki retention are not controlled.
- Misconfigured Caddy routes can expose admin tools.
- Manual deploys can drift without a documented runbook.

## Stage Gate

MVP can be considered shipped only after a fresh server deploy is reproducible from the documented commands.

## Current Status

Status: review

Implemented:

- `docker-compose.prod.yml` with Caddy, frontend, APIs, ingestion tool profile, MinIO, Umami, Loki, Grafana, Alloy;
- production Caddy routes for public frontend, `/api/map`, `/api/news`, analytics ingest, and admin dashboards;
- `.env.prod.example`;
- deploy script;
- MinIO backup and restore scripts;
- operations runbook with local/prod deploy, cron, backup, and smoke commands.

Verification:

- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config`: passed;
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml build frontend map-api news-service`: passed;
- production frontend image uses a separate `orthohantavirus-frontend-prod` image name from local dev.

Remaining:

- run a real VPS deploy with DNS and production secrets;
- add admin-domain basic auth/VPN/IP allowlist before exposing dashboards;
- decide whether to keep single-VPS MinIO or move storage to managed S3 after MVP traffic is known.
