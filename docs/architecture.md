# Orthohantavirus Map: architecture draft

## Goal

Build a public web app about orthohantavirus / hantavirus infection with an interactive map, regional outbreak/risk layers, and a news feed.

Implementation planning lives in `docs/planning/`:

- `docs/planning/roadmap.md` for the staged roadmap;
- `docs/planning/backlog.md` for the working backlog;
- `docs/planning/stages/` for stage-specific plans and gate checklists;
- `docs/planning/decisions.md` for architecture decision records.

The product should clearly separate:

- official reported cases and outbreaks;
- ecological or historical risk zones;
- news and source updates;
- editorial explanations and prevention guidance.

This separation is important because many sources publish only aggregated case data, while exact patient locations are usually unavailable or intentionally hidden for privacy.

## Product Shape

The first screen is the actual working map.

- Left panel: news feed, filters, selected source updates.
- Main area: interactive map with layers.
- Right or bottom sheet: selected region/outbreak details.
- Top controls: disease form, date range, source confidence, layer visibility.

Primary user flows:

- see current outbreak/news updates;
- inspect a country or region on the map;
- compare reported cases over time;
- understand whether a marker means a confirmed case, a probable case, an outbreak report, or a modeled risk area;
- open original source links.

## High-Level Architecture

```mermaid
flowchart LR
    Sources[Official sources and feeds] --> Ingestion[Data ingestion service]
    Sources --> NewsIngestion[News ingestion service]

    Ingestion --> RawS3[(S3 raw zone)]
    Ingestion --> CuratedS3[(S3 curated zone)]
    Ingestion --> IndexS3[(S3 public index zone)]

    NewsIngestion --> NewsRawS3[(S3 news raw zone)]
    NewsIngestion --> NewsIndexS3[(S3 news index zone)]

    Api[Map API service] --> IndexS3
    Api --> CuratedS3
    NewsApi[News API service] --> NewsIndexS3

    Frontend[React map frontend] --> Api
    Frontend --> NewsApi
```

The system is intentionally split into three backend services:

- `data-ingestion-service`: fetches, parses, normalizes, validates, and writes map datasets to S3.
- `map-api-service`: serves frontend-ready map and statistics data.
- `news-service`: fetches/parses news-like updates and serves the feed.

## Repository Layout

Proposed monorepo layout:

```text
.
├── backend
│   ├── services
│   │   ├── data_ingestion
│   │   ├── map_api
│   │   └── news_service
│   ├── shared
│   │   ├── contracts
│   │   ├── geo
│   │   ├── storage
│   │   ├── sources
│   │   └── observability
│   └── tests
├── frontend
│   ├── src
│   │   ├── app
│   │   ├── api
│   │   ├── map
│   │   ├── news
│   │   ├── regions
│   │   └── ui
│   └── public
├── docs
└── infra
```

## Data Sources

Initial source candidates:

- CDC hantavirus reported cases and NNDSS tables for the United States.
- ECDC Surveillance Atlas and Annual Epidemiological Reports for Europe.
- WHO Disease Outbreak News for notable international outbreaks.
- PAHO epidemiological alerts for the Americas.
- Rospotrebnadzor regional pages and annual reports for Russian HFRS / GLPS data.
- GBIF or IUCN species distribution data for reservoir-host/risk layers.

Each source should be implemented as an adapter:

```text
SourceAdapter
├── fetch()
├── parse()
├── normalize()
├── validate()
└── emit_records()
```

Do not let source-specific parsing leak into API or frontend code.

## Recommended Libraries By Stage

This stack is optimized for fast development without locking the project into heavy infrastructure too early.

### 1. Repository Bootstrap

Use:

- `uv` for Python dependency management, virtual environments, and reproducible command execution.
- `pnpm` for frontend packages and workspaces.
- Docker Compose for the local stack: MinIO, backend services, frontend, optional database.
- `ruff` for Python linting and formatting.
- `pytest` for backend tests.
- `vitest` for frontend unit/component tests.
- Playwright for browser-level frontend checks.

