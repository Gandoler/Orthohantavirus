import "maplibre-gl/dist/maplibre-gl.css";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Compass,
  Database,
  ExternalLink,
  Flame,
  Layers,
  ListFilter,
  Loader2,
  Lock,
  Moon,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sun,
  ThermometerSun,
  Trash2,
  X,
} from "lucide-react";
import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  StyleSpecification,
} from "maplibre-gl";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { installAnalytics, trackEvent } from "./analytics";
import type { AppData, ManualNewsPayload, NewsItem, RegionFeature } from "./api";
import { createManualNews, deleteManualNews, loadAppData, loadManualNews } from "./api";
import { formatDate, formatNumber, formatPeriod, sortedNews } from "./format";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { type AppLocale, normalizeLocale, stripLocalePrefix } from "./i18n";
import { updateDocumentHead } from "./head";
import { localizedSampleData } from "./sampleData";
import "./styles.css";

const ADMIN_TOKEN_STORAGE_KEY = "orthohantavirus-admin-token";
const THEME_STORAGE_KEY = "orthohantavirus-theme";

type DataState = "loading" | "live" | "fallback" | "error";
type Theme = "light" | "dark";
type LayerState = {
  cases: boolean;
  outbreaks: boolean;
  heatmap: boolean;
  news: boolean;
};

type MapLibreModule = typeof import("maplibre-gl");

export function App() {
  const { t, i18n } = useTranslation(["common", "seo"]);
  const locale = normalizeLocale(i18n.language);
  const isAdminRoute = stripLocalePrefix(window.location.pathname).startsWith("/admin");
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());

  useEffect(() => {
    installAnalytics();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    updateDocumentHead({
      locale,
      title: isAdminRoute ? t("seo:admin.title") : t("seo:home.title"),
      description: isAdminRoute ? t("seo:admin.description") : t("seo:home.description"),
      robots: isAdminRoute ? "noindex,nofollow" : "index,follow,max-image-preview:large",
    });
  }, [isAdminRoute, locale, t]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return isAdminRoute ? (
    <AdminApp theme={theme} onToggleTheme={toggleTheme} />
  ) : (
    <PublicMapApp theme={theme} onToggleTheme={toggleTheme} />
  );
}

