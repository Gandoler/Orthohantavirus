# Decisions

Use this file for architecture and product decisions that should not be rediscovered later.

## Decision Index

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| ADR-001 | Use Docker Compose for MVP production, keep Kubernetes-ready boundaries | proposed | TBD |
| ADR-002 | Use S3/MinIO as durable source of truth for MVP | proposed | TBD |
| ADR-003 | Use Umami for visitor analytics and Loki/Grafana/Alloy for logs | proposed | TBD |

## ADR-001: Use Docker Compose For MVP Production

Status: proposed

Context:

The MVP has a small number of services and should be easy to deploy on one VPS.

Decision:

Use Docker Compose for MVP production, while keeping services stateless and Kubernetes-ready.

Consequences:

- Faster production setup.
- Lower operational overhead.
- Kubernetes migration remains possible later because service boundaries, health checks, and env-based config are preserved.

## ADR-002: Use S3/MinIO As Durable Source Of Truth For MVP

Status: proposed

Context:

The first data model is mostly append-only source artifacts, normalized JSONL, public projections, and manifests.

Decision:

Use S3-compatible object storage as the durable source of truth. Use MinIO locally and either MinIO or managed S3 in production.

Consequences:

- Ingestion can be batch-oriented.
- API can serve precomputed artifacts.
- Postgres/PostGIS can be deferred until dynamic query needs are real.

## ADR-003: Use Umami And Grafana Stack

Status: proposed

Context:

Admins need visitor counters and operational logs, but custom analytics would slow down MVP.

Decision:

Use Umami for visitor analytics. Use Grafana, Loki, and Alloy for logs.

Consequences:

- Admins get useful dashboards quickly.
- Sensitive product analytics and operational logs stay separate.
- More complex product analytics can be deferred.
