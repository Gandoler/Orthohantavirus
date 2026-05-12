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
| OHV-008 | Implement CDC adapter proof of concept | ingestion | P0 | todo |
| OHV-009 | Implement WHO news/outbreak adapter proof of concept | ingestion | P0 | todo |
| OHV-003 | Confirm first official data source URLs and licenses | ingestion | P0 | todo |
| OHV-004 | Define canonical region code strategy | geo | P0 | todo |

## Acceptance Criteria

- [ ] `data-ingestion run --source cdc` stores raw and normalized artifacts.
- [ ] `data-ingestion run --source who` stores raw and normalized artifacts.
- [ ] `data-ingestion run-all` publishes `manifests/latest.json`.
- [ ] Public projections are written only after validation passes.
- [ ] Parser tests cover representative real source fragments.
- [ ] Validation warnings are visible in run manifests.

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