function PublicMapApp({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { t, i18n } = useTranslation(["common", "map", "news"]);
  const locale = normalizeLocale(i18n.language);
  const localeRef = useRef<AppLocale>(locale);
  const [data, setData] = useState<AppData>(() => localizedSampleData(locale));
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature | null>(
    localizedSampleData(locale).regions.features[0] ?? null,
  );
  const [dataState, setDataState] = useState<DataState>("loading");
  const [errorText, setErrorText] = useState("");
  const [visibleLayers, setVisibleLayers] = useState<LayerState>({
    cases: true,
    outbreaks: true,
    heatmap: true,
    news: true,
  });
  const [sourceFilter, setSourceFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const [regionPanelOpen, setRegionPanelOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(min-width: 960px)").matches ?? true;
  });

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    if (dataState === "live" || dataState === "loading") return;
    const fallbackData = localizedSampleData(locale);
    setData(fallbackData);
    setSelectedRegion(fallbackData.regions.features[0] ?? null);
  }, [dataState, locale]);

  const refreshData = useCallback(() => {
    setDataState("loading");
    setErrorText("");
    loadAppData(localeRef.current)
      .then((loaded) => {
        const hasData = loaded.regions.features.length > 0 || loaded.news.length > 0;
        const nextData = hasData ? loaded : localizedSampleData(localeRef.current);
        setData(nextData);
        setSelectedRegion(nextData.regions.features[0] ?? null);
        setDataState(hasData ? "live" : "fallback");
      })
      .catch((error: Error) => {
        const fallbackData = localizedSampleData(localeRef.current);
        setData(fallbackData);
        setSelectedRegion(fallbackData.regions.features[0] ?? null);
        setErrorText(error.message);
        setDataState("error");
      });
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(data.news.map((item) => item.source))).sort(),
    [data.news],
  );
  const filteredNews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedNews(data.news).filter((item) => {
      const matchesSource = sourceFilter === "all" || item.source === sourceFilter;
      const haystack = `${item.title} ${item.summary ?? ""} ${item.tags.join(" ")}`.toLowerCase();
      return matchesSource && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [data.news, query, sourceFilter]);

  const latestDate = data.summary.generated_at ?? data.regions.generated_at;
  const hasRenderableMapData = data.regions.features.some((item) => item.geometry) ||
    data.outbreaks.features.some((item) => item.geometry);
  const sourceLine = formatSources(data.summary.sources);
  const casePeriod = summarizeCasePeriod(data, locale, t("map:metrics.periodUnknown"));
  const latestDateText = formatDate(latestDate, locale, t("status.unknown"));

  const handleSelectRegion = useCallback((region: RegionFeature) => {
    setSelectedRegion(region);
    setRegionPanelOpen(true);
    trackEvent("region_select", {
      region_code: region.properties.region_code,
      source: region.properties.sources.join(","),
    });
  }, []);

  const shellClasses = [
    "monitor-shell",
    sidebarOpen ? "" : "monitor-shell--sidebar-closed",
    feedSheetOpen ? "monitor-shell--sheet-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClasses}>
      <aside className="monitor-sidebar" aria-label={t("map:aria.newsFeed")}>
        <div className="sidebar-handle" aria-hidden="true" />
        <button
          className="sidebar-sheet-toggle"
          type="button"
          onClick={() => setFeedSheetOpen((current) => !current)}
          aria-expanded={feedSheetOpen}
        >
          <span className="sheet-toggle__inner">
            <Newspaper size={16} aria-hidden="true" />
            <span>{feedSheetOpen ? t("actions.hideFeed") : t("actions.showFeed")}</span>
            <span className="sheet-toggle__count">{formatNumber(filteredNews.length, locale)}</span>
          </span>
          {feedSheetOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        </button>

        <div className="sidebar-scroll">
          <section className="trust-strip" aria-label={t("map:aria.dataTrust")}>
            <span>
              <OfficialSourceMark />
              {t("status.officialSourceFirst")}
            </span>
            <span>
              <Database size={14} aria-hidden="true" />
              {t("status.updated", { date: latestDateText })}
            </span>
          </section>

          {dataState === "loading" ? (
            <MetricSkeleton label={t("map:metrics.loadingPeriod")} />
          ) : (
            <section className="summary-grid" aria-label={t("map:aria.summary")}>
              <Metric
                label={t("map:metrics.reportedCases")}
                value={formatNumber(data.summary.reported_cases_total, locale)}
                tone="red"
                period={t("map:metrics.periodLine", { period: casePeriod })}
                source={t("map:metrics.sourceLine", { sources: sourceLine })}
                trendLabel={t("map:metrics.seriesSoon")}
              />
              <Metric
                label={t("map:metrics.deaths")}
                value={formatNumber(data.summary.reported_deaths_total, locale)}
                tone="ink"
                period={t("map:metrics.periodLine", { period: casePeriod })}
                source={t("map:metrics.sourceLine", { sources: sourceLine })}
                trendLabel={t("map:metrics.seriesSoon")}
              />
              <Metric
                label={t("map:metrics.outbreakReports")}
                value={formatNumber(data.summary.outbreak_events, locale)}
                tone="amber"
                period={t("map:metrics.periodLine", { period: formatDate(latestDate, locale, t("status.unknown")) })}
                source={t("map:metrics.sourceLine", { sources: sourceLine })}
                trendLabel={t("map:metrics.seriesSoon")}
              />
              <Metric
                label={t("map:metrics.verifiedUpdates")}
                value={formatNumber(data.summary.news_items, locale)}
                tone="blue"
                period={t("map:metrics.periodLine", { period: formatDate(latestDate, locale, t("status.unknown")) })}
                source={t("map:metrics.sourceLine", { sources: sourceLine })}
                trendLabel={t("map:metrics.seriesSoon")}
              />
            </section>
          )}

          <section className="feed-controls" aria-label={t("map:aria.feedFilters")}>
            <label className="search-control">
              <Search size={15} aria-hidden="true" />
              <input
                aria-label={t("map:search.aria")}
                placeholder={t("map:search.placeholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-control">
              <ListFilter size={15} aria-hidden="true" />
              <select
                aria-label={t("map:search.filterAria")}
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="all">{t("map:search.allSources")}</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="news-list" aria-label={t("map:aria.officialNews")}>
            <div className="section-title">
              <h2>{t("news:verifiedUpdates")}</h2>
              <span>{formatNumber(filteredNews.length, locale)}</span>
            </div>
            {dataState === "loading" ? (
              <NewsSkeleton />
            ) : (
              filteredNews.map((item, index) => <NewsCard item={item} key={item.id} locale={locale} ordinal={index + 1} />)
            )}
            {dataState !== "loading" && filteredNews.length === 0 ? (
              <p className="empty-state">{t("news:empty")}</p>
            ) : null}
          </section>
          <SiteFooter locale={locale} generatedAt={latestDate} />
        </div>
      </aside>

      <div className="map-stage">
        <HantaMap
          data={data}
          dataState={dataState}
          visibleLayers={visibleLayers}
          onSelectRegion={handleSelectRegion}
          theme={theme}
          locale={locale}
        />

        <header className="map-topbar" aria-label={t("map:aria.appHeader")}>
          <div className="map-topbar__brand">
            <BrandMark />
            <div>
              <p className="eyebrow">{t("brand.eyebrow")}</p>
              <strong>
                <span className="desktop-only">{t("brand.tagline")}</span>
                <span className="mobile-only">{t("brand.mobileTitle")}</span>
              </strong>
            </div>
          </div>
          <div className="map-topbar__actions">
            <DataStatus state={dataState} />
            <LanguageSwitcher />
            <button
              className="icon-button icon-button--ghost desktop-only"
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              title={sidebarOpen ? t("actions.hideFeed") : t("actions.showFeed")}
            >
              <Layers size={16} aria-hidden="true" />
              <span>{sidebarOpen ? t("actions.hideFeed") : t("actions.showFeed")}</span>
            </button>
            <button
              className="icon-button icon-button--ghost"
              type="button"
              onClick={refreshData}
              title={t("actions.refreshData")}
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span className="desktop-only">{t("actions.refresh")}</span>
            </button>
            <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
          </div>
        </header>

        <div className="map-controls" aria-label={t("map:aria.mapLayers")}>
          <LayerButton
            active={visibleLayers.cases}
            icon={<ThermometerSun size={14} strokeWidth={1.5} aria-hidden="true" />}
            label={t("map:layers.cases")}
            onClick={() => toggleLayer("cases", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.outbreaks}
            icon={<Flame size={14} strokeWidth={1.5} aria-hidden="true" />}
            label={t("map:layers.outbreaks")}
            onClick={() => toggleLayer("outbreaks", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.heatmap}
            icon={<Activity size={14} strokeWidth={1.5} aria-hidden="true" />}
            label={t("map:layers.heatmap")}
            onClick={() => toggleLayer("heatmap", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.news}
            icon={<Newspaper size={14} strokeWidth={1.5} aria-hidden="true" />}
            label={t("map:layers.news")}
            onClick={() => toggleLayer("news", setVisibleLayers)}
          />
        </div>

        <MapStatusOverlay state={dataState} errorText={errorText} hasRenderableData={hasRenderableMapData} />
        <MapLegend visibleLayers={visibleLayers} />
        <RegionPanel
          region={selectedRegion}
          generatedAt={latestDate}
          locale={locale}
          open={regionPanelOpen}
          onClose={() => setRegionPanelOpen(false)}
          onOpen={() => setRegionPanelOpen(true)}
        />
      </div>
    </main>
  );
}

function AdminApp({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const locale = normalizeLocale(i18n.language);
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [statusText, setStatusText] = useState(t("admin:notLoaded"));
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    sourceUrl: "",
    publishedAt: "",
    tags: "manual, editorial",
    regions: "",
    language: "ru",
  });

  const loadItems = useCallback(() => {
    setStatusText(t("admin:loading"));
    loadManualNews(token)
      .then((loaded) => {
        setItems(sortedNews(loaded));
        setStatusText(t("admin:loaded", { count: loaded.length }));
      })
      .catch((error: Error) => {
        setStatusText(t("admin:cannotLoad", { message: error.message }));
      });
  }, [t, token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function saveToken() {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token.trim());
    setStatusText(t("admin:tokenSaved"));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const payload: ManualNewsPayload = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      source_url: form.sourceUrl.trim(),
      published_at: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      tags: splitList(form.tags),
      related_region_codes: splitList(form.regions).map((item) => item.toUpperCase()),
      language: form.language.trim() || "ru",
    };

    createManualNews(payload, token)
      .then((created) => {
        setItems((current) => sortedNews([created, ...current]));
        setStatusText(t("admin:published", { title: created.title }));
        setForm((current) => ({ ...current, title: "", summary: "", sourceUrl: "", publishedAt: "" }));
      })
      .catch((error: Error) => setStatusText(t("admin:cannotPublish", { message: error.message })))
      .finally(() => setIsSaving(false));
  }

  function handleDelete(newsId: string) {
    deleteManualNews(newsId, token)
      .then(() => {
        setItems((current) => current.filter((item) => item.id !== newsId));
        setStatusText(t("admin:deleted"));
      })
      .catch((error: Error) => setStatusText(t("admin:cannotDelete", { message: error.message })));
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">{t("admin:eyebrow")}</p>
          <h1>{t("admin:title")}</h1>
        </div>
        <div className="admin-actions">
          <LanguageSwitcher />
          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
          <div className="admin-auth">
            <Lock size={16} aria-hidden="true" />
            <input
              aria-label={t("admin:token")}
              placeholder={t("admin:tokenPlaceholder")}
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <button className="icon-button" type="button" onClick={saveToken}>
              <Save size={16} aria-hidden="true" />
              <span>{t("common:actions.save")}</span>
            </button>
            <button className="icon-button" type="button" onClick={loadItems}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>{t("common:actions.reload")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="admin-grid">
        <form className="editor-panel" onSubmit={handleSubmit}>
          <div className="section-title">
            <Plus size={17} aria-hidden="true" />
            <h2>{t("admin:create")}</h2>
          </div>
          <label>
            {t("admin:titleLabel")}
            <input
              required
              minLength={3}
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            {t("admin:summaryLabel")}
            <textarea
              rows={8}
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
          <div className="form-row">
            <label>
              {t("admin:sourceUrl")}
              <input
                required
                type="url"
                value={form.sourceUrl}
                onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
              />
            </label>
            <label>
              {t("admin:publishedAt")}
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t("admin:tags")}
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </label>
            <label>
              {t("admin:regionCodes")}
              <input
                placeholder="RU-MOW, US-AZ"
                value={form.regions}
                onChange={(event) => setForm((current) => ({ ...current, regions: event.target.value }))}
              />
            </label>
          </div>
          <label>
            {t("admin:language")}
            <select
              value={form.language}
              onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
            >
              <option value="ru">{t("common:language.ru")}</option>
              <option value="en">{t("common:language.en")}</option>
            </select>
          </label>
          <button className="primary-action" type="submit" disabled={isSaving}>
            <Save size={17} aria-hidden="true" />
            {isSaving ? t("admin:publishing") : t("admin:publishNews")}
          </button>
          <p className="status-line" role="status">
            {statusText}
          </p>
        </form>

        <section className="manual-feed" aria-label={t("admin:manualFeed")}>
          <div className="section-title">
            <Newspaper size={17} aria-hidden="true" />
            <h2>{t("admin:manualFeed")}</h2>
            <span>{formatNumber(items.length, locale)}</span>
          </div>
          {items.map((item) => (
            <article className="manual-news-row" key={item.id}>
              <div>
                <p className="news-meta-line">
                  {item.source.toUpperCase()} · {formatDate(item.published_at ?? item.fetched_at, locale)}
                </p>
                <h3>{item.title}</h3>
                {item.summary ? <p>{item.summary}</p> : null}
              </div>
              <button className="danger-button" type="button" onClick={() => handleDelete(item.id)}>
                <Trash2 size={16} aria-hidden="true" />
                <span>{t("common:actions.delete")}</span>
              </button>
            </article>
          ))}
          {items.length === 0 ? <p className="empty-state">{t("admin:noManualNews")}</p> : null}
        </section>
      </div>
    </main>
  );
}

function DataStatus({ state }: { state: DataState }) {
  const { t } = useTranslation("common");
  const icon =
    state === "live" ? (
      <LiveApiMark />
    ) : state === "error" ? (
      <AlertCircle size={16} aria-hidden="true" />
    ) : (
      <Database size={16} aria-hidden="true" />
    );
  return (
    <div className={`data-pill data-pill--${state}`}>
      {icon}
      <span>
        {state === "live"
          ? t("status.liveApi")
          : state === "loading"
            ? t("status.loading")
            : state === "error"
              ? t("status.apiFallback")
              : t("status.sampleData")}
      </span>
    </div>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" role="img" aria-label="Hanta Monitor">
      <rect x="1.5" y="1.5" width="33" height="33" rx="6" />
      <circle cx="18" cy="18" r="11.5" />
      <path d="M7.5 18h21M18 6.5v23M10.5 11.2c4.8 2.1 10.2 2.1 15 0M10.5 24.8c4.8-2.1 10.2-2.1 15 0" />
      <circle className="brand-mark__marker" cx="23.6" cy="13.4" r="2.8" />
    </svg>
  );
}

function LiveApiMark() {
  return (
    <svg className="live-api-mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <circle className="live-api-mark__ring live-api-mark__ring--outer" cx="9" cy="9" r="7" />
      <circle className="live-api-mark__ring live-api-mark__ring--inner" cx="9" cy="9" r="4.4" />
      <circle cx="9" cy="9" r="2.2" />
    </svg>
  );
}

function OfficialSourceMark() {
  return (
    <svg className="official-source-mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M9 2.2 14 4v4.2c0 3.2-1.8 5.7-5 7.6-3.2-1.9-5-4.4-5-7.6V4l5-1.8Z" />
      <path d="m6.5 8.8 1.6 1.6 3.6-3.8" />
    </svg>
  );
}

function ThemeButton({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { t } = useTranslation("common");
  const label = theme === "dark" ? t("actions.light") : t("actions.dark");
  return (
    <button className="icon-button theme-button" type="button" onClick={onToggleTheme} aria-label={label}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

function Metric({
  label,
  value,
  tone,
  period,
  source,
  trendLabel,
}: {
  label: string;
  value: string;
  tone: "red" | "amber" | "blue" | "ink";
  period: string;
  source: string;
  trendLabel: string;
}) {
  return (
    <div className={`metric metric--${tone}`}>
      <span className="metric__label">{label}</span>
      <strong>{value}</strong>
      <div className="metric__spark" aria-hidden="true">
        <svg viewBox="0 0 80 20" focusable="false">
          <path d="M2 14 L14 12 L26 13 L38 8 L50 10 L62 5 L78 7" />
        </svg>
        <small>{trendLabel}</small>
      </div>
      <span className="metric__period">{period}</span>
      <span className="metric__source">{source}</span>
    </div>
  );
}

function MetricSkeleton({ label }: { label: string }) {
  const { t } = useTranslation("map");
  return (
    <section className="summary-grid" aria-label={t("aria.summaryLoading")}>
      {[0, 1, 2, 3].map((item) => (
        <div className="metric metric--skeleton" key={item}>
          <span className="skeleton-line skeleton-line--short" />
          <strong className="skeleton-line skeleton-line--value" />
          <span className="metric__period">{label}</span>
        </div>
      ))}
    </section>
  );
}

function NewsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <article className="news-card news-card--skeleton" key={item}>
          <span className="skeleton-line skeleton-line--short" />
          <span className="skeleton-line skeleton-line--title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--half" />
        </article>
      ))}
    </>
  );
}

function NewsCard({ item, locale, ordinal }: { item: NewsItem; locale: AppLocale; ordinal: number }) {
  const { t } = useTranslation("news");
  return (
    <article className={item.source === "manual" ? "news-card news-card--manual" : "news-card"}>
      <span className="news-card__ordinal">{String(ordinal).padStart(2, "0")}</span>
      <div className="news-meta">
        <span>{item.source.toUpperCase()}</span>
        <time dateTime={item.published_at ?? item.fetched_at}>
          {formatDate(item.published_at ?? item.fetched_at, locale)}
        </time>
      </div>
      <h3>{item.title}</h3>
      {item.summary ? <p>{item.summary}</p> : null}
      <div className="tag-row">
        {Array.from(new Set(item.tags)).slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <a
        href={`/news/${encodeURIComponent(item.id)}`}
        onClick={() => trackEvent("source_link_open", { source: item.source, news_id: item.id })}
      >
        {t("readUpdate")} <ExternalLink size={14} aria-hidden="true" />
      </a>
    </article>
  );
}

function LayerButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "layer-button layer-button--active" : "layer-button"} type="button" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function HantaMap({
  data,
  dataState,
  visibleLayers,
  onSelectRegion,
  theme,
  locale,
}: {
  data: AppData;
  dataState: DataState;
  visibleLayers: LayerState;
  onSelectRegion: (region: RegionFeature) => void;
  theme: Theme;
  locale: AppLocale;
}) {
  const { t } = useTranslation("map");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapModuleRef = useRef<MapLibreModule | null>(null);
  const dataRef = useRef(data);
  const onSelectRegionRef = useRef(onSelectRegion);
  const visibleLayersRef = useRef(visibleLayers);
  const themeRef = useRef(theme);
  const mapTextRef = useRef({
    webglUnavailable: t("status.webglUnavailable"),
    mapCouldNotStart: t("status.mapCouldNotStart"),
    mapLibraryCouldNotLoad: t("status.mapLibraryCouldNotLoad"),
    zoomIn: t("controls.zoomIn"),
    zoomOut: t("controls.zoomOut"),
    resetNorth: t("controls.resetNorth"),
  });
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  dataRef.current = data;
  visibleLayersRef.current = visibleLayers;
  mapTextRef.current = {
    webglUnavailable: t("status.webglUnavailable"),
    mapCouldNotStart: t("status.mapCouldNotStart"),
    mapLibraryCouldNotLoad: t("status.mapLibraryCouldNotLoad"),
    zoomIn: t("controls.zoomIn"),
    zoomOut: t("controls.zoomOut"),
    resetNorth: t("controls.resetNorth"),
  };

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || fallbackReason) return;

    let disposed = false;
    const cancelBoot = scheduleMapBoot(() => {
      import("maplibre-gl").then((module) => {
        if (disposed || !containerRef.current || mapRef.current) return;
        mapModuleRef.current = module;
        const maplibregl = module;

        if (!webGlAvailable()) {
          setFallbackReason(mapTextRef.current.webglUnavailable);
          return;
        }

        let map: MapLibreMap;
        try {
          map = new maplibregl.Map({
            container: containerRef.current,
            style: buildMapStyle(themeRef.current),
            center: [15, 25],
            zoom: 2.1,
            minZoom: 1,
            attributionControl: { compact: true },
          });
        } catch {
          setFallbackReason(mapTextRef.current.mapCouldNotStart);
          return;
        }

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: false }), "bottom-right");
        labelMapControls(map.getContainer(), {
          zoomIn: mapTextRef.current.zoomIn,
          zoomOut: mapTextRef.current.zoomOut,
          resetNorth: mapTextRef.current.resetNorth,
        });
        map.on("load", () => {
          installMapLayers(
            map,
            maplibregl,
            () => dataRef.current,
            visibleLayersRef.current,
            (region) => onSelectRegionRef.current(region),
          );
          fitMapToData(map, maplibregl, dataRef.current);
        });
        mapRef.current = map;
      })
        .catch(() => setFallbackReason(mapTextRef.current.mapLibraryCouldNotLoad));
    });

    return () => {
      disposed = true;
      cancelBoot();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fallbackReason]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    labelMapControls(map.getContainer(), {
      zoomIn: t("controls.zoomIn"),
      zoomOut: t("controls.zoomOut"),
      resetNorth: t("controls.resetNorth"),
    });
  }, [locale, t]);

  useEffect(() => {
    themeRef.current = theme;
    const map = mapRef.current;
    const maplibregl = mapModuleRef.current;
    if (!map || !maplibregl) return;

    const handleStyleLoad = () => {
      installMapLayers(
        map,
        maplibregl,
        () => dataRef.current,
        visibleLayersRef.current,
        (region) => onSelectRegionRef.current(region),
      );
    };
    map.once("style.load", handleStyleLoad);
    map.setStyle(buildMapStyle(theme));
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("regions")) return;
    (map.getSource("regions") as GeoJSONSource).setData(renderableRegions(data.regions));
    (map.getSource("outbreaks") as GeoJSONSource).setData(renderableOutbreaks(data.outbreaks));
    (map.getSource("news-events") as GeoJSONSource).setData(buildNewsGeoJson(data));
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setLayerVisibility(map, "case-heatmap", visibleLayers.heatmap);
    setLayerVisibility(map, "case-clusters", visibleLayers.cases);
    setLayerVisibility(map, "case-cluster-count", visibleLayers.cases);
    setLayerVisibility(map, "region-cases", visibleLayers.cases);
    setLayerVisibility(map, "outbreak-points", visibleLayers.outbreaks);
    setLayerVisibility(map, "news-points", visibleLayers.news);
  }, [visibleLayers]);

  if (fallbackReason) {
    return (
      <FallbackMap
        data={data}
        reason={fallbackReason}
        visibleLayers={visibleLayers}
        onSelectRegion={onSelectRegion}
        locale={locale}
      />
    );
  }

  return (
    <div className="map-container-shell">
      {dataState === "loading" ? (
        <div className="map-loading" aria-label={t("aria.mapLoading")}>
          <Loader2 size={24} aria-hidden="true" />
        </div>
      ) : null}
      <div className="map-container" ref={containerRef} />
    </div>
  );
}

