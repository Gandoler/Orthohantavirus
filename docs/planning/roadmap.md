# Project Roadmap

This roadmap breaks the project into practical implementation stages. Dates are intentionally omitted until the team has velocity data.

## Stage Overview

| Stage | Name | Goal | Status |
| --- | --- | --- | --- |
| 00 | Discovery | Validate sources, scope, and product assumptions | todo |
| 01 | Foundation | Create monorepo, Docker base, shared contracts, service skeletons | todo |
| 02 | Data Ingestion | Fetch, parse, normalize, and publish first datasets to S3/MinIO | todo |
| 03 | Map API And News API | Serve map/news data in frontend-ready formats | todo |
| 04 | Frontend MVP | Build the map-first UI with news panel and source attribution | todo |
| 05 | Admin Observability | Add visitor analytics, structured logs, dashboards, and health views | todo |
| 06 | Production Deploy | Deploy on VPS with Docker Compose, HTTPS, backups, and ingestion schedule | todo |
| 07 | Scale And Risk Layers | Add advanced sources, ecological risk layers, and optional DB/vector tiles | todo |

## MVP Definition

MVP is complete after stages 01-06 when:

- the app runs locally through Docker Compose;
- production can be deployed through Docker Compose on one VPS;
- CDC, ECDC, and WHO source adapters produce normalized data;
- map API serves region/outbreak/timeline data;
- news service serves official news items;
- frontend shows map, layers, region details, and news panel;
- Umami shows visitor counters to admins;
- Loki/Grafana show service logs to admins;
- source attribution and freshness are visible in the public UI.

## Post-MVP Direction

Post-MVP work should focus on:

- PAHO and Rospotrebnadzor data;
- PDF parsing quality;
- ecological risk layers from reservoir species and land cover;
- region pages and richer timelines;
- manual review tooling;
- CI/CD with image registry;
- optional PostGIS or vector tiles if public projections become too limited.

## Release Labels

Suggested labels for backlog migration to GitHub Issues:

```text
area:frontend
area:backend
area:ingestion
area:news
area:geo
area:infra
area:observability
area:analytics
area:docs
type:feature
type:bug
type:chore
type:research
type:decision
priority:P0
priority:P1
priority:P2
priority:P3
```
