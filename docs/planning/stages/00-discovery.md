# Stage 00: Discovery

## Goal

Validate the product scope, first data sources, licensing constraints, and technical choices before implementation starts.

## Exit Criteria

- first source list is confirmed;
- map engine decision is made;
- production storage decision is made;
- source data licensing/usage notes are documented;
- MVP scope is stable enough to scaffold code.

## Deliverables

- confirmed source inventory: `docs/planning/source-inventory.md`;
- source feasibility notes for CDC, ECDC, WHO: `docs/planning/source-inventory.md`;
- first region-code strategy proposal: `docs/planning/region-codes.md`;
- ADR updates for map engine and storage: `docs/planning/decisions.md`;
- refined MVP backlog for Stage 01: `docs/planning/backlog.md`.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-001 | Choose final map engine: MapLibre GL JS or Leaflet | frontend | P0 | done |
| OHV-002 | Choose production storage: MinIO on VPS or managed S3 | infra | P0 | done |
| OHV-003 | Confirm first official data source URLs and licenses | ingestion | P0 | done |
| OHV-004 | Define canonical region code strategy | geo | P0 | done |

## Acceptance Criteria

- [x] Each first-source candidate has URL, format, expected update pattern, and parsing risk.
- [x] The project has a written reason for MapLibre or Leaflet.
- [x] Storage choice for first production deploy is documented.
- [x] Region identifiers are defined at least for country and admin1 levels.
- [x] Stage 01 tasks are marked `ready` in the backlog.

## Risks

- Some sources may not provide machine-readable data.
- Source licenses or terms may restrict automated reuse.
- Region-level data may be too coarse for the desired visual experience.

## Notes

Prefer official data sources first. Secondary sources can be added later with lower confidence and manual review.

## Result

Completed on 2026-05-12.

Key decisions:

- Map engine: MapLibre GL JS.
- First production object storage: MinIO on VPS through the S3 API, with managed S3 kept as an env-only migration path.
- Region codes: ISO 3166-1 alpha-2 for countries, ISO 3166-2 for admin1 where available, explicit `geo_precision` on every geographic record.
- First source order: WHO DON API, CDC reported cases, ECDC annual/surveillance data.
