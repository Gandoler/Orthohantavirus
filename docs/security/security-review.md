# Production Security Review

Last updated: 2026-05-13

This review covers the current MVP repository state: public frontend, map API, news service, ingestion batch job, MinIO, Caddy, Umami, Grafana, Loki, Alloy, and Docker Compose production deployment.

## Scope

Reviewed:

- `docker-compose.prod.yml`;
- `infra/caddy/Caddyfile`;
- `.env.prod.example`;
- backend FastAPI service setup;
- backend and frontend Dockerfiles;
- deploy, backup, and restore scripts;
- operations runbook and observability setup.

Not reviewed:

- real VPS firewall state;
- real DNS records;
- real production secrets;
- provider-level DDoS protection;
- legal/compliance requirements.

## Executive Summary

The project is in a good MVP shape for a single-VPS deployment after the hardening pass. The most important production controls now present are:

- only Caddy is exposed publicly in production Compose;
- admin tools are behind Caddy basic auth;
- APIs emit structured JSON access logs;
- Docker log files are size-limited in production Compose;
- public Caddy route sets security headers and a restrictive CSP;
- backend containers run as a non-root user;
- production deploy script rejects placeholder secrets and example domains.

The remaining critical production dependency is not code: the real server must be hardened before public launch.

## Findings

| ID | Severity | Finding | Status | Action |
| --- | --- | --- | --- | --- |
| SEC-001 | High | Production deploy could proceed with example secrets/domains. | fixed | `infra/scripts/deploy.sh` now rejects `change-me`, example domains, and the example admin hash. |
| SEC-002 | High | Admin dashboards needed an edge auth barrier. | fixed | `ADMIN_DOMAIN` is protected by Caddy basic auth. |
| SEC-003 | Medium | API CORS was wildcard-only. | fixed | `CORS_ALLOW_ORIGINS` now controls allowed origins; production example uses the public domain. |
| SEC-004 | Medium | Public responses lacked browser security headers. | fixed | Public Caddy route now sets HSTS, nosniff, referrer policy, permissions policy, frame denial, and CSP. |
| SEC-005 | Medium | Backend image ran as root. | fixed | Backend Docker image now switches to a dedicated `app` user. |
| SEC-006 | Medium | Docker json logs could grow indefinitely. | fixed | Production Compose now applies `max-size=10m` and `max-file=5`. |
| SEC-007 | Medium | Frontend static server could bind port 80 as root. | fixed | Production frontend Caddy now serves on `:8080` as the `caddy` user. |
| SEC-008 | Medium | MinIO data durability depends on VPS backups. | open | Keep `BACKUP_BEFORE_DEPLOY=1` for risky deploys; add remote backup sync before public launch. |
| SEC-009 | Medium | No automated vulnerability scanning yet. | open | Add CI jobs for dependency audit, image scanning, and secret scanning. |
| SEC-010 | Low | API has no rate limiting. | open | Add Caddy or edge-provider rate limiting if abuse appears. |

## Production Security Baseline

### Network

- expose only `80/tcp`, `443/tcp`, and SSH;
- do not publish MinIO, Grafana, Umami, Loki, Alloy, map API, or news service ports directly;
- keep admin tools on `ADMIN_DOMAIN`;
- use provider firewall plus host firewall;
- restrict SSH by key and ideally by source IP or VPN.

### Secrets

- never deploy with `.env.prod.example` values;
- generate unique values for S3, MinIO, Umami, Grafana, and admin basic auth;
- store `.env` only on the server with `chmod 600`;
- do not commit `.env`;
- rotate secrets after any accidental exposure.

### Application

- keep public APIs read-only;
- keep ingestion as an on-demand/scheduled job, not a public service;
- keep all official source URLs visible in public records;
- keep modeled/risk data separate from official reported cases.

### Containers

- run production through `docker-compose.prod.yml`;
- keep Docker daemon access limited to deploy users only;
- use no-new-privileges in production Compose;
- keep Docker json logs size-limited;
- update base images on a regular cadence.

### Observability

- keep Umami and Grafana admin UIs behind Caddy basic auth;
- use Grafana/Loki for service logs;
- use JSON API access logs for request-level investigation;
- alert or manually check for 5xx bursts, failed ingestion, stale manifests, disk pressure, and backup failures.

## Launch Gate

Do not point public DNS at the VPS until all items pass:

- `.env` has no `change-me`, no example domains, and no example auth hash;
- SSH password login is disabled;
- firewall exposes only SSH, 80, and 443;
- `docker compose --env-file .env -f docker-compose.prod.yml config` passes;
- Caddy validates the production Caddyfile;
- public API health endpoints return 200 over HTTPS;
- admin routes require basic auth;
- ingestion writes a fresh manifest;
- backup and restore are tested on a non-production copy or disposable volume;
- Grafana shows backend logs after a test request.

## Next Security Backlog

| ID | Priority | Task |
| --- | --- | --- |
| SEC-011 | P0 | Add remote encrypted backup sync for MinIO volume. |
| SEC-012 | P0 | Add CI secret scanning and dependency scanning. |
| SEC-013 | P1 | Add image vulnerability scanning before deploy. |
| SEC-014 | P1 | Add deployment rollback script pinned to a previous git SHA/image tag. |
| SEC-015 | P1 | Add uptime and stale-manifest alerts. |
| SEC-016 | P2 | Add Caddy rate limiting if public traffic or abuse requires it. |
| SEC-017 | P2 | Move admin auth to VPN/SSO when more than one admin appears. |
