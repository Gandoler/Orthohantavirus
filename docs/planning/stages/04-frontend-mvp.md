# Stage 04: Frontend MVP

## Goal

Build the first usable public experience: an interactive map with a left news panel, region details, layer controls, and source attribution.

## Exit Criteria

- frontend starts locally through Docker Compose;
- map renders public data from the API;
- news panel renders official news feed;
- region/outbreak selection works;
- source attribution and freshness are visible;
- mobile layout has usable map and collapsible details/news panels.

## Deliverables

- app shell;
- map component;
- layer controls;
- news panel;
- region details;
- outbreak popup/detail view;
- API client;
- loading, empty, and error states;
- responsive layout.

## Backlog

| ID | Task | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-012 | Build first map screen with left news panel | frontend | P0 | done |
| OHV-013 | Add source attribution and freshness indicators | frontend | P0 | done |
| OHV-001 | Choose final map engine: MapLibre GL JS or Leaflet | frontend | P0 | done |
| TBD | Implement API client with TanStack Query | frontend | P2 | deferred |
| TBD | Implement map layer toggles | frontend | P1 | done |
| TBD | Implement region detail panel | frontend | P1 | done |
| TBD | Implement mobile bottom sheet behavior | frontend | P1 | deferred |

## Acceptance Criteria

- [x] First viewport is the working app, not a landing page.
- [x] The map renders region/case or outbreak data.
- [x] News panel is visible on desktop and accessible on mobile.
- [x] User can toggle at least reported cases and outbreaks layers.
- [x] Each visible data item has source and freshness information.
- [x] Modeled risk is visually and textually separated from reported cases if present.
- [ ] Frontend has browser-level smoke tests for API loading and main screen rendering.

## Current Status

Status: review

Implemented:

- MapLibre map workspace with OSM raster base map;
- reported-case layer and outbreak-report layer toggles;
- summary metrics, news panel, selected-region panel;
- source links, source labels, freshness, live/fallback data state;
- optional Umami analytics events for source links, layer toggles, and region selection;
- responsive layout CSS.

Verification:

- `pnpm test`: 5 passed;
- `pnpm build`: passed;
- `docker compose up --build -d frontend`: frontend container started;
- `curl -I http://localhost:5173/`: returned `HTTP/1.1 200 OK`.

Remaining:

- add Playwright/browser visual smoke checks for desktop/mobile;
- improve mobile details into a true bottom-sheet interaction.

## UX Rules

- Use map as the primary surface.
- Keep news dense and scannable.
- Avoid medical claims without source links.
- Avoid implying exact infection locations when only aggregated data exists.

## Risks

- Large GeoJSON may hurt browser performance.
- News panel can crowd the map on smaller screens.
- Color choices can accidentally imply urgency or certainty.

## Stage Gate

Do not add advanced charts or editorial pages until the core map/news workflow is useful.
