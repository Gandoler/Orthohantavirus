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

- confirmed source inventory;
- source feasibility notes for CDC, ECDC, WHO;
- first region-code strategy proposal;
- ADR updates for map engine and storage;
- refined MVP backlog for Stage 01.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-001 | Choose final map engine: MapLibre GL JS or Leaflet | frontend | P0 | todo |
| OHV-002 | Choose production storage: MinIO on VPS or managed S3 | infra | P0 | todo |
| OHV-003 | Confirm first official data source URLs and licenses | ingestion | P0 | todo |
| OHV-004 | Define canonical region code strategy | geo | P0 | todo |

## Acceptance Criteria

- [ ] Each first-source candidate has URL, format, expected update pattern, and parsing risk.
- [ ] The project has a written reason for MapLibre or Leaflet.
- [ ] Storage choice for first production deploy is documented.
- [ ] Region identifiers are defined at least for country and admin1 levels.
- [ ] Stage 01 tasks are marked `ready` in the backlog.

## Risks

- Some sources may not provide machine-readable data.
- Source licenses or terms may restrict automated reuse.
- Region-level data may be too coarse for the desired visual experience.

## Notes

Prefer official data sources first. Secondary sources can be added later with lower confidence and manual review.
