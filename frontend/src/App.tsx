import "maplibre-gl/dist/maplibre-gl.css";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
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

import { installAnalytics, trackEvent } from "./analytics";
import type { AppData, ManualNewsPayload, NewsItem, RegionFeature } from "./api";
import { createManualNews, deleteManualNews, loadAppData, loadManualNews } from "./api";
import { formatDate, formatNumber, sortedNews } from "./format";
import { sampleData } from "./sampleData";
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
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());

  useEffect(() => {
    installAnalytics();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
  const [data, setData] = useState<AppData>(sampleData);
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature | null>(
    sampleData.regions.features[0] ?? null,
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

  const refreshData = useCallback(() => {
    setDataState("loading");
    setErrorText("");
    loadAppData()
      .then((loaded) => {
        const hasData = loaded.regions.features.length > 0 || loaded.news.length > 0;
        const nextData = hasData ? loaded : sampleData;
        setData(nextData);
        setSelectedRegion(nextData.regions.features[0] ?? null);
        setDataState(hasData ? "live" : "fallback");
      })
      .catch((error: Error) => {
        setData(sampleData);
        setSelectedRegion(sampleData.regions.features[0] ?? null);
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
      <aside className="monitor-sidebar" aria-label="News feed">
        <div className="sidebar-handle" aria-hidden="true" />
        <button
          className="sidebar-sheet-toggle"
          type="button"
          onClick={() => setFeedSheetOpen((current) => !current)}
          aria-expanded={feedSheetOpen}
        >
          <span className="sheet-toggle__inner">
            <Newspaper size={16} aria-hidden="true" />
            <span>{feedSheetOpen ? "Hide feed" : "Show feed"}</span>
            <span className="sheet-toggle__count">{formatNumber(filteredNews.length)}</span>
          </span>
          {feedSheetOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        </button>

        <div className="sidebar-scroll">
          <section className="trust-strip" aria-label="Data trust and freshness">
            <span>
              <CheckCircle2 size={14} aria-hidden="true" />
              Official-source first
            </span>
            <span>
              <Database size={14} aria-hidden="true" />
              Updated {formatDate(latestDate)}
            </span>
          </section>

          {dataState === "loading" ? (
            <MetricSkeleton />
          ) : (
            <section className="summary-grid" aria-label="Summary">
              <Metric label="Reported cases" value={formatNumber(data.summary.reported_cases_total)} tone="red" />
              <Metric label="Deaths" value={formatNumber(data.summary.reported_deaths_total)} tone="ink" />
              <Metric label="Outbreak reports" value={formatNumber(data.summary.outbreak_events)} tone="amber" />
              <Metric label="Verified updates" value={formatNumber(data.summary.news_items)} tone="blue" />
            </section>
          )}

          <section className="feed-controls" aria-label="News filters">
            <label className="search-control">
              <Search size={15} aria-hidden="true" />
              <input
                aria-label="Search news"
                placeholder="Search verified updates"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-control">
              <ListFilter size={15} aria-hidden="true" />
              <select
                aria-label="Filter news by source"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="all">All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="news-list" aria-label="Official news">
            <div className="section-title">
              <Newspaper size={16} aria-hidden="true" />
              <h2>Verified updates</h2>
              <span>{formatNumber(filteredNews.length)}</span>
            </div>
            {dataState === "loading" ? (
              <NewsSkeleton />
            ) : (
              filteredNews.map((item) => <NewsCard item={item} key={item.id} />)
            )}
            {dataState !== "loading" && filteredNews.length === 0 ? (
              <p className="empty-state">No updates matched the current filters.</p>
            ) : null}
          </section>
        </div>
      </aside>

      <div className="map-stage">
        <HantaMap
          data={data}
          dataState={dataState}
          visibleLayers={visibleLayers}
          onSelectRegion={handleSelectRegion}
          theme={theme}
        />

        <header className="map-topbar" aria-label="Application header">
          <div className="map-topbar__brand">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <p className="eyebrow">Orthohantavirus monitor</p>
              <strong>
                <span className="desktop-only">Cases, outbreaks &amp; verified updates</span>
                <span className="mobile-only">Surveillance map</span>
              </strong>
            </div>
          </div>
          <div className="map-topbar__actions">
            <DataStatus state={dataState} />
            <button
              className="icon-button icon-button--ghost desktop-only"
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              title={sidebarOpen ? "Hide feed" : "Show feed"}
            >
              <Layers size={16} aria-hidden="true" />
              <span>{sidebarOpen ? "Hide feed" : "Show feed"}</span>
            </button>
            <button
              className="icon-button icon-button--ghost"
              type="button"
              onClick={refreshData}
              title="Refresh data"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span className="desktop-only">Refresh</span>
            </button>
            <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
          </div>
        </header>

        <div className="map-controls" aria-label="Map layers">
          <LayerButton
            active={visibleLayers.cases}
            icon={<ThermometerSun size={15} aria-hidden="true" />}
            label="Cases"
            onClick={() => toggleLayer("cases", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.outbreaks}
            icon={<Flame size={15} aria-hidden="true" />}
            label="Outbreaks"
            onClick={() => toggleLayer("outbreaks", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.heatmap}
            icon={<Activity size={15} aria-hidden="true" />}
            label="Heatmap"
            onClick={() => toggleLayer("heatmap", setVisibleLayers)}
          />
          <LayerButton
            active={visibleLayers.news}
            icon={<Newspaper size={15} aria-hidden="true" />}
            label="News"
            onClick={() => toggleLayer("news", setVisibleLayers)}
          />
        </div>

        <MapStatusOverlay state={dataState} errorText={errorText} hasRenderableData={hasRenderableMapData} />
        <MapLegend visibleLayers={visibleLayers} />
        <RegionPanel
          region={selectedRegion}
          generatedAt={latestDate}
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
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [statusText, setStatusText] = useState("Admin feed not loaded yet.");
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
    setStatusText("Loading manual news...");
    loadManualNews(token)
      .then((loaded) => {
        setItems(sortedNews(loaded));
        setStatusText(`Loaded ${loaded.length} manual news items.`);
      })
      .catch((error: Error) => {
        setStatusText(`Cannot load manual news: ${error.message}. On local dev, enter NEWS_ADMIN_API_TOKEN.`);
      });
  }, [token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function saveToken() {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token.trim());
    setStatusText("Admin token saved in this browser session.");
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
        setStatusText(`Published: ${created.title}`);
        setForm((current) => ({ ...current, title: "", summary: "", sourceUrl: "", publishedAt: "" }));
      })
      .catch((error: Error) => setStatusText(`Cannot publish news: ${error.message}`))
      .finally(() => setIsSaving(false));
  }

  function handleDelete(newsId: string) {
    deleteManualNews(newsId, token)
      .then(() => {
        setItems((current) => current.filter((item) => item.id !== newsId));
        setStatusText("Manual news item deleted.");
      })
      .catch((error: Error) => setStatusText(`Cannot delete news: ${error.message}`));
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1>Manual news publishing</h1>
        </div>
        <div className="admin-actions">
          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
          <div className="admin-auth">
            <Lock size={16} aria-hidden="true" />
            <input
              aria-label="Admin API token"
              placeholder="NEWS_ADMIN_API_TOKEN for local dev"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <button className="icon-button" type="button" onClick={saveToken}>
              <Save size={16} aria-hidden="true" />
              <span>Save</span>
            </button>
            <button className="icon-button" type="button" onClick={loadItems}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>Reload</span>
            </button>
          </div>
        </div>
      </header>

      <div className="admin-grid">
        <form className="editor-panel" onSubmit={handleSubmit}>
          <div className="section-title">
            <Plus size={17} aria-hidden="true" />
            <h2>Create news item</h2>
          </div>
          <label>
            Title
            <input
              required
              minLength={3}
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Summary
            <textarea
              rows={8}
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
          <div className="form-row">
            <label>
              Source URL
              <input
                required
                type="url"
                value={form.sourceUrl}
                onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
              />
            </label>
            <label>
              Published at
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Tags
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </label>
            <label>
              Region codes
              <input
                placeholder="RU-MOW, US-AZ"
                value={form.regions}
                onChange={(event) => setForm((current) => ({ ...current, regions: event.target.value }))}
              />
            </label>
          </div>
          <button className="primary-action" type="submit" disabled={isSaving}>
            <Save size={17} aria-hidden="true" />
            {isSaving ? "Publishing..." : "Publish news"}
          </button>
          <p className="status-line" role="status">
            {statusText}
          </p>
        </form>

        <section className="manual-feed" aria-label="Manual news items">
          <div className="section-title">
            <Newspaper size={17} aria-hidden="true" />
            <h2>Manual feed</h2>
            <span>{formatNumber(items.length)}</span>
          </div>
          {items.map((item) => (
            <article className="manual-news-row" key={item.id}>
              <div>
                <p className="news-meta-line">
                  {item.source.toUpperCase()} · {formatDate(item.published_at ?? item.fetched_at)}
                </p>
                <h3>{item.title}</h3>
                {item.summary ? <p>{item.summary}</p> : null}
              </div>
              <button className="danger-button" type="button" onClick={() => handleDelete(item.id)}>
                <Trash2 size={16} aria-hidden="true" />
                <span>Delete</span>
              </button>
            </article>
          ))}
          {items.length === 0 ? <p className="empty-state">No manual news yet.</p> : null}
        </section>
      </div>
    </main>
  );
}

function DataStatus({ state }: { state: DataState }) {
  const icon =
    state === "live" ? (
      <CheckCircle2 size={16} aria-hidden="true" />
    ) : state === "error" ? (
      <AlertCircle size={16} aria-hidden="true" />
    ) : (
      <Database size={16} aria-hidden="true" />
    );
  return (
    <div className={`data-pill data-pill--${state}`}>
      {icon}
      <span>{state === "live" ? "Live API" : state === "loading" ? "Loading" : state === "error" ? "API fallback" : "Sample data"}</span>
    </div>
  );
}

function ThemeButton({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <button className="icon-button theme-button" type="button" onClick={onToggleTheme}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" | "blue" | "ink" }) {
  return (
    <div className={`metric metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <section className="summary-grid" aria-label="Summary loading">
      {[0, 1, 2, 3].map((item) => (
        <div className="metric metric--skeleton" key={item}>
          <span className="skeleton-line skeleton-line--short" />
          <strong className="skeleton-line skeleton-line--value" />
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

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className={item.source === "manual" ? "news-card news-card--manual" : "news-card"}>
      <div className="news-meta">
        <span>{item.source.toUpperCase()}</span>
        <time dateTime={item.published_at ?? item.fetched_at}>{formatDate(item.published_at ?? item.fetched_at)}</time>
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
        Read update <ExternalLink size={14} aria-hidden="true" />
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
}: {
  data: AppData;
  dataState: DataState;
  visibleLayers: LayerState;
  onSelectRegion: (region: RegionFeature) => void;
  theme: Theme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapModuleRef = useRef<MapLibreModule | null>(null);
  const dataRef = useRef(data);
  const onSelectRegionRef = useRef(onSelectRegion);
  const visibleLayersRef = useRef(visibleLayers);
  const themeRef = useRef(theme);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  dataRef.current = data;
  visibleLayersRef.current = visibleLayers;

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
          setFallbackReason("WebGL is unavailable in this browser. Showing the compatibility map.");
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
          setFallbackReason("The interactive map could not start. Showing the compatibility map.");
          return;
        }

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: false }), "bottom-right");
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
        .catch(() => setFallbackReason("The map library could not load. Showing the compatibility map."));
    });

    return () => {
      disposed = true;
      cancelBoot();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [fallbackReason]);

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
      />
    );
  }

  return (
    <div className="map-container-shell">
      {dataState === "loading" ? (
        <div className="map-loading" aria-label="Map loading">
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
        "rgba(47, 95, 152, 0)",
        0.35,
        "rgba(66, 153, 225, 0.36)",
        0.7,
        "rgba(245, 158, 11, 0.46)",
        1,
        "rgba(189, 61, 55, 0.62)",
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
      "circle-color": ["step", ["get", "point_count"], "#2f5f98", 6, "#b66a1c", 18, "#bd3d37"],
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
        "#2f5f98",
        100,
        "#b66a1c",
        800,
        "#bd3d37",
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
      "circle-color": "#111827",
      "circle-radius": 8,
      "circle-opacity": 0.9,
      "circle-stroke-color": "#f59e0b",
      "circle-stroke-width": 2.4,
    },
  });
  map.addLayer({
    id: "news-points",
    type: "circle",
    source: "news-events",
    layout: { visibility: visibleLayers.news ? "visible" : "none" },
    paint: {
      "circle-color": "#0891b2",
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
}: {
  data: AppData;
  reason: string;
  visibleLayers: LayerState;
  onSelectRegion: (region: RegionFeature) => void;
}) {
  return (
    <div className="fallback-map" aria-label="Compatibility map">
      <div className="fallback-notice">
        <AlertTriangle size={16} aria-hidden="true" />
        <span>{reason}</span>
      </div>
      <svg className="fallback-grid" viewBox="0 0 100 100" role="img" aria-label="World grid">
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
                  title={`${feature.properties.label}: ${formatNumber(feature.properties.confirmed_cases)} cases`}
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
  if (state === "loading") {
    return (
      <div className="map-status map-status--loading">
        <Loader2 size={18} aria-hidden="true" />
        Loading surveillance layers
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="map-status map-status--error">
        <AlertCircle size={18} aria-hidden="true" />
        API unavailable. Showing sample data. {errorText ? `(${errorText})` : ""}
      </div>
    );
  }
  if (!hasRenderableData) {
    return (
      <div className="map-status">
        <AlertTriangle size={18} aria-hidden="true" />
        No geocoded points are available for the current dataset.
      </div>
    );
  }
  return null;
}

function MapLegend({ visibleLayers }: { visibleLayers: LayerState }) {
  return (
    <div className="map-legend" aria-label="Map legend">
      {visibleLayers.cases ? (
        <span>
          <i className="legend-dot legend-dot--case" />
          Reported cases
        </span>
      ) : null}
      {visibleLayers.heatmap ? (
        <span>
          <i className="legend-dot legend-dot--heatmap" />
          Case heatmap
        </span>
      ) : null}
      {visibleLayers.outbreaks ? (
        <span>
          <i className="legend-dot legend-dot--outbreak" />
          Outbreak report
        </span>
      ) : null}
      {visibleLayers.news ? (
        <span>
          <i className="legend-dot legend-dot--news" />
          News-linked region
        </span>
      ) : null}
    </div>
  );
}

function RegionPanel({
  region,
  generatedAt,
  open,
  onClose,
  onOpen,
}: {
  region: RegionFeature | null;
  generatedAt: string | undefined;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  if (!region) {
    return null;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="region-pill"
        onClick={onOpen}
        aria-label={`Show details for ${region.properties.label}`}
      >
        <span className="region-pill__dot" aria-hidden="true" />
        <span className="region-pill__label">{region.properties.label}</span>
        <span className="region-pill__value">{formatNumber(region.properties.confirmed_cases)}</span>
      </button>
    );
  }

  return (
    <aside className="region-panel" aria-label="Selected region">
      <header className="region-panel__head">
        <div>
          <p className="eyebrow">Selected region</p>
          <h2>{region.properties.label}</h2>
        </div>
        <button
          type="button"
          className="icon-button icon-button--mini"
          onClick={onClose}
          aria-label="Hide region details"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </header>
      <dl>
        <div>
          <dt>Cases</dt>
          <dd>{formatNumber(region.properties.confirmed_cases)}</dd>
        </div>
        <div>
          <dt>Deaths</dt>
          <dd>{formatNumber(region.properties.deaths)}</dd>
        </div>
        <div>
          <dt>Precision</dt>
          <dd>{region.properties.geo_precision}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{region.properties.sources.join(", ").toUpperCase()}</dd>
        </div>
      </dl>
      <p className="freshness">
        <Compass size={13} aria-hidden="true" />
        Updated {formatDate(generatedAt)}
      </p>
    </aside>
  );
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
