# Frontend Redesign And Admin Plan

Date: 2026-05-13

## Product Owner View

Goal: make the site feel like a credible public-health monitoring tool, not a generated landing page.

Primary users:

- public visitors who need a quick map, official news, and source links;
- project admin who needs to publish manual editorial news without touching S3 or code;
- operator who needs to verify freshness and recover quickly after deploys.

Product decisions:

- the first screen is the actual monitoring workspace: news feed on the left, map on the right;
- no marketing hero, no decorative gradients, no AI-looking ornamental UI;
- public news feed merges official ingestion output with admin-created manual items;
- admin publishing is isolated under `/admin` and protected by edge basic auth plus backend token validation;
- browsers without WebGL get a compatibility map instead of a broken blank map.

Done definition:

- public map/news screen renders in Chromium, Firefox, WebKit, and mobile Chromium;
- admin can create and delete manual news;
- manual news survives ingestion because it is stored separately from generated official artifacts;
- repo has an operator-grade guide with checklists and exercises.

## Designer View

Visual direction:

- restrained public-health dashboard;
- neutral canvas, crisp borders, dense information hierarchy;
- red for reported cases, amber for outbreak reports, blue for source/navigation affordances, green only for success/live states;
- cards only for repeated news and admin rows;
- map remains the main working surface, not a decorative preview.

Layout:

- left rail: brand signal, data freshness, core metrics, source/search filters, news list;
- right workspace: compact toolbar, layer controls, full map surface, selected-region inspector, legend;
- admin: two-column editor and manual-feed review list.

Interaction details:

- layer controls use icon+text buttons;
- search and source filters are always visible;
- manual news publishing keeps a status line visible;
- compatibility map uses the same data and is keyboard-accessible for region selection.

## Engineering View

Backend:

- add `NEWS_ADMIN_API_TOKEN`;
- store manual news at `manual/news/items.json`;
- keep generated official feed at `public/news/latest/feed.json`;
- serve public feed as official + manual, sorted newest first;
- expose admin endpoints:
  - `GET /v1/admin/news`;
  - `POST /v1/admin/news`;
  - `DELETE /v1/admin/news/{news_id}`;
- require bearer token or reverse-proxy injected `X-Admin-Token`;
- update map summary news count to include manual news.

Frontend:

- route `/` to public monitoring workspace;
- route `/admin` to manual news console;
- keep local-dev token input for admin API;
- rely on Caddy-injected admin header in production admin domain;
- add MapLibre startup guard and compatibility map fallback.

Infra:

- pass `NEWS_ADMIN_API_TOKEN` to news-service and reverse-proxy;
- route admin-domain `/api/news/*` to news-service with injected `X-Admin-Token`;
- route admin-domain `/admin*` to frontend;
- keep public-domain admin API blocked by backend token validation.

QA:

- backend tests cover merged feed and admin CRUD;
- Playwright covers public workspace and admin create flow;
- Playwright projects cover Chromium, Firefox, WebKit, and mobile Chromium;
- Compose and Caddy configs must validate before deploy.
