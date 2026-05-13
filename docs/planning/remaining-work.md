# Remaining Work Audit

Last updated: 2026-05-13

This audit separates local MVP work from external or post-MVP work. The goal is to keep the project moving without pretending that a real VPS deploy or uncertain source parsers can be completed inside the repository alone.

## Current State

Local MVP implementation is functionally present:

- Docker Compose stack for frontend, map API, news service, ingestion, MinIO, Umami, Loki, Grafana, and Alloy;
- CDC, ECDC, and WHO source adapters;
- S3/MinIO raw, normalized, public, and manifest artifact flow;
- public map/news APIs;
- React MapLibre frontend with news panel, source attribution, and analytics events;
- production Compose, Caddy reverse proxy, backup/restore scripts, and runbook.

## Closed In The 2026-05-13 Pass

| ID | Result |
| --- | --- |
| OHV-033 | Added Playwright browser smoke checks for desktop and mobile viewports. |
| OHV-034 | Added Caddy basic auth protection to the production admin domain. |
| OHV-035 | Added structured JSON access logs for API requests. |
| OHV-019 | Researched PAHO adapter feasibility and wrote the implementation plan. |
| OHV-020 | Researched Rospotrebnadzor parsing feasibility and wrote the implementation plan. |
| OHV-021 | Researched ecological risk-layer data sources and wrote the implementation plan. |

## Still External Or Blocked

| ID | Item | Why It Is Not Locally Finishable |
| --- | --- | --- |
| OHV-036 | Verify real VPS production deploy | Requires a target server, DNS, real domains, and production secrets. |

## Next Executable Plan

### Release 1: Production Launch Hardening

- run the documented deploy on a VPS;
- replace example admin password/hash, Grafana password, Umami secret, and S3 secrets;
- configure DNS for public and admin domains;
- run smoke checks from the public internet;
- verify Caddy HTTPS issuance and backup restore.

### Release 2: Additional Official Sources

- implement PAHO news/document adapter first;
- add a Rospotrebnadzor source registry and parser fixtures before any public publication;
- keep all uncertain Russian regional extracts as `manual_review_required`;
- publish source coverage and parser warnings in ingestion manifests.

### Release 3: Risk Layers

- add a separate `risk_layers` contract and public artifact path;
- prototype reservoir occurrence ingestion with GBIF;
- prototype land-cover enrichment with ESA WorldCover;
- keep ecological/modelled layers disabled by default until labels and disclaimers are clear.

### Release 4: CI/CD

- add GitHub Actions for backend tests, frontend tests, Playwright smoke, Docker Compose config validation, and image builds;
- publish immutable images to GHCR;
- update production deploy script to pull by image tag instead of building on the VPS.
