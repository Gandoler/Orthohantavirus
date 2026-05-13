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
| OHV-034 | Harden production admin auth at reverse proxy layer | infra | P0 | done |
| OHV-042 | Run production security review | security | P0 | done |
| OHV-043 | Write production deployment and update playbook | infra | P0 | done |
| OHV-036 | Verify real VPS production deploy | infra | P0 | done |
| OHV-040 | Add CI/CD pipeline for tests and Docker config validation | infra | P1 | done |
| OHV-047 | Verify public HTTPS after DNS cutover | infra | P0 | blocked |
| OHV-044 | Add encrypted remote backup sync | infra | P0 | todo |

## Acceptance Criteria

- [x] `docker compose -f docker-compose.prod.yml config` renders with `.env.prod.example`.
- [x] Production stack starts on the VPS.
- [ ] Public frontend is reachable on HTTPS. Blocked until DNS points to the VPS.
- [ ] `/api/map/health` and `/api/news/health` are reachable through reverse proxy. Blocked until DNS points to the VPS.
- [x] Admin analytics and Grafana require authentication.
- [x] Ingestion can be triggered manually through documented Compose command.
- [x] Scheduled ingestion is documented with cron example.
- [x] S3/MinIO data uses persistent volume.
- [x] Backup/restore commands are documented.
- [x] Production security review is documented.
- [x] Fast update and rollback playbook is documented.

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
- Caddy basic auth on the admin domain;
- `.env.prod.example`;
- deploy script;
- MinIO backup and restore scripts;
- operations runbook with local/prod deploy, cron, backup, and smoke commands;
- production security review;
- deployment/update/observability playbook;
- hardened CORS, browser security headers, non-root app containers, deploy secret preflight, and Docker log rotation.
- real VPS bootstrap with deploy user, Docker Compose, firewall, SSH key auth, disabled password/root SSH, fail2ban, unattended upgrades, and swap;
- rsync-friendly deployment flow for first bootstrap before a remote Git workflow is configured;
- MinIO app user/policy initialization for non-root S3 credentials;
- production cron entries for periodic ingestion and local MinIO backups;
- Compose-project-aware MinIO backup and restore scripts.

Verification:

- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config`: passed;
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml build frontend map-api news-service`: passed;
- Caddy config validation through `caddy:2-alpine`: passed;
- production frontend image uses a separate `orthohantavirus-frontend-prod` image name from local dev.
- real VPS production Compose stack: passed;
- manual production ingestion: passed, wrote CDC, ECDC, and WHO artifacts;
- production MinIO artifact check: passed for map and news public artifacts;
- internal production API/news smoke: passed;
- production backup command: passed and wrote a MinIO archive.

Blocked:

- public DNS for the production and admin domains currently returns NXDOMAIN, so Caddy cannot issue HTTPS certificates and public-domain smoke checks cannot pass yet.

Remaining:

- add DNS A records for the production and admin domains, then rerun public HTTPS smoke checks;
- add encrypted remote backup sync;
- add uptime/stale-manifest alerts;
- add CI scanning and immutable image publishing;
- decide whether to keep single-VPS MinIO or move storage to managed S3 after MVP traffic is known.