Suggested rule: start with simple monorepo scripts before adding a task runner. If commands become repetitive, add `just` or `make`.

### 2. Shared Backend Contracts

Use:

- `pydantic` for canonical records, source adapter outputs, API responses, and validation.
- `pydantic-settings` for service configuration from environment variables.
- `orjson` for fast JSON serialization when API payloads become large.
- `python-dateutil` or `pendulum` for source date parsing, but keep canonical output as ISO strings.

The shared contracts should live under `backend/shared/contracts`. The ingestion service, map API, news service, and tests should all import the same models.

Optional later:

- `datamodel-code-generator` if JSON Schema/OpenAPI contracts start driving both Python and TypeScript.
- `openapi-typescript` to generate frontend API types from FastAPI OpenAPI output.

### 3. Data Fetching And Source Adapters

Use:

- `httpx` as the default HTTP client. It supports sync and async APIs, so the same library can work in simple scripts and services.
- `tenacity` for retries with backoff around unreliable public sources.
- `selectolax` for fast HTML parsing with CSS selectors.
- `beautifulsoup4` only as a fallback for especially malformed pages or one-off parsing.
- `feedparser` for RSS/Atom feeds.
- Playwright only for sources that require browser rendering. Keep it out of the common adapter path.

Adapter structure:

```text
fetch raw bytes/html/pdf -> store raw in S3 -> parse -> normalize -> validate -> emit JSONL
```

Avoid doing browser automation for official sources unless the content is genuinely unavailable in static HTML, RSS, PDF, or public JSON.

### 4. PDF And Document Parsing

Use:

- `PyMuPDF` for general PDF text extraction, page rendering, and robust document handling.
- `pdfplumber` for tables when source reports publish tabular data in PDFs.
- `pytesseract` only for scanned PDFs/images where text extraction fails.

Keep parsed PDF output as intermediate artifacts:

```text
raw/source.pdf
intermediate/source.pages.json
intermediate/source.tables.json
normalized/cases/*.jsonl
```

This makes parser debugging much faster because failures can be reproduced without refetching the original file.

### 5. Data Transformation

Use:

- `polars` for CSV/JSONL transformations, joins, grouping, and validation reports.
- `duckdb` for local analytical queries over JSON/Parquet/CSV, especially when generating public projections.
- `pyarrow` if the project moves from JSONL to Parquet for normalized datasets.

MVP recommendation: write normalized records as JSONL first. Add Parquet once data volume or analytical queries justify it.

### 6. Geospatial Processing

Use:

- `geopandas` for region polygons, joins between records and administrative boundaries, and GeoJSON exports.
- `shapely` for geometry operations.
- `pyproj` for coordinate reference system conversion.
- `pyogrio` for faster vector file reads/writes when GeoPandas I/O becomes slow.

Data conventions:

- store canonical geometries in WGS84 / EPSG:4326;
- keep region identifiers stable, for example ISO country codes and ISO-3166-2 admin1 codes;
- precompute simplified public GeoJSON for the frontend instead of sending heavy raw boundaries.

Optional later:

- PostGIS if the API needs dynamic geospatial queries.
- Tippecanoe or `martin` if vector tiles become necessary.

### 7. S3 And Object Storage

Use:

- `boto3` as the main S3 client, even for S3-compatible storage.
- MinIO locally through Docker Compose.
- `moto` for unit tests that need fake AWS/S3 behavior.

Implementation detail:

- Wrap all S3 calls in `backend/shared/storage`.
- Do not call `boto3` directly from source adapters or route handlers.
- Publish `manifests/latest.json` last, after all referenced public artifacts are uploaded.

This makes each ingestion run effectively atomic from the API's point of view.

### 8. Scheduling And Workflows

Start with:

- cron, GitHub Actions schedule, or one container command per source;
- `apscheduler` only if the ingestion service itself must own schedules.

Use later if runs become operationally complex:

- Prefect for workflow orchestration, retries, run history, manual reruns, and visibility.

Do not add Celery/RabbitMQ early. The first version can run source adapters as batch jobs that write to S3.

