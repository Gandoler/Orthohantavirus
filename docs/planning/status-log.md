# Status Log

Use this file for chronological progress notes. Keep it concise and factual.

## 2026-05-13

### Remaining Work Audit

Status: done

Completed:

- audited remaining MVP and post-MVP work;
- added `docs/planning/remaining-work.md`;
- closed P0/P1 local gaps for admin protection, JSON access logs, and browser smoke tests;
- researched PAHO, Rospotrebnadzor, and ecological risk-layer feasibility;
- moved next post-MVP implementation tasks to `ready`.

Verification:

- `python3 -m compileall backend`: passed;
- `.venv/bin/python -m ruff check backend`: passed;
- `.venv/bin/python -m pytest backend/tests`: 17 passed, 5 PyMuPDF/SWIG deprecation warnings;
- `pnpm test`: 5 passed;
- `pnpm test:e2e`: 2 passed;
- `pnpm build`: passed;
- `docker compose config`: passed;
- `docker compose --profile observability config`: passed;
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config`: passed;
- Caddy config validation through `caddy:2-alpine`: passed;
- `docker compose --profile observability up -d --build`: passed;
- local smoke checks returned 200/ok for map API, news service, frontend, and Grafana;
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml build frontend map-api news-service`: passed.

Blocked:

- real VPS production deploy still requires server access, DNS, and production secrets.

Next:

- implement PAHO adapter proof of concept;
- add Rospotrebnadzor source registry and manual-review-first parser fixtures;
- add risk-layer contracts and disabled frontend layer;
- add CI/CD pipeline before repeated server deploys.

### Stage 04: Frontend MVP

Status: done

Completed:

- added Playwright browser smoke checks for desktop and mobile;
- mocked map/news APIs in browser tests;
- blocked external OSM tile requests in tests to keep smoke checks deterministic.

Verification:

- `pnpm test:e2e`: 2 passed.

### Stage 05: Admin Observability

Status: done

Completed:

- added structured JSON access logging middleware for map API and news service;
- added API request log test coverage;
- added Grafana Loki datasource provisioning;
- added backend logs dashboard provisioning.

Verification:

- `.venv/bin/python -m pytest backend/tests/test_service_endpoints.py -q`: 8 passed.
- local API log smoke produced a JSON `request_finished` record for `GET /health`.

### Stage 06: Production Deploy

Status: review

Completed:

- added Caddy basic auth to the production admin domain;
- added admin auth variables to `.env.prod.example` and production Compose.

Verification:

- Caddy config validation through `caddy:2-alpine`: passed;
- production Compose config render: passed;
- production frontend/map-api/news-service build: passed.

Blocked:

- real HTTPS/domain verification requires a VPS and DNS.

## 2026-05-12

### Stage 00: Discovery

Status: done

Completed:

- confirmed first official source set: WHO DON API/pages, CDC reported cases, ECDC surveillance/annual reports;
- added `docs/planning/source-inventory.md`;
- added `docs/planning/region-codes.md`;
- accepted ADRs for MapLibre GL JS, MinIO/S3 storage strategy, and ISO region codes;
- moved Stage 01 implementation tasks to `ready`.

### Stage 01: Foundation

Status: done

Completed:

- added Docker Compose local stack with MinIO, map API, news service, data-ingestion command container, and frontend;
- added `.env.example`;
- added backend FastAPI skeletons with `/health`, `/v1/metadata`, `/v1/news`, and `/v1/news/tags`;
- added shared Pydantic contracts for regions, cases, outbreaks, news, metadata, and health responses;
- added S3/MinIO storage wrapper;
- added MinIO bucket init script;
- added Vite/React frontend shell;
- added backend tests and frontend build verification;
- added root `README.md` with local commands.

Verification:

- `python3 -m compileall backend`: passed;
- `.venv/bin/python -m pytest backend/tests`: 5 passed;
- `.venv/bin/python -m ruff check backend`: passed;
- `pnpm build` in `frontend`: passed;
- `docker compose config`: passed.
- `pnpm dev --host 0.0.0.0` in `frontend`: running at `http://localhost:5173/`;
- `curl -I http://localhost:5173/`: returned `HTTP/1.1 200 OK`.
- `docker compose up --build -d`: passed after resolving frontend Node/pnpm and MinIO port conflicts.

Blocked:

- none.

Next:

- keep Docker image names split between dev/prod frontend images.

### Stage 02: Data Ingestion

Status: done

Completed:

