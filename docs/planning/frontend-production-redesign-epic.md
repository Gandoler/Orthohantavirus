# Production Frontend Redesign Epic

Дата старта: 2026-05-13  
Статус: done, admin-domain HTTPS verification blocked by DNS

## Цель

Перевести фронт Orthohantavirus Monitor из сырого admin-dashboard вида в серьезный
production-ready мониторинг эпидемиологии: карта как основной рабочий инструмент,
компактная лента новостей, доверительная медицинская визуальная система, темная тема,
проверенная производительность карты и индексируемый SEO-контур.

## Роли И Ответственность

### Product Owner

Отвечает за смысл продукта и приоритеты.

- Главная ценность: пользователь за 5-10 секунд понимает, где есть случаи, где есть
  вспышки, какие обновления подтверждены источниками.
- Основная аудитория: исследователи, журналисты, эпидемиологи, администратор проекта.
- Обязательные сценарии:
  - открыть монитор и увидеть карту, статистику, свежесть данных;
  - отфильтровать новости по источнику и поиску;
  - переключить слои Cases, Outbreaks, Heatmap, News;
  - открыть индексируемую страницу новости, страны или вспышки;
  - администратор публикует ручную новость без прямого доступа к S3.
- Критерий качества: интерфейс выглядит как серьезный мониторинг данных, а не как
  шаблонный SPA.

### Product Designer

Отвечает за визуальный язык, адаптивность и восприятие доверия.

- Визуальный язык: medical / epidemiology, restrained, data-first.
- Палитра:
  - deep green для бренда и доверия;
  - slate / ink для структуры и текста;
  - cyan / blue для карты и нейтральных геослоев;
  - red только для confirmed cases;
  - amber/orange для outbreak signals.
- Layout:
  - desktop: компактный sidebar слева, карта справа;
  - tablet: sidebar можно схлопнуть;
  - mobile: карта сверху, summary и новости ниже.
- Состояния:
  - loading skeleton для метрик и новостей;
  - loading overlay на карте;
  - API error fallback;
  - empty state для фильтров и отсутствия геокодированных точек.
- Дизайн-запреты:
  - не делать marketing hero вместо рабочего интерфейса;
  - не перегружать карточками;
  - не использовать декоративные gradient blobs;
  - не делать one-note palette.

### Frontend Engineer

Отвечает за React-архитектуру, состояние, доступность и тесты.

- Разделить public monitor и admin route без лишнего роутинга на MVP.
- Сохранять карту вне React render path: карта создается один раз, данные обновляются
  через GeoJSON sources.
- Держать фильтры и слои простыми, предсказуемыми и тестируемыми.
- Добавить ARIA-labels для sidebar, map workspace, selected region, news feed.
- Не ломать admin console и ручное создание новостей.
- Поддержать browser compatibility fallback, если WebGL недоступен.

### Performance Engineer

Отвечает за скорость и карту.

- MapLibre загружается lazy dynamic import отдельным chunk.
- Точки случаев идут через GeoJSON source с clustering.
- Heatmap работает как слой MapLibre, а не как набор DOM-маркеров.
- MapLibre instance не пересоздается при фильтрах и переключении слоев.
- Переключение слоев меняет `visibility`, а не пересобирает карту.
- Тяжелые преобразования вынесены в отдельные функции за пределами JSX.
- Browser smoke проверяет zoom, wheel, pan и сохранение canvas/fallback map.

### SEO Engineer

Отвечает за индексируемость.

- Главная страница должна иметь meaningful HTML в source, а не пустой `div`.
- Добавить title, description, canonical, Open Graph, Twitter Card, schema.org.
- Добавить robots.txt и sitemap.xml.
- Статические страницы:
  - `/about/`;
  - `/methodology/`;
  - `/data-sources/`.
- Динамические HTML-страницы:
  - `/news/{id}` через news-service;
  - `/countries/{region_code}` через map-api;
  - `/outbreaks/{id}` через map-api.
- Production Caddy должен проксировать indexable routes на backend, а не отдавать
  SPA fallback для всех URL.
- На каждой странице должны быть H1, дата/источник, canonical и internal links.

### QA Engineer

Отвечает за доказательство результата.

- Unit/API tests:
  - backend endpoints;
  - frontend unit tests;
  - production build.
- Browser tests:
  - desktop public monitor;
  - mobile public monitor;
  - admin news create;
  - dark mode;
  - layer toggles;
  - map zoom/pan.
- Visual evidence:
  - desktop light screenshot;
  - desktop dark screenshot;
  - mobile light screenshot;
  - mobile dark screenshot.
- SEO evidence:
  - `curl` source contains H1 and meta;
  - robots.txt available;
  - sitemap.xml available;
  - dynamic HTML routes return 200.