### 9. Map API Service

Use:

- FastAPI for the public API.
- Uvicorn as the ASGI server.
- `pydantic` response models for API contracts.
- `pydantic-settings` for environment configuration.
- `cachetools` or a small in-process cache for S3 public projections.
- `orjson` for large JSON/GeoJSON responses.

MVP behavior:

- load `manifests/latest.json`;
- cache referenced public artifacts;
- refresh cache by TTL or manifest ETag;
- serve frontend-ready JSON/GeoJSON.

Optional later:

- SQLAlchemy + Postgres/PostGIS if S3 projections stop being enough.
- Redis only if multiple API replicas need shared cache or rate-limit state.

### 10. News Service

Use:

- `httpx` for fetching official pages.
- `feedparser` for RSS/Atom.
- `selectolax` for static HTML extraction.
- `PyMuPDF` / `pdfplumber` for PDF alerts.
- `pydantic` for normalized news items.

Optional later:

- `trafilatura` or `readability-lxml` for article text extraction from messy secondary sources.
- a manual-review queue if secondary media sources are added.

MVP recommendation: official sources only. Secondary news can be useful, but it should have lower confidence and should not update case counts automatically.

### 11. Frontend Foundation

Use:

- React + TypeScript.
- Vite for development and production build.
- MapLibre GL JS as the primary map engine if the app needs styled vector layers, choropleths, and future vector tiles.
- Leaflet only if the MVP stays simple: raster tiles, markers, and lightweight GeoJSON.
- TanStack Query for API data fetching, caching, retries, and loading/error state.
- Zustand for UI state that is not server data: selected layer, selected region, panel state, date range.
- React Router if the app has shareable URLs for regions, outbreaks, or news items.

Recommended split:

- server/cache state: TanStack Query;
- map/UI state: Zustand;
- URL state: React Router search params.

### 12. Frontend UI And Visualization

Use:

- `lucide-react` for icons.
- CSS modules or plain CSS with a small local design system for the first version.
- Radix UI only for complex accessible primitives like dialogs, popovers, tabs, and tooltips.
- `date-fns` for date formatting.
- `recharts` or Apache ECharts for timelines if simple SVG charts are not enough.

Map-specific helpers:

- `supercluster` for clustered point markers.
- `@turf/turf` for lightweight client-side geographic calculations, but keep authoritative geospatial processing in the backend.

Avoid adding a large component framework until the UI patterns are clear. The app needs a dense map/news workspace, not a marketing-site component kit.

### 13. Testing

Backend:

- `pytest` for unit and integration tests.
- `respx` for mocking `httpx` source fetches.
- `moto` for S3-like tests.
- golden-file fixtures for source parser tests.

Frontend:

- `vitest` for units.
- Testing Library for React components.
- MSW for API mocking in tests and local demos.
- Playwright for end-to-end checks and map rendering smoke tests.

Parser tests should preserve real source fragments under `backend/tests/fixtures/sources`. This protects adapters from silent source layout changes.

### 14. Observability

Use:

- standard structured JSON logs first.
- `structlog` if logs need richer context binding across services.
- OpenTelemetry later for traces and metrics across services.

Every ingestion run should emit a manifest with:

- run id;
- source name;
- started/finished timestamps;
- fetched URLs;
- raw object keys;
- record counts;
- validation warnings/errors;
- public artifact keys;
- parser version or git commit.

For this project, run manifests are more valuable early than a full metrics stack.

### 15. Admin Analytics And Logs

Use:

- Umami for admin-visible visitor counters and lightweight product analytics.
- Grafana Loki for centralized logs.
- Grafana for log search and operational dashboards.
- Grafana Alloy to collect Docker container logs and ship them to Loki.

Why Umami for MVP:

- self-hosted;
- simple Docker deployment;
- privacy-focused analytics without needing a custom analytics service;
- built-in admin dashboard;
- API is available if the app later needs a small custom admin overview.

Alternatives:

- Plausible if the project prefers its Stats API and reporting model.
- Matomo if the project needs a very feature-rich analytics suite.
- PostHog if the project later needs funnels, feature flags, experiments, and deeper product analytics. It is heavier than needed for MVP.