function buildMapStyle(theme: Theme): StyleSpecification {
  const variant = theme === "dark" ? "dark_all" : "light_all";
  const tiles = ["a", "b", "c", "d"].map(
    (sub) => `https://${sub}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}.png`,
  );
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}

function installMapLayers(
  map: MapLibreMap,
  maplibregl: MapLibreModule,
  getData: () => AppData,
  visibleLayers: LayerState,
  onSelectRegion: (region: RegionFeature) => void,
) {
  const data = getData();
  map.addSource("regions", {
    type: "geojson",
    data: renderableRegions(data.regions),
    cluster: true,
    clusterMaxZoom: 5,
    clusterRadius: 42,
  });
  map.addSource("outbreaks", {
    type: "geojson",
    data: renderableOutbreaks(data.outbreaks),
  });
  map.addSource("news-events", {
    type: "geojson",
    data: buildNewsGeoJson(data),
  });

  map.addLayer({
    id: "case-heatmap",
    type: "heatmap",
    source: "regions",
    maxzoom: 6,
    layout: { visibility: visibleLayers.heatmap ? "visible" : "none" },
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["coalesce", ["get", "confirmed_cases"], 0], 0, 0, 900, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.35, 5, 1.1],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(39, 74, 110, 0)",
        0.35,
        "rgba(39, 74, 110, 0.34)",
        0.7,
        "rgba(179, 106, 26, 0.46)",
        1,
        "rgba(158, 45, 39, 0.62)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 18, 5, 38],
      "heatmap-opacity": 0.78,
    },
  });

  map.addLayer({
    id: "case-clusters",
    type: "circle",
    source: "regions",
    filter: ["has", "point_count"],
    layout: { visibility: visibleLayers.cases ? "visible" : "none" },
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#274A6E", 6, "#B36A1A", 18, "#9E2D27"],
      "circle-radius": ["step", ["get", "point_count"], 16, 6, 22, 18, 30],
      "circle-opacity": 0.86,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "case-cluster-count",
    type: "symbol",
    source: "regions",
    filter: ["has", "point_count"],
    layout: {
      visibility: visibleLayers.cases ? "visible" : "none",
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["Open Sans Semibold"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "region-cases",
    type: "circle",
    source: "regions",
    filter: ["!", ["has", "point_count"]],
    layout: { visibility: visibleLayers.cases ? "visible" : "none" },
    paint: {
      "circle-color": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "confirmed_cases"], 0],
        0,
        "#274A6E",
        100,
        "#B36A1A",
        800,
        "#9E2D27",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "confirmed_cases"], 0],
        0,
        6,
        100,
        13,
        900,
        25,
      ],
      "circle-opacity": 0.88,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.6,
    },
  });
  map.addLayer({
    id: "outbreak-points",
    type: "circle",
    source: "outbreaks",
    layout: { visibility: visibleLayers.outbreaks ? "visible" : "none" },
    paint: {
      "circle-color": "#0F1411",
      "circle-radius": 8,
      "circle-opacity": 0.9,
      "circle-stroke-color": "#9C5311",
      "circle-stroke-width": 2.4,
    },
  });
  map.addLayer({
    id: "news-points",
    type: "circle",
    source: "news-events",
    layout: { visibility: visibleLayers.news ? "visible" : "none" },
    paint: {
      "circle-color": "#1B638F",
      "circle-radius": 7,
      "circle-opacity": 0.82,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.6,
    },
  });

  map.on("click", "case-clusters", (event) => {
    if (!event.lngLat) return;
    map.easeTo({ center: event.lngLat, zoom: Math.min(map.getZoom() + 2, 7), duration: 450 });
  });
  map.on("click", "region-cases", (event) => {
    const featureId = event.features?.[0]?.id;
    const region = getData().regions.features.find((item) => item.id === featureId);
    if (region) onSelectRegion(region);
  });
  map.on("click", "outbreak-points", (event) => showPopup(map, maplibregl, event.features?.[0]));
  map.on("click", "news-points", (event) => showPopup(map, maplibregl, event.features?.[0]));

  for (const layer of ["case-clusters", "region-cases", "outbreak-points", "news-points"]) {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  }
}

