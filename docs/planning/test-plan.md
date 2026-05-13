# Full Verification Plan

Last updated: 2026-05-13

This plan defines the verification gate for the MVP skeleton. It is intentionally broader than unit tests: source parsing, projections, APIs, frontend, Docker configuration, production configuration, and planning status must all be checked.

## Test Levels

### 1. Static Code Checks

Backend:

- `python3 -m compileall backend`
- `.venv/bin/python -m ruff check backend`

Frontend:

- `pnpm build`
- `pnpm test`
- `pnpm test:e2e`

Docker:

- `docker compose config`
- `docker compose --profile observability config`
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config`

### 2. Backend Unit Tests

Command:

```bash
.venv/bin/python -m pytest backend/tests
```

Coverage target for MVP:

- contracts validate expected data;
- source parsers handle representative fixtures;
- PDF extraction works;
- ingestion JSONL writer works;
- projection generation works;
- API endpoints return expected shapes;
- managed empty/missing data paths do not crash.

### 3. Source Adapter Smoke Tests

Commands:

```bash
.venv/bin/python -m services.data_ingestion run --source cdc --dry-run
.venv/bin/python -m services.data_ingestion run --source ecdc --dry-run
.venv/bin/python -m services.data_ingestion run --source who --dry-run
.venv/bin/python -m services.data_ingestion run-all --dry-run
```

Expected:

- CDC emits state-level case aggregates.
- ECDC emits country-level case aggregates.
- WHO emits news items and outbreak events.
- warnings are logged, not swallowed.

### 4. Projection Tests

Expected public artifacts:

```text
public/map/latest/regions.geojson
public/map/latest/outbreaks.geojson
public/stats/latest/summary.json
public/timeline/latest/cases.json
public/news/latest/feed.json
manifests/latest.json
```

Checks:

- output is valid JSON/GeoJSON;
- every public feature has source and confidence metadata;
- reported cases and outbreak events are separate;
- modeled risk is absent until a risk model exists;
- null geometry is allowed only for events without reliable location.

### 5. API Tests

Endpoints:

```text
GET /health
GET /v1/metadata
GET /v1/map/regions
GET /v1/map/outbreaks
GET /v1/stats/summary
GET /v1/stats/timeline
GET /v1/sources
GET /v1/news
GET /v1/news/{id}
GET /v1/news/tags
```

Checks:

- response models validate;
- missing public artifacts return safe defaults or managed errors;
- source attribution is present;
- API does not leak storage credentials or stack traces.

### 6. Frontend Tests

Commands:

```bash
cd frontend
pnpm build
pnpm test
pnpm test:e2e
```

Manual/browser smoke:

- first viewport is the application, not a landing page;
- map workspace renders;
- news panel renders;
- source/freshness indicators are visible;
- API base URLs are configurable;
- mobile layout does not overlap text.
- Playwright smoke passes for desktop and mobile projects.

### 7. Docker Runtime Tests

Requires local Docker daemon.

Commands:

```bash
cp .env.example .env
docker compose up --build
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8000/v1/metadata
curl http://localhost:8001/v1/news
docker compose run --rm data-ingestion python -m services.data_ingestion run-all
docker compose --profile observability up -d
```

Expected:

- MinIO bucket is initialized;
- API services report S3 as `ok`;
- ingestion writes raw, normalized, public, and manifest artifacts;
- frontend is available at `http://localhost:5173`;
- Umami is available at `http://localhost:3000`;
- Grafana is available at `http://localhost:3001`;
- Alloy only ships logs for running containers in the current Compose project.

### 8. Production Compose Tests

Does not require production deployment.

Commands:

```bash
docker compose --env-file .env.prod.example -f docker-compose.prod.yml config
docker compose --env-file .env.prod.example -f docker-compose.prod.yml build frontend map-api news-service
```

Checks:

- Caddy routes frontend and APIs;
- admin analytics and Grafana routes are defined;
- persistent volumes exist for Caddy, MinIO, Umami DB, Grafana, Loki;
- secrets are environment-driven, not hardcoded.

### 9. Planning And Documentation Checks

Files to update:

- `docs/planning/status-log.md`
- `docs/planning/roadmap.md`
- `docs/planning/backlog.md`
- relevant stage files

Checks:

- completed work is marked `done`;
- blocked Docker runtime work remains visible;
- verification results are recorded;
- next actions are explicit.

### 10. Observability And Admin Access Checks

Commands:

```bash
docker compose --profile observability config
docker compose --env-file .env.prod.example -f docker-compose.prod.yml config
```

Checks:

- production admin domain has reverse-proxy authentication before `/analytics` and `/grafana`;
- public analytics script and ingest routes remain available on the public domain;
- API request logs are JSON and include service, event, method, path, status code, and duration;
- Grafana provisions the Loki datasource and backend logs dashboard.

## Current External Gap

Local Docker runtime verification has passed. The remaining external gap is a real VPS deploy with DNS, HTTPS issuance, and production secrets.