Recommended MVP decision: start with Umami, avoid session replay, avoid fingerprinting, and track only coarse product events.

## S3 Data Lake

S3 is the durable source of truth. Data should be append-only where possible.

Recommended bucket layout:

```text
s3://orthohantavirus-data/
├── raw/
│   ├── cdc/
│   │   └── yyyy/mm/dd/source-file.html
│   ├── ecdc/
│   ├── who/
│   ├── paho/
│   └── rospotrebnadzor/
├── normalized/
│   ├── cases/
│   │   └── snapshot_date=yyyy-mm-dd/part-000.jsonl
│   ├── outbreaks/
│   ├── regions/
│   └── risk_layers/
├── public/
│   ├── map/latest/regions.geojson
│   ├── map/latest/outbreaks.geojson
│   ├── stats/latest/summary.json
│   └── timeline/latest/cases.json
└── manifests/
    ├── latest.json
    └── runs/yyyy-mm-ddThh-mm-ssZ.json
```

Raw files preserve the original fetched material. Normalized files contain internal canonical records. Public files are precomputed frontend/API projections.

## Canonical Data Contracts

### Case Aggregate

```json
{
  "id": "cdc-us-ca-1993-2023-hantavirus-disease",
  "source": "cdc",
  "source_url": "https://...",
  "country_code": "US",
  "admin1_code": "US-CA",
  "admin2_code": null,
  "location_label": "California",
  "geo_precision": "admin1",
  "disease": "hantavirus_disease",
  "clinical_form": "hps_or_non_hps",
  "period_start": "1993-01-01",
  "period_end": "2023-12-31",
  "confirmed_cases": 0,
  "probable_cases": null,
  "deaths": null,
  "confidence": "official",
  "updated_at": "2026-05-12T00:00:00Z"
}
```

### Outbreak Event

```json
{
  "id": "who-don600-mv-hondius-2026",
  "source": "who",
  "source_url": "https://...",
  "title": "Hantavirus cluster linked to cruise ship travel",
  "status": "active",
  "pathogen": "andes_orthohantavirus",
  "started_at": "2026-04-01",
  "reported_at": "2026-05-08",
  "locations": [
    {
      "label": "MV Hondius",
      "country_code": null,
      "lat": null,
      "lon": null,
      "precision": "event"
    }
  ],
  "confirmed_cases": 0,
  "probable_cases": 0,
  "deaths": 0,
  "confidence": "official",
  "summary": "Short normalized summary for UI display."
}
```

### News Item

```json
{
  "id": "who-2026-don600",
  "source": "who",
  "source_url": "https://...",
  "published_at": "2026-05-08T00:00:00Z",
  "fetched_at": "2026-05-12T00:00:00Z",
  "title": "Hantavirus cluster linked to cruise ship travel, Multi-country",
  "summary": "Short editorial or extracted summary.",
  "tags": ["outbreak", "andes-virus", "official"],
  "related_region_codes": [],
  "related_outbreak_ids": ["who-don600-mv-hondius-2026"],
  "language": "en",
  "confidence": "official"
}
```

## Backend Services

### data-ingestion-service

Responsibilities:

- scheduled source fetching;
- source-specific parsing;
- raw artifact storage;
- normalization into canonical records;
- deduplication;
- validation;
- public projection generation;
- manifest publishing.

Suggested runtime:

- Python for parsing-heavy work;
- `httpx` for HTTP;
- `pydantic` for contracts;
- `boto3` or S3-compatible SDK;
- `apscheduler`, cron, or container scheduler for runs.

The service should be idempotent. Running the same source twice for the same date should not corrupt public data.

### map-api-service

Responsibilities:

- serve map-ready datasets;
- expose filterable statistics;
- hide S3 layout from the frontend;
- cache public projections in memory;
- provide health and freshness metadata.

Suggested API:

