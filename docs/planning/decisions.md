# Decisions

Use this file for architecture and product decisions that should not be rediscovered later.

## Decision Index

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| ADR-001 | Use Docker Compose for MVP production, keep Kubernetes-ready boundaries | accepted | 2026-05-12 |
| ADR-002 | Use S3/MinIO as durable source of truth for MVP | accepted | 2026-05-12 |
| ADR-003 | Use Umami for visitor analytics and Loki/Grafana/Alloy for logs | accepted | 2026-05-12 |
| ADR-004 | Use MapLibre GL JS as the frontend map engine | accepted | 2026-05-12 |
| ADR-005 | Use MinIO for first VPS deploy, keep managed S3 compatible | accepted | 2026-05-12 |
| ADR-006 | Use ISO region codes and explicit geo precision | accepted | 2026-05-12 |
| ADR-007 | Keep admin tools behind edge authentication | accepted | 2026-05-13 |
| ADR-008 | Keep ecological risk layers separate from reported cases | accepted | 2026-05-13 |

## ADR-001: Use Docker Compose For MVP Production

Status: accepted

Context:

The MVP has a small number of services and should be easy to deploy on one VPS.

Decision:

Use Docker Compose for MVP production, while keeping services stateless and Kubernetes-ready.

Consequences:

- Faster production setup.
- Lower operational overhead.
- Kubernetes migration remains possible later because service boundaries, health checks, and env-based config are preserved.

## ADR-002: Use S3/MinIO As Durable Source Of Truth For MVP

Status: accepted

Context:

The first data model is mostly append-only source artifacts, normalized JSONL, public projections, and manifests.

Decision:

Use S3-compatible object storage as the durable source of truth. Use MinIO locally and either MinIO or managed S3 in production.

Consequences:

- Ingestion can be batch-oriented.
- API can serve precomputed artifacts.
- Postgres/PostGIS can be deferred until dynamic query needs are real.

## ADR-003: Use Umami And Grafana Stack

Status: accepted

Context:

Admins need visitor counters and operational logs, but custom analytics would slow down MVP.

Decision:

Use Umami for visitor analytics. Use Grafana, Loki, and Alloy for logs.

Consequences:

- Admins get useful dashboards quickly.
- Sensitive product analytics and operational logs stay separate.
- More complex product analytics can be deferred.

## ADR-004: Use MapLibre GL JS As The Frontend Map Engine

Status: accepted

Context:

The product is map-first and is expected to grow from simple GeoJSON layers to richer choropleths, vector styles, and possibly vector tiles.

Decision:

Use MapLibre GL JS as the primary frontend map engine. Keep Leaflet as a fallback option only if WebGL requirements create unacceptable constraints.

Consequences:

- Better fit for styled vector layers and future tile-based scaling.
- Slightly higher frontend complexity than Leaflet.
- Browser smoke tests should verify that the map canvas renders correctly.

Review trigger:

Revisit if MVP data remains very small and MapLibre complexity slows development, or if target devices have WebGL limitations.

## ADR-005: Use MinIO For First VPS Deploy, Keep Managed S3 Compatible

Status: accepted

Context:

The project should be easy to run locally and easy to deploy on a single VPS. At the same time, raw source artifacts and normalized datasets should not depend on local container filesystems.

Decision:

Use the S3 API everywhere. Use MinIO locally and for the first VPS deploy. Keep the configuration compatible with managed S3 so production can switch later by changing environment variables.

Consequences:

- First server deploy remains self-contained.
- Backups are mandatory if MinIO is used in production.
- Moving to managed S3 later should not require application code changes.

Review trigger:

Revisit before public launch if data durability or backup operations become more important than single-server simplicity.

## ADR-006: Use ISO Region Codes And Explicit Geo Precision

Status: accepted

Context:

Sources publish data at different geographic levels. The app must avoid implying precise infection locations when only aggregated data exists.

Decision:

Use ISO 3166-1 alpha-2 for countries, ISO 3166-2 for admin1 regions where available, and explicit `geo_precision` values on every geographic record.

Consequences:

- Map joins have stable keys.
- Aggregate data can be shown without misleading precision.
- Source-specific region names still require mapping/validation.

Review trigger:

Revisit when adding admin2-level data or sources whose regions do not map cleanly to ISO subdivisions.

## ADR-007: Keep Admin Tools Behind Edge Authentication

Status: accepted

Context:

Umami and Grafana have their own login flows, but exposing admin dashboards directly increases blast radius if a tool is misconfigured or has weak credentials.

Decision:

Protect the production admin domain with Caddy basic auth before requests reach Umami or Grafana. Keep the public analytics script and event ingest route on the public domain without exposing the dashboard.

Consequences:

- Admin tools have an extra edge barrier.
- Production deploys must generate and store a bcrypt admin password hash.
- Public analytics collection remains possible without making the analytics dashboard public.

Review trigger:

Revisit if the project moves admin access behind VPN, Cloudflare Access, or a central SSO provider.

## ADR-008: Keep Ecological Risk Layers Separate From Reported Cases

Status: accepted

Context:

Reservoir-host occurrence and land-cover data can help explain ecological suitability, but they are not surveillance data and can be misread as confirmed infection locations.

Decision:

Publish ecological/modelled data only through separate risk-layer contracts and artifacts. Do not merge risk scores into official reported-case GeoJSON.

Consequences:

- The public UI can label modelled data clearly.
- Source confidence and model version stay explicit.
- Risk-layer work can proceed without weakening trust in official reported-case data.

Review trigger:

Revisit before publishing any modelled layer publicly or before adding alerting based on model outputs.
