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
| OHV-014 | Add Umami analytics container and frontend tracking | analytics | P1 | todo |
| OHV-015 | Add Loki/Grafana/Alloy logging profile | observability | P1 | todo |
| TBD | Add structured JSON logging helper | backend | P1 | todo |
| TBD | Add ingestion run log events | ingestion | P1 | todo |
| TBD | Protect admin analytics and Grafana routes | infra | P0 | todo |
| TBD | Add admin overview endpoint proposal | backend | P2 | todo |

## Acceptance Criteria

- [ ] Umami dashboard shows pageviews and visitor counts.
- [ ] Frontend tracks `region_select`, `news_open`, `map_layer_toggle`, and `source_link_open`.
- [ ] No sensitive medical or identifying data is sent to analytics.
- [ ] Grafana can query logs by service name.
- [ ] Ingestion failures are visible in logs.
- [ ] Admin dashboards are not publicly accessible without authentication.

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