```text
GET /health
GET /v1/metadata
GET /v1/map/regions?layer=reported_cases&period=latest
GET /v1/map/outbreaks?status=active
GET /v1/stats/summary
GET /v1/stats/timeline?country=US&admin1=US-CA
GET /v1/regions/{region_code}
GET /v1/sources
```

For MVP, the API can read precomputed JSON/GeoJSON from S3. If query needs grow, add Postgres/PostGIS or DuckDB-backed indexing later.

### news-service

Responsibilities:

- fetch official news/update pages;
- parse RSS feeds where available;
- parse selected HTML/PDF pages where RSS is unavailable;
- normalize news items;
- connect news to regions/outbreaks;
- serve the left-panel feed.

Suggested API:

```text
GET /health
GET /v1/news?limit=30&source=who&tag=outbreak
GET /v1/news/{id}
GET /v1/news/related?region=RU-NIZ
GET /v1/news/tags
```

The news service should keep source links visible. A medical/public-health site should never make users guess where a claim came from.

## Frontend Architecture

Suggested stack:

- React + TypeScript;
- Vite;
- MapLibre GL for vector maps, or Leaflet for a simpler MVP;
- TanStack Query for API state;
- Zustand or URL state for filters;
- CSS modules or a small design system layer.

Screen layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: logo, global search, date range, source freshness     │
├───────────────┬──────────────────────────────────────────────┤
│ News panel    │ Map                                           │
│               │                                              │
│ - active      │ - reported cases layer                        │
│ - official    │ - active outbreaks layer                      │
│ - regional    │ - risk/ecology layer                          │
│ - filters     │ - selected region popup                       │
│               │                                              │
├───────────────┴──────────────────────────────────────────────┤
│ Bottom details sheet on mobile                                │
└──────────────────────────────────────────────────────────────┘
```

Frontend modules:

```text
frontend/src
├── app
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
├── api
│   ├── mapApi.ts
│   ├── newsApi.ts
│   └── contracts.ts
├── map
│   ├── HantaMap.tsx
│   ├── layers
│   ├── controls
│   └── popups
├── news
│   ├── NewsPanel.tsx
│   ├── NewsList.tsx
│   └── NewsItem.tsx
├── regions
│   ├── RegionDetails.tsx
│   └── RegionStats.tsx
└── ui
```

Important UI rules:

- Always display data type: `reported cases`, `outbreak report`, `risk layer`, or `news`.
- Always display source and last updated time.
- Never show modeled risk as confirmed infection.
- Keep map colors meaningful: severity/risk should not look like live emergency alerts unless the layer really is active outbreak data.
- On mobile, prioritize map first, then collapsible news/details sheets.

## Data Quality and Safety

Each record should carry:

- source;
- source URL;
- source publication date if known;
- fetch time;
- geographic precision;
- confidence level;
- whether values are confirmed, probable, suspected, modeled, or historical.

Recommended confidence values:

- `official`: government/public-health source;
- `official_report_derived`: parsed from official PDF/HTML, needs parser confidence;
- `secondary_verified`: reputable media citing official source;
- `modelled`: ecological or statistical risk layer;
- `manual_review_required`: parsed but not trusted enough for public display.

## Admin Analytics And Logging

The project needs two separate admin-facing observability layers:

- product analytics: how visitors use the public site;
- operational logs: what backend jobs and services are doing.

Do not mix these into one table or one service. Visitor analytics is about usage patterns. Logs are about debugging and operations.

### Visitor Counters

Use Umami as the first analytics backend.

Admin-visible counters:

- current visitors;
- daily/weekly/monthly pageviews;
- unique visitors;
- top pages;
- top referrers;
- country/device/browser breakdown;
- popular regions on the map;
- popular news items;
- most used map layers;
- source-link clicks.

Frontend tracking events:

```text
page_view
region_select
outbreak_select
news_open
source_link_open
map_layer_toggle
date_range_change
search_submit
```

Event properties should be low-risk and coarse:

```json
{
  "region_code": "US-CA",
  "layer": "reported_cases",
  "source": "cdc",
  "news_id": "who-2026-don600"
}
```

Do not send:

- raw IP addresses from the frontend;
- free-form search text;
- user identifiers;
- precise geolocation;
- medical self-reports;
- anything that implies a visitor's health status.

For free-form search, track only that a search happened, or track a normalized category if one exists.

### Analytics Deployment

Add these optional containers:

```text
umami          # analytics app and admin UI
umami-db       # Postgres for Umami
```

Production route:

```text
https://admin.hanta.example.com/analytics -> umami
```

The Umami dashboard must not be public. Protect it with one of:

- Umami login plus strong credentials;
- Caddy basic auth in front of `/analytics`;
- private admin subdomain behind VPN or Cloudflare Access.

Frontend integration:

```html
<script
  defer
  src="/analytics/script.js"
  data-website-id="..."
