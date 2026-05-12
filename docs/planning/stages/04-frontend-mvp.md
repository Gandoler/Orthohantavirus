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
| OHV-012 | Build first map screen with left news panel | frontend | P0 | todo |
| OHV-013 | Add source attribution and freshness indicators | frontend | P0 | todo |
| OHV-001 | Choose final map engine: MapLibre GL JS or Leaflet | frontend | P0 | todo |
| TBD | Implement API client with TanStack Query | frontend | P0 | todo |
| TBD | Implement map layer toggles | frontend | P1 | todo |
| TBD | Implement region detail panel | frontend | P1 | todo |
| TBD | Implement mobile bottom sheet behavior | frontend | P1 | todo |

## Acceptance Criteria

- [ ] First viewport is the working app, not a landing page.
- [ ] The map renders region/case or outbreak data.
- [ ] News panel is visible on desktop and accessible on mobile.
- [ ] User can toggle at least reported cases and outbreaks layers.
- [ ] Each visible data item has source and freshness information.
- [ ] Modeled risk is visually and textually separated from reported cases if present.
- [ ] Frontend has at least smoke tests for API loading and main screen rendering.

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
