# Backlog

This is the shared backlog before a dedicated issue tracker exists.

Keep new items short at first. When an item becomes ready for implementation, expand acceptance criteria and move or copy it into the relevant stage plan.

## Inbox

| ID | Title | Stage | Area | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| OHV-040 | Add CI/CD pipeline for tests and Docker config validation | 06 | infra | P1 | todo |
| OHV-041 | Add immutable GHCR image publishing | 06 | infra | P2 | todo |
| OHV-044 | Add encrypted remote backup sync | 06 | infra | P0 | todo |
| OHV-045 | Add uptime and stale-manifest alerts | 06 | observability | P1 | todo |
| OHV-046 | Add dependency, image, and secret scanning in CI | 06 | security | P1 | todo |

## Ready

Move items here when requirements and acceptance criteria are clear.

| ID | Title | Stage | Area | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| OHV-037 | Implement PAHO adapter proof of concept | 07 | ingestion | P2 | ready |
| OHV-038 | Add Rospotrebnadzor source registry and parser fixtures | 07 | ingestion | P2 | ready |
| OHV-039 | Add risk layer contracts and disabled frontend layer | 07 | geo | P2 | ready |

## In Progress

| ID | Title | Stage | Area | Priority | Owner | Started |
| --- | --- | --- | --- | --- | --- | --- |

## Blocked

| ID | Title | Blocker | Next Action |
| --- | --- | --- | --- |
| OHV-036 | Verify real VPS production deploy | Needs a target server and real domains/secrets | Run `infra/scripts/deploy.sh` on VPS after DNS and `.env` are prepared |

## Done

| ID | Title | Completed | Notes |
| --- | --- | --- | --- |
| OHV-001 | Choose final map engine: MapLibre GL JS or Leaflet | 2026-05-12 | Accepted MapLibre GL JS in ADR-004 |
| OHV-002 | Choose production storage: MinIO on VPS or managed S3 | 2026-05-12 | Accepted MinIO for first VPS deploy with S3-compatible abstraction in ADR-005 |
| OHV-003 | Confirm first official data source URLs and licenses | 2026-05-12 | Added `docs/planning/source-inventory.md` |
| OHV-004 | Define canonical region code strategy | 2026-05-12 | Added `docs/planning/region-codes.md` and ADR-006 |
| OHV-005 | Scaffold monorepo and Docker Compose stack | 2026-05-12 | Added Compose stack, Dockerfiles, env example, README; config validates, runtime blocked by Docker daemon |
| OHV-006 | Implement shared Pydantic contracts | 2026-05-12 | Added shared contracts and tests |
| OHV-007 | Implement S3 storage wrapper and MinIO init | 2026-05-12 | Added `S3Storage` and MinIO bucket init script |
| OHV-010 | Implement map API health and metadata endpoints | 2026-05-12 | Added FastAPI map API skeleton and endpoint tests |
| OHV-011 | Implement news service health endpoint and feed contract placeholder | 2026-05-12 | Added FastAPI news service skeleton and endpoint tests |
| OHV-008 | Implement CDC adapter proof of concept | 2026-05-12 | Added CDC widget JSON adapter; dry-run produced 41 state-level case aggregates |
| OHV-009 | Implement WHO news/outbreak adapter proof of concept | 2026-05-12 | Added WHO DON API adapter; relevance-filtered dry-run produced 11 news and 11 outbreak records |
| OHV-023 | Implement source adapter interface and ingestion dry-run CLI | 2026-05-12 | Added adapter interface, raw artifact model, normalized result model, and S3 write path |
| OHV-028 | Research ECDC annual report parsing feasibility | 2026-05-12 | Added `docs/planning/ecdc-feasibility.md`; PDF table extraction is feasible |
| OHV-024 | Add PyMuPDF dependency and PDF text extractor helper | 2026-05-12 | Added `pymupdf` dependency and `extract_pdf_text` helper |
| OHV-025 | Implement ECDC annual report adapter | 2026-05-12 | Added ECDC AER 2023 adapter; dry-run produced 28 country-level case aggregates |
| OHV-026 | Add ECDC PDF table parser fixtures | 2026-05-12 | Added text fixture extracted from Table 1 |
| OHV-027 | Normalize ECDC 2023 country aggregates | 2026-05-12 | Emits 2023 country-level `CaseAggregate` records with `official_report_derived` confidence |
| OHV-029 | Generate public map/news/stat projection artifacts | 2026-05-12 | Added public GeoJSON, summary, timeline, news feed, and latest manifest writer |
| OHV-030 | Serve public artifacts through map and news APIs | 2026-05-12 | Added map regions, outbreaks, stats, timeline, sources, news feed/detail/tags endpoints |
| OHV-012 | Build first map screen with left news panel | 2026-05-12 | Added MapLibre map workspace, summary, news panel, selected region panel, and layer toggles |
| OHV-013 | Add source attribution and freshness indicators | 2026-05-12 | Frontend shows source links, source labels, data freshness, and live/fallback data state |
| OHV-014 | Add Umami analytics container and frontend tracking | 2026-05-12 | Added Umami profile, optional frontend script install, and event tracking helpers |
| OHV-015 | Add Loki/Grafana/Alloy logging profile | 2026-05-12 | Added observability profile and filtered Alloy log collection to running containers in this Compose project |
| OHV-016 | Add production Caddy reverse proxy config | 2026-05-12 | Added Caddy routes for public frontend, APIs, public analytics ingest, and admin tools |
| OHV-017 | Add production deploy script | 2026-05-12 | Added `infra/scripts/deploy.sh` |
| OHV-018 | Add ingestion cron documentation and command | 2026-05-12 | Added cron example in operations runbook |
| OHV-022 | Verify local Docker Compose runtime | 2026-05-12 | Docker Desktop started; local stack, MinIO writes, APIs, frontend, Umami, Grafana, Loki, and Alloy verified |
| OHV-031 | Separate local and production frontend Docker images | 2026-05-12 | Avoided dev/prod image-name collision between Vite and Caddy frontend images |
| OHV-033 | Add browser visual regression smoke checks | 2026-05-13 | Added Playwright desktop/mobile smoke checks for API-loaded frontend rendering |
| OHV-034 | Harden production admin auth at reverse proxy layer | 2026-05-13 | Added Caddy basic auth on the production admin domain |
| OHV-035 | Add structured JSON access logs for API services | 2026-05-13 | Added FastAPI middleware and JSON formatter with request log test coverage |
| OHV-019 | Research PAHO adapter feasibility | 2026-05-13 | Added `docs/planning/paho-feasibility.md` |
| OHV-020 | Research Rospotrebnadzor regional parsing feasibility | 2026-05-13 | Added `docs/planning/rospotrebnadzor-feasibility.md` |
| OHV-021 | Research ecological risk layer data model | 2026-05-13 | Added `docs/planning/risk-layer-feasibility.md` |
| OHV-042 | Run production security review | 2026-05-13 | Added `docs/security/security-review.md` and fixed MVP hardening gaps |
| OHV-043 | Write production deployment and update playbook | 2026-05-13 | Added `docs/operations/production-deployment-playbook.md` |