function showPopup(map: MapLibreMap, maplibregl: MapLibreModule, feature: MapGeoJSONFeature | undefined) {
  const coordinates = feature?.geometry?.type === "Point" ? feature.geometry.coordinates.slice() : null;
  if (!feature || !coordinates) return;
  const title = String(feature.properties?.title ?? feature.properties?.label ?? "Map item");
  const source = String(feature.properties?.source ?? feature.properties?.sources ?? "source");
  new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
    .setLngLat(coordinates as [number, number])
    .setHTML(`<strong>${escapeHtml(title)}</strong><br/><span>${escapeHtml(source)}</span>`)
    .addTo(map);
}

function setLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function fitMapToData(map: MapLibreMap, maplibregl: MapLibreModule, data: AppData) {
  const coords = [
    ...data.regions.features.flatMap((item) => (item.geometry ? [item.geometry.coordinates] : [])),
    ...data.outbreaks.features.flatMap((item) => (item.geometry ? [item.geometry.coordinates] : [])),
  ];
  if (!coords.length) return;
  const bounds = coords.reduce(
    (current, coord) => current.extend(coord),
    new maplibregl.LngLatBounds(coords[0], coords[0]),
  );
  map.fitBounds(bounds, { padding: 120, maxZoom: 3.2, duration: 0 });
}

