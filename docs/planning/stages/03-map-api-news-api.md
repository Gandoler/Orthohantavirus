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
| OHV-010 | Implement map API health and metadata endpoints | backend | P0 | todo |
| OHV-011 | Implement news API feed endpoint | news | P0 | todo |
| TBD | Implement map regions endpoint | backend | P0 | todo |
| TBD | Implement outbreaks endpoint | backend | P0 | todo |
| TBD | Implement news item detail endpoint | news | P1 | todo |
| TBD | Implement API cache refresh by manifest ETag or TTL | backend | P1 | todo |

## Acceptance Criteria

- [ ] `GET /health` works for both API services.
- [ ] `GET /v1/metadata` returns latest manifest and source freshness.
- [ ] `GET /v1/map/regions` returns GeoJSON or frontend-ready equivalent.
- [ ] `GET /v1/map/outbreaks` returns active and historical outbreak events.
- [ ] `GET /v1/news` returns normalized news feed items.
- [ ] Missing S3 manifest returns managed error, not stack trace.
- [ ] OpenAPI docs are available for local development.

## Risks

- Serving large GeoJSON directly may become slow.
- API contracts may shift if ingestion output changes.
- CORS can become noisy locally if frontend and APIs use separate hosts.

## Stage Gate

Do not start production deployment until health checks, managed errors, and basic cache behavior are stable.