- Lighthouse:
  - Performance;
  - Accessibility;
  - Best Practices;
  - SEO.

## Implementation Plan

### Phase 1: Product Shell And Visual System

Status: done

- Replace raw dashboard layout with a production monitor shell.
- Compact left panel with:
  - title and data status;
  - trust/freshness strip;
  - metrics cards;
  - search;
  - source filter;
  - verified news cards.
- Map workspace with:
  - layer toolbar;
  - refresh action;
  - selected region panel;
  - legend;
  - loading/error/empty overlays.
- Add CSS variables for light/dark themes.
- Add responsive breakpoints for desktop/tablet/mobile.

Acceptance:

- No horizontal overflow on mobile.
- H1 and primary controls remain readable.
- Dark mode persists in browser storage.
- All major monitor states look finished.

### Phase 2: Map Performance

Status: done

- Lazy-load MapLibre.
- Use GeoJSON source for regions, outbreaks, and news-linked regions.
- Enable cluster source for cases.
- Add heatmap layer.
- Update source data with `setData`.
- Update layer visibility with `setLayoutProperty`.
- Keep MapLibre instance in `useRef`.
- Add WebGL compatibility fallback map.

Acceptance:

- Filter and layer changes do not recreate the map container.
- Browser smoke can zoom, pan, toggle layers, and still see map canvas/fallback.
- Build output keeps MapLibre in a separate chunk.

### Phase 3: SEO And Indexable Pages

Status: done

- Add semantic fallback HTML to Vite `index.html`.
- Add root meta tags, canonical, OG, Twitter Card, schema.org.
- Add static `/about/`, `/methodology/`, `/data-sources/`.
- Add backend HTML route for `/news/{id}`.
- Add backend HTML route for `/countries/{region_code}`.
- Add backend HTML route for `/outbreaks/{id}`.
- Add dynamic `/sitemap.xml`.
- Add `robots.txt`.
- Update Caddy to route indexable pages to the right service.

Acceptance:

- `curl /` contains H1 and meta description.
- `/news/{id}`, `/countries/{region_code}`, `/outbreaks/{id}` return real HTML.
- `robots.txt` allows indexing.
- `sitemap.xml` includes static and live data pages.

### Phase 4: Admin News Console

Status: done from previous epic, regression guarded here

- Preserve `/admin`.
- Preserve token-based local admin flow.
- Preserve Caddy admin-domain token injection.
- Keep create/delete tests green.

Acceptance:

- Admin can create manual news.
- Public news feed includes manual and official news.
- Public domain cannot call admin endpoints without token.

### Phase 5: Test And Visual Verification

Status: done

- Run backend compile, ruff, pytest.
- Run frontend unit tests.
- Run frontend production build.
- Run Playwright in Chromium, Firefox, WebKit, and mobile Chromium.
- Start local browser session and capture required screenshots.
- Run Lighthouse for homepage.
- Validate `robots.txt`, `sitemap.xml`, and source HTML with curl.
- Validate Docker Compose and Caddy configs.

Acceptance:

- All automated tests pass or remaining failures are documented with a direct cause.
- Screenshots are saved under `docs/qa/screenshots/`.
- Lighthouse result is saved under `docs/qa/`.
- Status log records exact checks.

### Phase 6: Production Rollout

Status: done, admin-domain HTTPS smoke blocked by DNS

- Rebuild production frontend/map-api/news-service images.
- Deploy to VPS through existing deploy script.
- Run internal API and HTML route smoke checks.
- Public HTTPS smoke remains blocked until DNS points to VPS.

Acceptance:

- Production containers are up.
- Internal `/health`, `/sitemap.xml`, `/news/{id}`, `/countries/{code}` smoke checks pass.
- DNS blocker stays explicit until A records are fixed.

## Backlog Items

| ID | Title | Priority | Owner | Status |
| --- | --- | --- | --- | --- |
| OHV-051 | Production-grade public monitor redesign | P0 | Frontend Engineer | done |
| OHV-052 | MapLibre clustering, heatmap, and fallback performance pass | P0 | Performance Engineer | done |
| OHV-053 | Indexable SEO pages and dynamic sitemap | P0 | SEO Engineer | done |
| OHV-054 | Browser screenshot and Lighthouse evidence pack | P0 | QA Engineer | done |
| OHV-055 | Production redeploy and internal SEO smoke | P1 | DevOps Engineer | done |

## Definition Of Done

- Product shell is visually credible on desktop and mobile.
- Light and dark themes are complete.
- Map layers are performant and resilient.
- News cards and admin publishing still work.
- SEO basics and indexable dynamic pages exist.
- Tests, screenshots, Lighthouse, and deploy smoke are recorded.