></script>
```

If Umami is served from an admin-only host, expose only the tracking script and event endpoint through the public domain, while keeping the dashboard protected.

### Custom Admin Overview

For MVP, use the built-in Umami dashboard directly.

Later, add a small internal admin page that combines:

- Umami API counters;
- latest ingestion run status;
- latest S3 manifest time;
- parser warnings;
- source freshness;
- map API and news service health.

Suggested internal endpoint:

```text
GET /admin/overview
```

This endpoint should be authenticated and should never be exposed as a public API.

### Application Logs

All backend services should log structured JSON to stdout/stderr.

Minimum log fields:

```json
{
  "timestamp": "2026-05-12T18:00:00Z",
  "level": "info",
  "service": "data-ingestion",
  "event": "source_run_finished",
  "run_id": "2026-05-12T18-00-00Z",
  "source": "cdc",
  "duration_ms": 1234,
  "records_emitted": 42
}
```

Log important events:

- source fetch started/finished/failed;
- parser warnings;
- validation errors;
- public manifest published;
- API startup;
- S3 access failures;
- cache refresh;
- request errors.

Do not log:

- S3 secret keys;
- full cookies or auth headers;
- full request bodies by default;
- raw PDF/HTML contents;
- visitor IPs unless there is a clear operational reason and retention is limited.

### Log Sink

Use the Grafana stack for production logs:

```text
grafana        # dashboard and log search UI
loki           # log storage/query backend
alloy          # collects Docker logs and ships them to Loki
```

Production route:

```text
https://admin.hanta.example.com/grafana -> grafana
```

The Grafana dashboard must be admin-only.

Local development can keep this stack behind a Compose profile:

```bash
docker compose --profile observability up -d grafana loki alloy
```

This keeps the default local stack lightweight while still making production-like logs easy to test.

### Retention

Suggested MVP retention:

- Umami analytics: 12-24 months;
- application logs: 14-30 days;
- ingestion manifests: permanent;
- raw source artifacts in S3: permanent or long-term archive.

Visitor analytics and operational logs should have shorter retention than source data. Source data is part of the public-health dataset lineage; visitor data is not.

## Deployment

The project should be Docker-first from day one: the same service boundaries should run locally through Docker Compose and later on a VPS through a production Compose file.

### Deployment Goals

- One command local start for development.
- One command rebuild/restart on a server.
- No Kubernetes for MVP.
- No manual service setup on the host except Docker, Docker Compose, firewall, and domain DNS.
- Same images for local and production, with behavior controlled by environment variables.
- Local MinIO by default, production can use either MinIO or managed S3.

### Containerized Services

Expected containers:

```text
reverse-proxy       # Caddy or Traefik in production
frontend            # Vite dev server locally, static nginx/Caddy image in production
map-api             # FastAPI
news-service        # FastAPI
data-ingestion      # batch/scheduled worker image
minio               # local S3-compatible storage, optional production storage
minio-init          # creates local buckets and policies
umami               # visitor analytics dashboard and event collector
umami-db            # Postgres for Umami
grafana             # admin dashboards and log search
loki                # log storage/query backend
alloy               # Docker log collector for Loki
postgres            # optional, only after S3-only API becomes insufficient
redis               # optional, only if shared cache/rate limits/background jobs require it
```

For MVP, the required runtime services are:

- `frontend`;
- `map-api`;
- `news-service`;
- `data-ingestion`;
- `minio` locally or external S3 in production;
- `umami` for admin-visible visitor counters;
- `grafana`, `loki`, and `alloy` for production log collection.

### Proposed Docker Files

Recommended repository layout:

```text
.
├── docker-compose.yml               # local development
├── docker-compose.prod.yml          # production server
├── .env.example                     # shared documented variables
├── backend
│   ├── Dockerfile                   # common backend image
│   └── services
│       ├── data_ingestion
│       ├── map_api
│       └── news_service
├── frontend
│   ├── Dockerfile                   # production static build
│   └── Dockerfile.dev               # optional dev image
└── infra
    ├── caddy
    │   └── Caddyfile
    ├── minio
    │   └── init-buckets.sh
    └── scripts
        ├── deploy.sh
        ├── backup-minio.sh
        └── restore-minio.sh
