# Orthohantavirus Map

Interactive map and official-source news feed for orthohantavirus / hantavirus data.

## Current Status

The project has a local MVP stack ready for review.

Implemented:

- Docker Compose local stack with MinIO and optional observability profile;
- FastAPI `map-api` and `news-service`;
- CDC, ECDC, and WHO ingestion adapters;
- public S3/MinIO artifact generation;
- MapLibre frontend with map layers, region details, source links, and news panel;
- Russian-default i18n with `/en/` English routes, language switcher, hreflang, and localized SEO metadata;
- article-style public pages for about, methodology, and data sources;
- Umami analytics integration;
- Loki/Grafana/Alloy log stack;
- production Compose/Caddy/runbook scripts;
- shared Pydantic contracts;
- backend and frontend verification commands.

See planning docs:

- `docs/planning/roadmap.md`
- `docs/planning/backlog.md`
- `docs/planning/status-log.md`
- `docs/planning/test-plan.md`
- `docs/operations/runbook.md`
- `docs/handbook/index.html`

## Local Start

```bash
cp .env.example .env
docker compose up --build
```

Local URLs:

```text
frontend:     http://localhost:5173
frontend EN:  http://localhost:5173/en/
map-api:      http://localhost:8000
news-service: http://localhost:8001
minio:        http://localhost:19000
minio-ui:     http://localhost:19001
```

Run ingestion:

```bash
docker compose run --rm data-ingestion python -m services.data_ingestion run-all
```

Optional observability stack:

```bash
docker compose --profile observability up -d
```

## Local Verification Without Docker

Backend:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e 'backend[dev]'
.venv/bin/python -m pytest backend/tests
.venv/bin/python -m ruff check backend
```

Frontend:

```bash
cd frontend
pnpm install
pnpm build
pnpm test
```

Locale checks:

```text
/                    Russian map interface
/en/                 English map interface
/methodology/        Russian article page
/en/methodology/     English article page
```

## Production

Production is Docker Compose based for MVP:

```bash
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml up -d --build
```

See `docs/operations/runbook.md` for deploy, ingestion scheduling, admin dashboards, and backup commands.