function renderableRegions(regions: AppData["regions"]): GeoJSONSourceSpecification["data"] {
  return {
    ...regions,
    features: regions.features.filter((feature) => feature.geometry !== null),
  } as GeoJSONSourceSpecification["data"];
}

function renderableOutbreaks(outbreaks: AppData["outbreaks"]): GeoJSONSourceSpecification["data"] {
  return {
    ...outbreaks,
    features: outbreaks.features.filter((feature) => feature.geometry !== null),
  } as GeoJSONSourceSpecification["data"];
}

function buildNewsGeoJson(data: AppData): GeoJSONSourceSpecification["data"] {
  const regionByCode = new Map(data.regions.features.map((feature) => [feature.properties.region_code, feature]));
  return {
    type: "FeatureCollection",
    features: data.news.flatMap((item) => {
      const region = item.related_region_codes.map((code) => regionByCode.get(code)).find((feature) => feature?.geometry);
      if (!region?.geometry) return [];
      return [
        {
          type: "Feature",
          id: item.id,
          geometry: region.geometry,
          properties: {
            title: item.title,
            source: item.source,
            data_type: "news_update",
          },
        },
      ];
    }),
  } as GeoJSONSourceSpecification["data"];
}

function webGlAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function scheduleMapBoot(callback: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 1200 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timerId = globalThis.setTimeout(callback, 300);
  return () => globalThis.clearTimeout(timerId);
}