```

### Local Docker Compose

Local development should mount source code into containers and expose service ports directly.

Expected commands:

```bash
cp .env.example .env
docker compose up --build
docker compose run --rm data-ingestion python -m services.data_ingestion run --source cdc
```

Local URLs:

```text
frontend:     http://localhost:5173
map-api:      http://localhost:8000
news-service: http://localhost:8001
minio:        http://localhost:9000
minio-ui:     http://localhost:9001
```

Local Compose responsibilities:

- start MinIO;
- create the application bucket automatically;
- run API services with reload enabled;
- run frontend Vite dev server;
- keep ingestion executable as an on-demand batch container.

The ingestion service should not run an infinite scheduler locally by default. It is cleaner to trigger specific sources manually while developing parsers.

### Production Docker Compose

Production should run on a single VPS first.

Expected server setup:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Expected deploy flow:

```bash
git pull
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

For the first production version, prefer Caddy as the reverse proxy because it gives automatic HTTPS with minimal config.

Production routes:

```text
https://hanta.example.com/          -> frontend
https://hanta.example.com/api/map/  -> map-api
https://hanta.example.com/api/news/ -> news-service
https://admin.hanta.example.com/analytics -> umami
https://admin.hanta.example.com/grafana   -> grafana
```

The frontend should call relative API URLs in production:

```text
/api/map/v1/...
/api/news/v1/...
```

This avoids CORS complexity in production.

### Environment Variables

Keep `.env.example` committed and real `.env` files ignored.

Required variables:

```text
APP_ENV=local
APP_PUBLIC_BASE_URL=http://localhost:5173

S3_ENDPOINT_URL=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=orthohantavirus-data
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio-password
S3_FORCE_PATH_STYLE=true

MAP_API_PORT=8000
NEWS_SERVICE_PORT=8001

INGESTION_DEFAULT_SOURCES=cdc,ecdc,who
INGESTION_WRITE_PUBLIC=true

UMAMI_DATABASE_URL=postgresql://umami:umami-password@umami-db:5432/umami
UMAMI_APP_SECRET=change-me
UMAMI_WEBSITE_ID=change-me-after-first-setup

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change-me
LOKI_RETENTION_DAYS=30

LOG_LEVEL=info
```

Production can switch to managed S3 by changing only:

```text
S3_ENDPOINT_URL=
S3_REGION=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false
```

Do not bake secrets into images. Containers should receive secrets only through environment variables or mounted secret files.

### Backend Image Strategy

Use one backend Docker image and different commands per service:

```text
map-api:
  command: uvicorn services.map_api.main:app --host 0.0.0.0 --port 8000

news-service:
  command: uvicorn services.news_service.main:app --host 0.0.0.0 --port 8001

data-ingestion:
  command: python -m services.data_ingestion run-all
```

This keeps dependency management simple while the services are small. Split into separate Dockerfiles only if dependencies become meaningfully different.

### Frontend Image Strategy

Local:

- run Vite dev server;
- mount `frontend/src`;
- call local backend URLs from `.env`.

Production:

- build static assets with Vite;
- serve them from Caddy or nginx;
- use relative API paths.