- discovered CDC embedded GIS JSON endpoint: `https://gis.cdc.gov/grasp/HantavirusCaseViewAPI/GetData_JSON_ByYear?appVersion=Public`;
- added source adapter interface and normalized source run result model;
- implemented CDC Hantavirus adapter POC;
- implemented WHO Disease Outbreak News adapter POC;
- added dry-run ingestion CLI;
- added S3 raw/normalized write path for source run results;
- added parser fixtures and ingestion adapter tests;
- researched ECDC Annual Epidemiological Report 2023 parsing feasibility;
- added `docs/planning/ecdc-feasibility.md`;
- added `pymupdf` dependency and PDF extraction helper;
- implemented ECDC Annual Epidemiological Report 2023 adapter;
- added ECDC table parser fixture and tests;
- added public projection writer for map, stats, timeline, news, and latest manifest;
- tightened WHO relevance filtering to remove incidental non-hantavirus mentions.

Verification:

- `.venv/bin/python -m services.data_ingestion run --source cdc --dry-run`: produced 41 case aggregates;
- `.venv/bin/python -m services.data_ingestion run --source who --dry-run`: produced 11 relevant news items and 11 outbreak events;
- `.venv/bin/python -m services.data_ingestion run --source ecdc --dry-run`: produced 28 case aggregates with two non-reporting warnings;
- `.venv/bin/python -m services.data_ingestion run-all --dry-run`: produced CDC, ECDC, and WHO outputs;
- `docker compose run --rm data-ingestion python -m services.data_ingestion run-all`: wrote artifacts to MinIO;
- `curl http://localhost:8000/v1/stats/summary`: returned 69 case records, 2775 reported cases, 309 deaths, 11 outbreak events, and 11 news items;
- `.venv/bin/python -m pytest backend/tests`: 16 passed;
- `.venv/bin/python -m ruff check backend`: passed;
- `pnpm build` in `frontend`: passed;
- `docker compose config`: passed;
- ECDC PDF text extraction via `pdftotext -layout`: feasible; Table 1 is extractable.

Blocked:

- none for local MVP ingestion.

Next:

- research PAHO and Rospotrebnadzor adapters;
- continue improving source-specific relevance filters.

### Stage 03: Map API And News API

Status: done

Completed:

- added map API endpoints for metadata, regions, outbreaks, summary, timeline, and sources;
- added news API endpoints for feed, tags, detail, and feed filters;
- added safe public artifact fallback reader;
- added endpoint tests.

Verification:

- `.venv/bin/python -m pytest backend/tests`: 16 passed;
- `.venv/bin/python -m ruff check backend`: passed;
- Docker-hosted API smoke returned 200 for map/news health and data endpoints.

### Stage 04: Frontend MVP

Status: review

Completed:

- added MapLibre map workspace with OSM base layer;
- added reported-case and outbreak-report layer toggles;
- added summary metrics, left news panel, selected region panel, source links, and freshness state;
- added optional analytics tracking for region selection, layer toggles, and source link opens;
- fixed Docker dev/prod frontend image-name collision.

Verification:

- `pnpm test`: 5 passed;
- `pnpm build`: passed;
- `docker compose up --build -d frontend`: passed;
- `curl -I http://localhost:5173/`: returned `HTTP/1.1 200 OK`.

Remaining:

- add browser-level visual smoke checks for desktop/mobile.

### Stage 05: Admin Observability

Status: review

Completed:

- added Umami analytics profile and frontend script integration;
- added Loki/Grafana/Alloy observability profile;
- filtered Alloy Docker log collection to running containers in this Compose project;
- added production admin routes for analytics and Grafana.

Verification:

- `docker compose --profile observability up -d`: passed;
- `curl http://localhost:3000/`: returned 200 for Umami;
- `curl http://localhost:3001/login`: returned 200 for Grafana;
- Alloy/Loki logs showed no new warn/error entries after the project/running-container filter was applied.

Remaining:

- add production admin auth hardening before exposing dashboards.

### Stage 06: Production Deploy

Status: review

Completed:

- added `docker-compose.prod.yml`;
- added Caddyfile;
- added `.env.prod.example`;
- added deploy, backup, and restore scripts;
- added operations runbook with cron and smoke-test commands.

Verification:

- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config`: passed;
- `docker compose --env-file .env.prod.example -f docker-compose.prod.yml build frontend map-api news-service`: passed.

Remaining:

- run the documented deploy on a real VPS with real domains and secrets.
