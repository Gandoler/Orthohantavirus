# Stage 03: Map API And News API

## Goal

Serve frontend-ready map, statistics, metadata, and news data from public S3 artifacts.

## Exit Criteria

- map API serves health, metadata, map regions, outbreaks, summary, and timeline endpoints;
- news API serves feed, item detail, tags, and related-news endpoints;
- APIs use shared response contracts;
- APIs cache S3 artifacts safely;
- API tests cover happy paths and missing manifest cases.

## Deliverables

- map API routes;
- news API routes;
- S3 manifest reader;
- in-process artifact cache;
- API response models;
- error response model;
- OpenAPI docs available locally.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-030 | Implement map regions endpoint | backend | P0 | done |
| OHV-030 | Implement outbreaks endpoint | backend | P0 | done |
| OHV-030 | Implement news API feed endpoint | news | P0 | done |
| OHV-030 | Implement news item detail endpoint | news | P1 | done |
| TBD | Implement API cache refresh by manifest ETag or TTL | backend | P1 | deferred |

## Acceptance Criteria

- [x] `GET /health` works for both API services.
- [x] `GET /v1/metadata` returns latest manifest and source freshness.
- [x] `GET /v1/map/regions` returns GeoJSON or frontend-ready equivalent.
- [x] `GET /v1/map/outbreaks` returns active and historical outbreak events.
- [x] `GET /v1/news` returns normalized news feed items.
- [x] Missing S3 manifest returns managed fallback, not stack trace.
- [x] OpenAPI docs are available for local development.

## Current Status

Status: done

Implemented:

- map API: health, metadata, regions, outbreaks, summary, timeline, sources;
- news API: health, feed, tags, detail, `limit`/`tag`/`source` filters;
- shared S3 public artifact reader with safe fallbacks;
- endpoint tests for map/news services.

Verification:

- `.venv/bin/python -m pytest backend/tests`: 16 passed;
- `curl http://localhost:8000/v1/stats/summary`: returned non-empty public stats from MinIO;
- `curl 'http://localhost:8001/v1/news?limit=3'`: returned filtered WHO news feed.

## Risks

- Serving large GeoJSON directly may become slow.
- API contracts may shift if ingestion output changes.
- CORS can become noisy locally if frontend and APIs use separate hosts.

## Stage Gate

Do not start production deployment until health checks, managed errors, and basic cache behavior are stable.
