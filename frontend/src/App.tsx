import "maplibre-gl/dist/maplibre-gl.css";
import { Activity, Database, ExternalLink, Layers, MapPin, Newspaper } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSourceSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { installAnalytics, trackEvent } from "./analytics";
import type { AppData, RegionFeature } from "./api";
import { loadAppData } from "./api";
import { formatDate, formatNumber, sortedNews } from "./format";
import { sampleData } from "./sampleData";
import "./styles.css";

export function App() {
  const [data, setData] = useState<AppData>(sampleData);
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature | null>(
    sampleData.regions.features[0] ?? null,
  );
  const [dataState, setDataState] = useState<"loading" | "live" | "fallback">("loading");
  const [visibleLayers, setVisibleLayers] = useState({ cases: true, outbreaks: true });

  useEffect(() => {
    installAnalytics();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAppData()
      .then((loaded) => {
        if (cancelled) return;
        const hasData = loaded.regions.features.length > 0 || loaded.news.length > 0;
        setData(hasData ? loaded : sampleData);
        setSelectedRegion((hasData ? loaded.regions.features : sampleData.regions.features)[0] ?? null);
        setDataState(hasData ? "live" : "fallback");
      })
      .catch(() => {
        if (cancelled) return;
        setData(sampleData);
        setSelectedRegion(sampleData.regions.features[0] ?? null);
        setDataState("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const news = useMemo(() => sortedNews(data.news), [data.news]);

  return (
    <main className="app-shell">
      <aside className="news-panel" aria-label="News feed">
        <header className="panel-header">
          <p className="eyebrow">Orthohantavirus Map</p>
          <h1>Reported cases and official outbreak updates</h1>
          <div className={`data-pill data-pill--${dataState}`}>
            <Database size={15} aria-hidden="true" />
            <span>{dataState === "live" ? "Live API data" : dataState === "loading" ? "Loading" : "Sample data"}</span>
          </div>
        </header>

        <section className="summary-grid" aria-label="Summary">
          <Metric label="Reported cases" value={formatNumber(data.summary.reported_cases_total)} />
          <Metric label="Deaths in case data" value={formatNumber(data.summary.reported_deaths_total)} />
          <Metric label="Outbreak reports" value={formatNumber(data.summary.outbreak_events)} />
          <Metric label="Sources" value={data.summary.sources.join(", ") || "None"} />
        </section>

        <section className="news-list" aria-label="Official news">
          <div className="section-title">
            <Newspaper size={17} aria-hidden="true" />
            <h2>News</h2>
          </div>
          {news.map((item) => (
            <article className="news-card" key={item.id}>
              <div className="news-meta">
                <span>{item.source.toUpperCase()}</span>
                <time dateTime={item.published_at ?? item.fetched_at}>
                  {formatDate(item.published_at ?? item.fetched_at)}
                </time>
              </div>
              <h3>{item.title}</h3>
              {item.summary ? <p>{item.summary}</p> : null}
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("source_link_open", { source: item.source, news_id: item.id })}
              >
                Source <ExternalLink size={14} aria-hidden="true" />
              </a>
            </article>
          ))}
        </section>
      </aside>

      <section className="map-workspace" aria-label="Map workspace">
        <div className="map-toolbar">
          <div>
            <p className="eyebrow">Layer</p>
            <strong>{visibleLayers.cases ? "Reported cases" : "Outbreak reports"}</strong>
          </div>
          <div className="layer-toggles" aria-label="Map layers">
            <LayerButton
              active={visibleLayers.cases}
              icon={<Layers size={15} aria-hidden="true" />}
              label="Cases"
              onClick={() => {
                setVisibleLayers((current) => ({ ...current, cases: !current.cases }));
                trackEvent("map_layer_toggle", { layer: "reported_cases" });
              }}
            />
            <LayerButton
              active={visibleLayers.outbreaks}
              icon={<MapPin size={15} aria-hidden="true" />}
              label="Outbreaks"
              onClick={() => {
                setVisibleLayers((current) => ({ ...current, outbreaks: !current.outbreaks }));
                trackEvent("map_layer_toggle", { layer: "outbreak_reports" });
              }}
            />
          </div>
          <div className="toolbar-items">
            <span>
              <Layers size={15} aria-hidden="true" />
              {formatNumber(data.regions.features.length)} regions
            </span>
            <span>
              <Activity size={15} aria-hidden="true" />
              {formatNumber(data.outbreaks.features.length)} outbreak reports
            </span>
          </div>
        </div>

        <div className="map-stage">
          <HantaMap
            data={data}
            visibleLayers={visibleLayers}
            onSelectRegion={(region) => {
              setSelectedRegion(region);
              trackEvent("region_select", {
                region_code: region.properties.region_code,
                source: region.properties.sources.join(","),
              });
            }}
          />
          <RegionPanel region={selectedRegion} generatedAt={data.regions.generated_at ?? data.summary.generated_at} />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
  dataRef.current = data;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
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
      zoom: 1.7,
      minZoom: 1,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("regions", { type: "geojson", data: renderableRegions(dataRef.current.regions) });
      map.addSource("outbreaks", { type: "geojson", data: renderableOutbreaks(dataRef.current.outbreaks) });
      map.addLayer({
        id: "region-cases",
        type: "circle",
        source: "regions",
        layout: { visibility: visibleLayers.cases ? "visible" : "none" },
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "confirmed_cases"], 0],
            0,
            "#5b8def",
            100,
            "#f2b84b",
            800,
            "#c74343",
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
          "circle-opacity": 0.78,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "outbreak-points",
        type: "circle",
        source: "outbreaks",
        layout: { visibility: visibleLayers.outbreaks ? "visible" : "none" },
        paint: {
          "circle-color": "#201f2f",
          "circle-radius": 8,
          "circle-opacity": 0.86,
          "circle-stroke-color": "#f2b84b",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "region-cases", (event) => {
        const featureId = event.features?.[0]?.id;
        const region = dataRef.current.regions.features.find((item) => item.id === featureId);
        if (region) onSelectRegion(region);
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

      map.on("mouseenter", "region-cases", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "region-cases", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "outbreak-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "outbreak-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onSelectRegion]);

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

  return <div className="map-container" ref={containerRef} />;
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
      <p className="freshness">Updated {formatDate(generatedAt)}</p>
    </aside>
  );
}
