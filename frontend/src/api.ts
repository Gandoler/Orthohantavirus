export type RegionFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: {
    region_code: string;
    label: string;
    geo_precision: string;
    confirmed_cases: number;
    deaths: number | null;
    sources: string[];
    confidence: string[];
    period_start: string;
    period_end: string;
    data_type: string;
  };
};

export type FeatureCollection<TFeature> = {
  type: "FeatureCollection";
  generated_at?: string;
  features: TFeature[];
};

export type OutbreakFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: {
    title: string;
    source: string;
    source_url: string;
    status: string;
    pathogen: string | null;
    reported_at: string | null;
    confirmed_cases: number | null;
    probable_cases: number | null;
    deaths: number | null;
    confidence: string;
    location_label: string | null;
    data_type: string;
  };
};

export type Summary = {
  generated_at?: string;
  sources: string[];
  reported_case_records: number;
  reported_cases_total: number;
  reported_deaths_total: number;
  outbreak_events: number;
  news_items: number;
};

export type NewsItem = {
  id: string;
  source: string;
  source_url: string;
  published_at: string | null;
  fetched_at: string;
  title: string;
  summary: string | null;
  tags: string[];
  related_region_codes: string[];
  related_outbreak_ids: string[];
  language: string;
  confidence: string;
};

export type AppData = {
  regions: FeatureCollection<RegionFeature>;
  outbreaks: FeatureCollection<OutbreakFeature>;
  summary: Summary;
  news: NewsItem[];
};

export const mapApiBaseUrl = import.meta.env.VITE_MAP_API_BASE_URL ?? "http://localhost:8000";
export const newsApiBaseUrl = import.meta.env.VITE_NEWS_API_BASE_URL ?? "http://localhost:8001";

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function loadAppData(): Promise<AppData> {
  const [regions, outbreaks, summary, news] = await Promise.all([
    fetchJson<FeatureCollection<RegionFeature>>(`${mapApiBaseUrl}/v1/map/regions`),
    fetchJson<FeatureCollection<OutbreakFeature>>(`${mapApiBaseUrl}/v1/map/outbreaks`),
    fetchJson<Summary>(`${mapApiBaseUrl}/v1/stats/summary`),
    fetchJson<NewsItem[]>(`${newsApiBaseUrl}/v1/news`),
  ]);

  return { regions, outbreaks, summary, news };
}
