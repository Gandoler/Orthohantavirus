# Stage 02: Data Ingestion

## Goal

Implement the first official data adapters and publish normalized/public artifacts to S3-compatible storage.

## Exit Criteria

- CDC adapter produces at least one normalized case aggregate dataset.
- WHO adapter produces at least one normalized news/outbreak dataset.
- ECDC feasibility is proven or explicitly deferred.
- raw artifacts, normalized JSONL, public JSON/GeoJSON, and manifests are written.
- parser tests use fixture files.

## Deliverables

- source adapter interface;
- CDC source adapter;
- WHO source/news adapter;
- ECDC source adapter or feasibility report;
- ingestion CLI;
- run manifest format;
- parser fixtures and tests;
- public artifact writer.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-008 | Implement CDC adapter proof of concept | ingestion | P0 | done |
| OHV-009 | Implement WHO news/outbreak adapter proof of concept | ingestion | P0 | done |
| OHV-003 | Confirm first official data source URLs and licenses | ingestion | P0 | done |
| OHV-004 | Define canonical region code strategy | geo | P0 | done |
| OHV-023 | Implement source adapter interface and ingestion dry-run CLI | ingestion | P0 | done |
| OHV-028 | Research ECDC annual report parsing feasibility | ingestion | P0 | done |
| OHV-024 | Add PyMuPDF dependency and PDF text extractor helper | ingestion | P1 | done |
| OHV-025 | Implement ECDC annual report adapter | ingestion | P1 | done |
| OHV-026 | Add ECDC PDF table parser fixtures | ingestion | P1 | done |
| OHV-027 | Normalize ECDC 2023 country aggregates | ingestion | P1 | done |
| OHV-022 | Verify S3 writes through MinIO runtime | ingestion | P0 | done |

## Acceptance Criteria

- [x] `data-ingestion run --source cdc --dry-run` fetches and normalizes source data.
- [x] `data-ingestion run --source who --dry-run` fetches and normalizes source data.
- [x] `data-ingestion run --source ecdc --dry-run` fetches and normalizes source data.
- [x] `data-ingestion run-all --dry-run` fetches and normalizes implemented MVP sources.
- [x] `data-ingestion run --source cdc` stores raw and normalized artifacts.
- [x] `data-ingestion run --source who` stores raw and normalized artifacts.
- [x] `data-ingestion run-all` publishes `manifests/latest.json`.
- [x] Public projections are written only after validation passes.
- [x] Parser tests cover representative real source fragments.
- [x] Validation warnings are visible in run manifests/source run logs.

## Artifact Checklist

Expected keys:

```text
raw/<source>/yyyy/mm/dd/...
normalized/cases/snapshot_date=yyyy-mm-dd/part-000.jsonl
normalized/outbreaks/snapshot_date=yyyy-mm-dd/part-000.jsonl
normalized/news/snapshot_date=yyyy-mm-dd/part-000.jsonl
public/map/latest/regions.geojson
public/map/latest/outbreaks.geojson
public/news/latest/feed.json
manifests/latest.json
```

## Risks

- CDC and ECDC table shapes may change.
- WHO pages may be easier to use for news than structured case data.
- PDF parsing may become necessary earlier than planned.

## Stage Gate

Do not build complex frontend interactions until the public artifact shapes are stable enough for API contracts.

## Current Status

Status: done

Implemented:

- source adapter interface;
- CDC Hantavirus GIS widget JSON adapter;
- WHO Disease Outbreak News API adapter;
- ECDC annual report parsing feasibility report;
- ECDC annual report adapter with PyMuPDF text extraction;
- ingestion dry-run CLI;
- S3 raw/normalized write path;
- public projection writer;
- parser fixtures and tests.

Verification:

- `.venv/bin/python -m services.data_ingestion run --source cdc --dry-run`: produced 41 case aggregates;
- `.venv/bin/python -m services.data_ingestion run --source who --dry-run`: produced 11 relevant news items and 11 outbreak events;
- `.venv/bin/python -m services.data_ingestion run --source ecdc --dry-run`: produced 28 case aggregates with two non-reporting warnings;
- `.venv/bin/python -m services.data_ingestion run-all --dry-run`: produced CDC, ECDC, and WHO outputs;
- `docker compose run --rm data-ingestion python -m services.data_ingestion run-all`: wrote raw, normalized, public, and manifest artifacts to MinIO;
- `curl http://localhost:8000/v1/stats/summary`: returned 69 case records, 2775 reported cases, 309 deaths, 11 outbreak events, and 11 news items;
- `docker compose exec -T minio ... mc ls .../public/map/latest/`: showed `regions.geojson` and `outbreaks.geojson`;
- `.venv/bin/python -m pytest backend/tests`: 15 passed;
- `.venv/bin/python -m ruff check backend`: passed.

Blocked:

- none for local MVP ingestion.

Next:

- improve WHO filtering so non-hantavirus articles that only mention differential diagnoses are excluded;
- research PAHO and Rospotrebnadzor adapters.
