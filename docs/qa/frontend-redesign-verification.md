# Frontend Redesign Verification

Дата: 2026-05-13

## Automated Checks

| Check | Result |
| --- | --- |
| `python3 -m compileall backend` | passed |
| `.venv/bin/python -m ruff check backend` | passed |
| `.venv/bin/python -m pytest backend/tests -q` | 22 passed, 5 PyMuPDF/SWIG deprecation warnings |
| `pnpm test` | 5 passed |
| `pnpm build` | passed |
| `pnpm test:e2e` | 12 passed across Chromium, Firefox, WebKit, and mobile Chromium |
| `docker compose config` | passed |
| `docker compose --profile observability config` | passed |
| `docker compose --env-file .env.prod.example -f docker-compose.prod.yml config` | passed |
| production Caddy validation | passed |
| frontend Caddy validation | passed |
| production Docker build for frontend, map-api, news-service | passed |

## Browser And Visual Checks

Screenshots:

- `docs/qa/screenshots/desktop-light.png`
- `docs/qa/screenshots/desktop-dark.png`
- `docs/qa/screenshots/mobile-light.png`
- `docs/qa/screenshots/mobile-dark.png`

Console:

- `docs/qa/screenshots/console-errors.json`
- result: no browser console errors during screenshot capture.

Browser interactions covered by Playwright:

- public monitor renders with live mocked APIs;
- dark mode toggles and persists through `data-theme`;
- Cases, Outbreaks, Heatmap, and News layer controls toggle;
- map area remains visible after wheel zoom and drag pan;
- admin console creates a manual news item;
- mobile Chromium renders the map-first layout.

## Lighthouse

Report:

- `docs/qa/lighthouse-home.json`

Scores on production preview `http://127.0.0.1:4173/`:

- Performance: 95
- Accessibility: 96
- Best Practices: 100
- SEO: 100

Performance note:

- MapLibre remains a separate lazy chunk and is started through `requestIdleCallback`, so the first contentful shell is not blocked by WebGL boot.

## SEO Checks

Verified locally against production preview:

- homepage source contains title, meta description, H1, and schema.org JSON-LD;
- `/robots.txt` allows indexing and points to sitemap;
- `/sitemap.xml` contains static pages;
- `/about/`, `/methodology/`, and `/data-sources/` return semantic HTML with H1/canonical.

Verified through backend smoke:

- `/news/who-2026-don600` returns indexable HTML with `NewsArticle` schema;
- `/countries/AT` returns indexable HTML with `Dataset` schema;
- `/outbreaks/who-2026-don600` returns indexable HTML with `SpecialAnnouncement` schema;
- dynamic `/sitemap.xml` includes countries, outbreaks, and news pages.

## Production Smoke

VPS deploy:

- repository synced to `/opt/orthohantavirus/repo`;
- `SKIP_GIT_PULL=1 SKIP_PUBLIC_SMOKE=1 ./infra/scripts/deploy.sh` completed;
- frontend, map-api, and news-service containers were rebuilt/recreated.
- reverse-proxy was restarted to pick up the updated Caddy routes and CSP.

Internal VPS checks:

- map-api `/health`: 200;
- map-api `/sitemap.xml`: 200;
- map-api `/countries/AT`: 200;
- map-api `/outbreaks/who-2026-don600`: 200;
- news-service `/health`: 200;
- news-service `/news/who-2026-don600`: 200;
- frontend container `/robots.txt`: 200.

Public HTTPS checks:

- `https://xn--80aagyweapgkddrtb.xn--p1ai/`: 200;
- public CSP includes MapLibre glyph origin;
- public `/api/map/health`: ok;
- public `/api/news/health`: ok;
- public `/sitemap.xml` includes countries, outbreaks, and news URLs;
- public `/news/who-2026-don600`: indexable HTML with `NewsArticle` schema;
- public `/countries/AT`: indexable HTML with `Dataset` schema;
- public `/outbreaks/who-2026-don600`: indexable HTML with `SpecialAnnouncement` schema;
- public `/robots.txt`: allows indexing.

Blocked:

- admin-domain HTTPS smoke is still blocked because `admin.xn--80aagyweapgkddrtb.xn--p1ai` does not resolve yet.