function projectLonLat([lon, lat]: [number, number]): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function FallbackMap({
  data,
  reason,
  visibleLayers,
  onSelectRegion,
  locale,
}: {
  data: AppData;
  reason: string;
  visibleLayers: LayerState;
  onSelectRegion: (region: RegionFeature) => void;
  locale: AppLocale;
}) {
  const { t } = useTranslation("map");
  return (
    <div className="fallback-map" aria-label={t("aria.compatibilityMap")}>
      <div className="fallback-notice">
        <AlertTriangle size={16} aria-hidden="true" />
        <span>{reason}</span>
      </div>
      <svg className="fallback-grid" viewBox="0 0 100 100" role="img" aria-label={t("aria.worldGrid")}>
        {[20, 40, 60, 80].map((value) => (
          <line key={`x-${value}`} x1={value} y1="0" x2={value} y2="100" />
        ))}
        {[25, 50, 75].map((value) => (
          <line key={`y-${value}`} x1="0" y1={value} x2="100" y2={value} />
        ))}
      </svg>
      {visibleLayers.cases
        ? data.regions.features
            .filter((feature) => feature.geometry)
            .map((feature) => {
              const point = projectLonLat(feature.geometry!.coordinates);
              const size = Math.max(11, Math.min(30, 8 + feature.properties.confirmed_cases / 35));
              return (
                <button
                  className="fallback-point fallback-point--case"
                  key={feature.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%`, width: size, height: size }}
                  type="button"
                  onClick={() => onSelectRegion(feature)}
                  title={t("region.caseTitle", {
                    region: feature.properties.label,
                    count: formatNumber(feature.properties.confirmed_cases, locale),
                  })}
                />
              );
            })
        : null}
      {visibleLayers.outbreaks
        ? data.outbreaks.features
            .filter((feature) => feature.geometry)
            .map((feature) => {
              const point = projectLonLat(feature.geometry!.coordinates);
              return (
                <span
                  className="fallback-point fallback-point--outbreak"
                  key={feature.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={feature.properties.title}
                />
              );
            })
        : null}
    </div>
  );
}

function MapStatusOverlay({
  state,
  errorText,
  hasRenderableData,
}: {
  state: DataState;
  errorText: string;
  hasRenderableData: boolean;
}) {
  const { t } = useTranslation("map");
  if (state === "loading") {
    return (
      <div className="map-status map-status--loading">
        <Loader2 size={18} aria-hidden="true" />
        {t("status.loadingLayers")}
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="map-status map-status--error" title={errorText || undefined}>
        <AlertCircle size={18} aria-hidden="true" />
        {t("status.apiUnavailable")}
      </div>
    );
  }
  if (!hasRenderableData) {
    return (
      <div className="map-status">
        <AlertTriangle size={18} aria-hidden="true" />
        {t("status.noGeocodedPoints")}
      </div>
    );
  }
  return null;
}

function MapLegend({ visibleLayers }: { visibleLayers: LayerState }) {
  const { t } = useTranslation("map");
  return (
    <div className="map-legend" aria-label={t("aria.mapLegend")}>
      {visibleLayers.cases ? (
        <span>
          <i className="legend-dot legend-dot--case" />
          {t("legend.cases")}
        </span>
      ) : null}
      {visibleLayers.heatmap ? (
        <span>
          <i className="legend-dot legend-dot--heatmap" />
          {t("legend.heatmap")}
        </span>
      ) : null}
      {visibleLayers.outbreaks ? (
        <span>
          <i className="legend-dot legend-dot--outbreak" />
          {t("legend.outbreaks")}
        </span>
      ) : null}
      {visibleLayers.news ? (
        <span>
          <i className="legend-dot legend-dot--news" />
          {t("legend.news")}
        </span>
      ) : null}
    </div>
  );
}

function RegionPanel({
  region,
  generatedAt,
  locale,
  open,
  onClose,
  onOpen,
}: {
  region: RegionFeature | null;
  generatedAt: string | undefined;
  locale: AppLocale;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation("map");
  if (!region) {
    return null;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="region-pill"
        onClick={onOpen}
        aria-label={t("region.showDetails", { region: region.properties.label })}
      >
        <span className="region-pill__dot" aria-hidden="true" />
        <span className="region-pill__label">{region.properties.label}</span>
        <span className="region-pill__value">{formatNumber(region.properties.confirmed_cases, locale)}</span>
      </button>
    );
  }

  return (
    <aside className="region-panel" aria-label={t("aria.selectedRegion")}>
      <header className="region-panel__head">
        <div>
          <p className="eyebrow">{t("region.selected")}</p>
          <h2>{region.properties.label}</h2>
        </div>
        <button
          type="button"
          className="icon-button icon-button--mini"
          onClick={onClose}
          aria-label={t("region.hideDetails")}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </header>
      <dl>
        <div>
          <dt>{t("region.cases")}</dt>
          <dd>{formatNumber(region.properties.confirmed_cases, locale)}</dd>
        </div>
        <div>
          <dt>{t("region.deaths")}</dt>
          <dd>{formatNumber(region.properties.deaths, locale)}</dd>
        </div>
        <div>
          <dt>{t("region.precision")}</dt>
          <dd>{region.properties.geo_precision}</dd>
        </div>
        <div>
          <dt>{t("region.source")}</dt>
          <dd>{region.properties.sources.join(", ").toUpperCase()}</dd>
        </div>
      </dl>
      <p className="freshness">
        <Compass size={13} aria-hidden="true" />
        {t("region.updated", { date: formatDate(generatedAt, locale) })}
      </p>
    </aside>
  );
}

function SiteFooter({ locale, generatedAt }: { locale: AppLocale; generatedAt: string | undefined }) {
  const { t } = useTranslation("common");
  const version = import.meta.env.VITE_APP_VERSION ?? "0.1.0";
  const deployedAt = import.meta.env.VITE_BUILD_DATE ?? formatDate(generatedAt, locale, t("status.unknown"));

  return (
    <footer className="site-footer" data-print-url={window.location.href}>
      <div className="site-footer__grid">
        <section>
          <h2>{t("footer.project")}</h2>
          <p>{t("footer.aboutText")}</p>
          <a href={locale === "en" ? "/en/about/" : "/about/"}>{t("routes.about")}</a>
        </section>
        <section>
          <h2>{t("footer.sources")}</h2>
          <p>{t("footer.sourcesText")}</p>
          <a href={locale === "en" ? "/en/data-sources/" : "/data-sources/"}>{t("routes.dataSources")}</a>
        </section>
        <section>
          <h2>{t("footer.methodology")}</h2>
          <p>{t("footer.methodologyText")}</p>
          <a href={locale === "en" ? "/en/methodology/" : "/methodology/"}>{t("routes.methodology")}</a>
        </section>
      </div>
      <div className="site-footer__license">
        <span className="cc-mark" aria-hidden="true">CC</span>
        <p>{t("footer.licenseText")}</p>
      </div>
      <div className="site-footer__links" aria-label={t("footer.contact")}>
        <a href="mailto:contact@orthohantavirus.example">{t("footer.email")}</a>
        <a href="https://github.com/" rel="noreferrer">{t("footer.github")}</a>
        <a href="/rss.xml">{t("footer.rss")}</a>
      </div>
      <p className="site-footer__meta">
        {t("footer.build", { version })} · {t("footer.deployed", { date: deployedAt })} ·{" "}
        <a href="/status">{t("footer.status")}</a>
      </p>
    </footer>
  );
}

function formatSources(sources: string[]): string {
  return sources.length ? sources.map((source) => source.toUpperCase()).join(" + ") : "CDC + ECDC + WHO";
}

function summarizeCasePeriod(data: AppData, locale: AppLocale, fallback: string): string {
  const starts = data.regions.features
    .map((feature) => feature.properties.period_start)
    .filter(Boolean)
    .sort();
  const ends = data.regions.features
    .map((feature) => feature.properties.period_end)
    .filter(Boolean)
    .sort();
  return formatPeriod(starts[0], ends[ends.length - 1], locale, fallback);
}

function labelMapControls(
  container: HTMLElement,
  labels: { zoomIn: string; zoomOut: string; resetNorth: string },
): void {
  const zoomIn = container.querySelector<HTMLButtonElement>(".maplibregl-ctrl-zoom-in");
  const zoomOut = container.querySelector<HTMLButtonElement>(".maplibregl-ctrl-zoom-out");
  const compass = container.querySelector<HTMLButtonElement>(".maplibregl-ctrl-compass");
  if (zoomIn) {
    zoomIn.title = labels.zoomIn;
    zoomIn.setAttribute("aria-label", labels.zoomIn);
  }
  if (zoomOut) {
    zoomOut.title = labels.zoomOut;
    zoomOut.setAttribute("aria-label", labels.zoomOut);
  }
  if (compass) {
    compass.title = labels.resetNorth;
    compass.setAttribute("aria-label", labels.resetNorth);
  }
}

function toggleLayer(layer: keyof LayerState, setVisibleLayers: Dispatch<SetStateAction<LayerState>>) {
  setVisibleLayers((current) => ({ ...current, [layer]: !current[layer] }));
  trackEvent("map_layer_toggle", { layer });
}

function loadInitialTheme(): Theme {
  if (typeof localStorage === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