Production frontend container should not contain Node dev dependencies at runtime. Use a multi-stage Dockerfile:

```text
node build stage -> static web server stage
```

### Ingestion Scheduling In Docker

MVP options, from simplest to more controlled:

- host cron runs `docker compose -f docker-compose.prod.yml run --rm data-ingestion ...`;
- GitHub Actions SSHs into the server and triggers the ingestion command;
- `data-ingestion-scheduler` container runs APScheduler and triggers source runs;
- Prefect later if manual reruns, history, retries, and dashboards become important.

Recommended MVP:

```cron
15 */6 * * * cd /opt/orthohantavirus && docker compose -f docker-compose.prod.yml run --rm data-ingestion python -m services.data_ingestion run-all
```

The ingestion job should be safe to run repeatedly. Public `manifests/latest.json` must be updated only after all artifacts for the run are uploaded successfully.

### Server Directory Layout

Recommended VPS layout:

```text
/opt/orthohantavirus/
├── repo/
├── .env
├── data/
│   ├── minio/
│   ├── caddy/
│   └── backups/
└── logs/
```

If using managed S3, only Caddy data and logs need persistent local storage.

If using MinIO in production, back up the MinIO volume regularly. For public-health source data, losing raw artifacts would be painful because some source pages may change or disappear.

### Health Checks

Every service should expose:

```text
GET /health
```

Health response:

```json
{
  "status": "ok",
  "service": "map-api",
  "version": "git-sha-or-image-tag",
  "s3": "ok",
  "latest_manifest": "2026-05-12T18:00:00Z"
}
```

Compose health checks should use these endpoints so `docker compose ps` shows broken services clearly.

### Image Tags

For simple VPS deployment:

- build on the server from git for MVP;
- tag images with the git commit SHA once CI/CD is added.

Later CI path:

```text
push to main -> build images -> push registry -> SSH server -> docker compose pull && up -d
```

Use immutable tags for production deploys:

```text
ghcr.io/<org>/orthohantavirus-backend:<git-sha>
ghcr.io/<org>/orthohantavirus-frontend:<git-sha>
```

### Minimal Production Dependencies

Server needs:

- Docker;
- Docker Compose plugin;
- open ports `80` and `443`;
- optional open SSH only for deploy/admin;
- domain `A` record pointing to the server.

Everything else should live inside containers.

### Deployment Path

Phase 1:

- local Docker Compose with MinIO;
- server Docker Compose with Caddy and either MinIO or managed S3;
- manual deploy by `git pull && docker compose up -d --build`.

Phase 2:

- GitHub Container Registry images;
- deploy script under `infra/scripts/deploy.sh`;
- simple cron-based ingestion schedule;
- backup script for MinIO if MinIO is used in production.

Phase 3:

- CI/CD pipeline;
- managed S3;
- optional Postgres/PostGIS;
- optional CDN for frontend/static map artifacts;
- optional monitoring with OpenTelemetry metrics.

## MVP Scope

Phase 1:

- static source adapters for CDC, ECDC, WHO;
- S3 raw and public zones;
- map API serving precomputed GeoJSON/JSON;
- news service serving normalized WHO/ECDC/CDC updates;
- React map with left news panel;
- source attribution and freshness display.

Phase 2:

- PAHO and Rospotrebnadzor adapters;
- PDF parsing pipeline;
- region-level detail pages;
- timeline charts;
- admin/manual-review tooling.

Phase 3:

- ecological risk layers from host species and land-cover data;
- PostGIS or DuckDB indexing if S3 projections become too coarse;
- multilingual content;
- alert subscriptions.

## Open Decisions

- Final backend language: Python is practical for ingestion; API can be Python or TypeScript.
- Map engine: MapLibre GL for richer vector layers, Leaflet for faster MVP.
- Storage-only versus DB-backed API: start S3-first, add DB only for complex querying.
- News ingestion policy: official-only at first, then add secondary sources with lower confidence.
- Russian data handling: decide whether to parse regional Rospotrebnadzor pages automatically or keep them in manual-review mode first.
