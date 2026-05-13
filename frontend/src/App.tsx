import "maplibre-gl/dist/maplibre-gl.css";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  Layers,
  ListFilter,
  Lock,
  MapPin,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSourceSpecification } from "maplibre-gl";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { installAnalytics, trackEvent } from "./analytics";
import type { AppData, ManualNewsPayload, NewsItem, RegionFeature } from "./api";
import { createManualNews, deleteManualNews, loadAppData, loadManualNews } from "./api";
import { formatDate, formatNumber, sortedNews } from "./format";
import { sampleData } from "./sampleData";
import "./styles.css";

const ADMIN_TOKEN_STORAGE_KEY = "orthohantavirus-admin-token";

export function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    installAnalytics();
  }, []);

  return isAdminRoute ? <AdminApp /> : <PublicMapApp />;
}

function PublicMapApp() {
  const [data, setData] = useState<AppData>(sampleData);
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature | null>(
    sampleData.regions.features[0] ?? null,
  );
  const [dataState, setDataState] = useState<"loading" | "live" | "fallback">("loading");
  const [visibleLayers, setVisibleLayers] = useState({ cases: true, outbreaks: true });
  const [sourceFilter, setSourceFilter] = useState("all");
  const [query, setQuery] = useState("");

  const refreshData = useCallback(() => {
    setDataState("loading");
    loadAppData()
      .then((loaded) => {
        const hasData = loaded.regions.features.length > 0 || loaded.news.length > 0;
        const nextData = hasData ? loaded : sampleData;
        setData(nextData);
        setSelectedRegion(nextData.regions.features[0] ?? null);
        setDataState(hasData ? "live" : "fallback");
      })
      .catch(() => {
        setData(sampleData);
        setSelectedRegion(sampleData.regions.features[0] ?? null);
        setDataState("fallback");
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

  const handleSelectRegion = useCallback((region: RegionFeature) => {
    setSelectedRegion(region);
    trackEvent("region_select", {
      region_code: region.properties.region_code,
      source: region.properties.sources.join(","),
    });
  }, []);

  return (
    <main className="app-shell">
      <aside className="news-panel" aria-label="News feed">
        <header className="brand-strip">
          <div>
            <p className="eyebrow">Orthohantavirus monitor</p>
            <h1>Cases, outbreaks, and verified updates</h1>
          </div>
          <DataStatus state={dataState} />
        </header>

        <section className="summary-grid" aria-label="Summary">
          <Metric label="Reported cases" value={formatNumber(data.summary.reported_cases_total)} tone="red" />
          <Metric label="Deaths" value={formatNumber(data.summary.reported_deaths_total)} tone="ink" />
          <Metric label="Outbreak reports" value={formatNumber(data.summary.outbreak_events)} tone="amber" />
          <Metric label="News items" value={formatNumber(data.summary.news_items)} tone="blue" />
        </section>

        <section className="feed-controls" aria-label="News filters">
          <label className="search-control">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search news"
              placeholder="Search news"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="select-control">
            <ListFilter size={16} aria-hidden="true" />
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
            <Newspaper size={17} aria-hidden="true" />
            <h2>News feed</h2>
            <span>{formatNumber(filteredNews.length)}</span>
          </div>
          {filteredNews.map((item) => (
            <NewsCard item={item} key={item.id} />
          ))}
          {filteredNews.length === 0 ? <p className="empty-state">No news matched the current filters.</p> : null}
        </section>
      </aside>

      <section className="map-workspace" aria-label="Map workspace">
        <div className="map-toolbar">
          <div className="toolbar-title">
            <p className="eyebrow">Map layers</p>
            <strong>{visibleLayers.cases ? "Reported case distribution" : "Outbreak report distribution"}</strong>
          </div>
          <div className="layer-toggles" aria-label="Map layers">
            <LayerButton
              active={visibleLayers.cases}
              icon={<Layers size={16} aria-hidden="true" />}
              label="Cases"
              onClick={() => {
                setVisibleLayers((current) => ({ ...current, cases: !current.cases }));
                trackEvent("map_layer_toggle", { layer: "reported_cases" });
              }}
            />
            <LayerButton
              active={visibleLayers.outbreaks}
              icon={<MapPin size={16} aria-hidden="true" />}
              label="Outbreaks"
              onClick={() => {
                setVisibleLayers((current) => ({ ...current, outbreaks: !current.outbreaks }));
                trackEvent("map_layer_toggle", { layer: "outbreak_reports" });
              }}
            />
          </div>
          <button className="icon-button" type="button" onClick={refreshData} title="Refresh data">
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="map-stage">
          <HantaMap data={data} visibleLayers={visibleLayers} onSelectRegion={handleSelectRegion} />
          <RegionPanel region={selectedRegion} generatedAt={data.regions.generated_at ?? data.summary.generated_at} />
          <div className="map-legend" aria-label="Map legend">
            <span>
              <i className="legend-dot legend-dot--case" />
              Reported cases
            </span>
            <span>
              <i className="legend-dot legend-dot--outbreak" />
              Outbreak report
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminApp() {
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

function DataStatus({ state }: { state: "loading" | "live" | "fallback" }) {
  const icon =
    state === "live" ? <CheckCircle2 size={16} aria-hidden="true" /> : <Database size={16} aria-hidden="true" />;
  return (
    <div className={`data-pill data-pill--${state}`}>
      {icon}
      <span>{state === "live" ? "Live API" : state === "loading" ? "Loading" : "Sample data"}</span>
    </div>
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
        {item.tags.slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <a
        href={item.source_url}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("source_link_open", { source: item.source, news_id: item.id })}
      >
        Source <ExternalLink size={14} aria-hidden="true" />
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
  visibleLayers,
  onSelectRegion,
}: {
  data: AppData;
  visibleLayers: { cases: boolean; outbreaks: boolean };
  onSelectRegion: (region: RegionFeature) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef(data);
  const onSelectRegionRef = useRef(onSelectRegion);
  const visibleLayersRef = useRef(visibleLayers);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  dataRef.current = data;
  visibleLayersRef.current = visibleLayers;

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || fallbackReason) return;

    if (!webGlAvailable()) {
      setFallbackReason("WebGL is unavailable in this browser. Showing the compatibility map.");
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [8, 43],
        zoom: 1.65,
        minZoom: 1,
      });
    } catch {
      setFallbackReason("The interactive map could not start. Showing the compatibility map.");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");

    map.on("load", () => {
      map.addSource("regions", { type: "geojson", data: renderableRegions(dataRef.current.regions) });
      map.addSource("outbreaks", { type: "geojson", data: renderableOutbreaks(dataRef.current.outbreaks) });
      map.addLayer({
        id: "region-cases",
        type: "circle",
        source: "regions",
        layout: { visibility: visibleLayersRef.current.cases ? "visible" : "none" },
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
          "circle-opacity": 0.8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "outbreak-points",
        type: "circle",
        source: "outbreaks",
        layout: { visibility: visibleLayersRef.current.outbreaks ? "visible" : "none" },
        paint: {
          "circle-color": "#111827",
          "circle-radius": 8,
          "circle-opacity": 0.88,
          "circle-stroke-color": "#f2b84b",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "region-cases", (event) => {
        const featureId = event.features?.[0]?.id;
        const region = dataRef.current.regions.features.find((item) => item.id === featureId);
        if (region) onSelectRegionRef.current(region);
      });

      map.on("click", "outbreak-points", (event) => {
        const feature = event.features?.[0];
        const coordinates = feature?.geometry?.type === "Point" ? feature.geometry.coordinates.slice() : null;
        if (!feature || !coordinates) return;
        new maplibregl.Popup()
          .setLngLat(coordinates as [number, number])
          .setHTML(
            `<strong>${escapeHtml(feature.properties?.title ?? "Outbreak report")}</strong><br/><span>${escapeHtml(
              feature.properties?.source ?? "source",
            )}</span>`,
          )
          .addTo(map);
      });

      for (const layer of ["region-cases", "outbreak-points"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fallbackReason]);

  useEffect(() => {
    const source = mapRef.current?.getSource("regions") as maplibregl.GeoJSONSource | undefined;
    source?.setData(renderableRegions(data.regions));
  }, [data.regions]);

  useEffect(() => {
    const source = mapRef.current?.getSource("outbreaks") as maplibregl.GeoJSONSource | undefined;
    source?.setData(renderableOutbreaks(data.outbreaks));
  }, [data.outbreaks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("region-cases")) {
      map.setLayoutProperty("region-cases", "visibility", visibleLayers.cases ? "visible" : "none");
    }
    if (map.getLayer("outbreak-points")) {
      map.setLayoutProperty("outbreak-points", "visibility", visibleLayers.outbreaks ? "visible" : "none");
    }
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

  return <div className="map-container" ref={containerRef} />;
}

function FallbackMap({
  data,
  reason,
  visibleLayers,
  onSelectRegion,
}: {
  data: AppData;
  reason: string;
  visibleLayers: { cases: boolean; outbreaks: boolean };
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

function webGlAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
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

function RegionPanel({
  region,
  generatedAt,
}: {
  region: RegionFeature | null;
  generatedAt: string | undefined;
}) {
  if (!region) {
    return null;
  }

  return (
    <aside className="region-panel" aria-label="Selected region">
      <p className="eyebrow">Selected region</p>
      <h2>{region.properties.label}</h2>
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
        <Compass size={14} aria-hidden="true" />
        Updated {formatDate(generatedAt)}
      </p>
    </aside>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
