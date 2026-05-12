# Stage 07: Scale And Risk Layers

## Goal

Expand beyond MVP by adding more sources, ecological risk layers, better querying, and stronger deployment automation.

## Exit Criteria

This stage is intentionally open-ended. Split it into smaller releases when MVP usage and data quality are clear.

## Candidate Deliverables

- PAHO adapter;
- Rospotrebnadzor adapter;
- PDF parsing pipeline;
- ecological risk layer model;
- reservoir-host species data;
- land-cover/climate enrichment;
- manual review interface;
- PostGIS or DuckDB-backed API indexing;
- vector tiles;
- CI/CD image registry deployment;
- stage/prod environments;
- managed S3 migration.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-019 | Research PAHO adapter feasibility | ingestion | P2 | todo |
| OHV-020 | Research Rospotrebnadzor regional parsing feasibility | ingestion | P2 | todo |
| OHV-021 | Research ecological risk layer data model | geo | P2 | todo |
| TBD | Add PDF table extraction pipeline | ingestion | P2 | todo |
| TBD | Add manual review queue | backend | P2 | todo |
| TBD | Evaluate PostGIS versus DuckDB for API queries | backend | P2 | todo |
| TBD | Evaluate vector tiles for heavy map layers | geo | P2 | todo |
| TBD | Add CI/CD through GHCR | infra | P2 | todo |

## Acceptance Criteria

Define acceptance criteria per sub-release. Do not treat this whole stage as one large project.

## Technical Direction

- Keep official reported cases separate from modeled risk.
- Add manual review before publishing uncertain parsed PDF data.
- Add PostGIS only when S3 public projections cannot support required queries.
- Add vector tiles only when GeoJSON performance is a measured problem.

## Risks

- Risk layers can be misread as confirmed infection data.
- Russian regional sources may be inconsistent and labor-intensive to parse.
- Additional data sources can reduce trust if confidence labels are not clear.

## Stage Gate

Each scale feature should have its own source-quality review before becoming public.
