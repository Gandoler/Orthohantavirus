# Stage 05: Admin Observability

## Goal

Give admins visibility into public usage, service health, ingestion runs, and logs without building custom analytics from scratch.

## Exit Criteria

- Umami tracks visitor counters and key product events.
- Grafana/Loki/Alloy collect and expose service logs.
- backend services emit structured JSON logs.
- admin routes are protected.
- health/freshness status is visible.

## Deliverables

- Umami containers and env variables;
- frontend analytics integration;
- event naming convention;
- Loki/Grafana/Alloy Compose profile;
- structured logging setup;
- admin route protection notes/config;
- operational dashboard draft.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-014 | Add Umami analytics container and frontend tracking | analytics | P1 | done |
| OHV-015 | Add Loki/Grafana/Alloy logging profile | observability | P1 | done |
| OHV-035 | Add structured JSON access logs for API services | backend | P1 | done |
| TBD | Add ingestion run log events | ingestion | P1 | done |
| OHV-034 | Harden production admin auth at reverse proxy layer | infra | P0 | done |
| TBD | Add Grafana Loki datasource and backend log dashboard | observability | P1 | done |
| TBD | Add admin overview endpoint proposal | backend | P2 | todo |

## Acceptance Criteria

- [x] Umami container starts and can serve the dashboard.
- [x] Frontend tracks `region_select`, `map_layer_toggle`, and `source_link_open`.
- [x] No sensitive medical or identifying data is sent to analytics.
- [x] Grafana/Loki/Alloy containers start and Alloy filters Docker logs to running containers in this Compose project.
- [x] Ingestion run result events are visible in logs.
- [x] Admin dashboards are not publicly accessible without authentication.

## Event Policy

Allowed:

- page path;
- coarse country/device/browser data as provided by analytics tool;
- region code;
- selected map layer;
- source id;
- news id.

Not allowed:

- precise geolocation;
- visitor identity;
- free-form medical text;
- raw search query;
- anything implying the visitor is infected or exposed.

## Risks

- Admin tools can accidentally become public.
- Analytics events can collect too much data if event properties are not reviewed.
- Logs can leak secrets if structured logging is not disciplined.

## Stage Gate

Do not expose admin tools on production domains until authentication and route protection are tested.

## Current Status

Status: done

Latest update:

- added `/admin` manual news console;
- added token-protected admin news API;
- configured admin-domain Caddy routing for `/admin` and `/api/news/*`;
- manual news is stored separately from official ingestion artifacts and merged into the public feed.

Implemented:

- local observability profile with Umami, Postgres, Loki, Grafana, Alloy;
- frontend analytics helper with optional Umami script injection;
- privacy-limited event payloads for region/source/layer interactions;
- Alloy Docker discovery filtered to running containers in the `orthohantavirus` Compose project;
- structured JSON access logs for API requests;
- Grafana Loki datasource and backend logs dashboard provisioning;
- production admin routes for `/admin`, `/api/news`, `/analytics`, and `/grafana` protected by Caddy basic auth plus backend token validation for admin news writes.

Verification:

- `docker compose --profile observability up -d`: started Umami, Umami DB, Loki, Grafana, Alloy;
- `curl http://localhost:3000/`: returned 200 for Umami;
- `curl http://localhost:3001/login`: returned 200 for Grafana;
- Alloy/Loki logs after project/running-container filtering showed no new warn/error entries in the last 10 seconds;
- `.venv/bin/python -m pytest backend/tests/test_service_endpoints.py -q`: 10 passed;
- local API log smoke produced a JSON `request_finished` record;
- Grafana container sees the provisioned Loki datasource and backend logs dashboard files.

Deferred:

- custom admin overview endpoint after real admin workflows are known.
