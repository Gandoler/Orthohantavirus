from html import escape
from typing import Any

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from shared.config import get_settings
from shared.contracts import HealthResponse, MetadataResponse
from shared.news_store import load_merged_news_items
from shared.observability import configure_json_logging, install_access_log_middleware
from shared.public_artifacts import (
    empty_feature_collection,
    latest_manifest_generated_at,
    read_json_artifact,
)
from shared.seo import canonical_url, format_human_date, html_document, slug, xml_sitemap
from shared.storage import S3Storage

settings = get_settings()
configure_json_logging(settings)

app = FastAPI(title="Orthohantavirus Map API", version="0.1.0")
install_access_log_middleware(app, settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    storage = S3Storage(settings)
    return HealthResponse(
        status="ok",
        service=settings.service_name,
        app_env=settings.app_env,
        s3="ok" if storage.bucket_available() else "unavailable",
        latest_manifest=latest_manifest_generated_at(storage),
    )


@app.get("/v1/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    storage = S3Storage(settings)
    manifest = read_json_artifact(storage, "manifests/latest.json", {})
    return MetadataResponse(
        app_env=settings.app_env,
        latest_manifest=latest_manifest_generated_at(storage),
        sources=[source["source"] for source in manifest.get("sources", [])],
        notes=[] if manifest else ["No public ingestion manifest has been published yet."],
    )


@app.get("/v1/map/regions")
def map_regions() -> dict:
    return read_json_artifact(
        S3Storage(settings),
        "public/map/latest/regions.geojson",
        empty_feature_collection(),
    )


@app.get("/v1/map/outbreaks")
def map_outbreaks() -> dict:
    return read_json_artifact(
        S3Storage(settings),
        "public/map/latest/outbreaks.geojson",
        empty_feature_collection(),
    )


@app.get("/v1/stats/summary")
def stats_summary() -> dict:
    storage = S3Storage(settings)
    summary = read_json_artifact(
        storage,
        "public/stats/latest/summary.json",
        {
            "sources": [],
            "reported_case_records": 0,
            "reported_cases_total": 0,
            "reported_deaths_total": 0,
            "outbreak_events": 0,
            "news_items": 0,
        },
    )
    summary["news_items"] = len(load_merged_news_items(storage))
    return summary


@app.get("/v1/stats/timeline")
def stats_timeline() -> dict:
    return read_json_artifact(
        S3Storage(settings),
        "public/timeline/latest/cases.json",
        {"items": []},
    )


@app.get("/v1/sources")
def sources() -> dict:
    manifest = read_json_artifact(S3Storage(settings), "manifests/latest.json", {"sources": []})
    return {"sources": manifest.get("sources", [])}


@app.get("/countries/{country_code}", response_class=HTMLResponse)
def country_page(country_code: str) -> HTMLResponse:
    storage = S3Storage(settings)
    regions = read_json_artifact(storage, "public/map/latest/regions.geojson", empty_feature_collection())
    feature = find_feature(regions, country_code)
    properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
    label = str(properties.get("label") or feature.get("id") or country_code).strip()
    region_code = str(properties.get("region_code") or feature.get("id") or country_code).strip()
    confirmed_cases = int(properties.get("confirmed_cases") or 0)
    deaths = properties.get("deaths")
    sources = properties.get("sources") if isinstance(properties.get("sources"), list) else []
    source_text = ", ".join(str(source).upper() for source in sources) or "public health sources"
    period_end = format_human_date(properties.get("period_end"))
    related_news = load_related_news(storage, region_code=region_code)
    related_links = "".join(
        f'<li><a href="/news/{slug(item.id)}">{escape(item.title)}</a></li>' for item in related_news[:8]
    )
    description = (
        f"{label} surveillance summary with {confirmed_cases} reported hantavirus cases, "
        f"source attribution, related updates, and latest data freshness."
    )
    body = f"""
        <p><strong>Region code:</strong> {escape(region_code)}</p>
        <p><strong>Reported cases:</strong> {confirmed_cases}</p>
        <p><strong>Deaths:</strong> {escape(str(deaths if deaths is not None else "not reported"))}</p>
        <p><strong>Sources:</strong> {escape(source_text)}</p>
        <p><strong>Reporting period end:</strong> {escape(period_end)}</p>
        <h2>Related updates</h2>
        <ul>{related_links or '<li><a href="/">Open the interactive map</a></li>'}</ul>
    """
    canonical = canonical_url(settings.app_public_base_url, f"/countries/{region_code}")
    return HTMLResponse(
        html_document(
            title=f"{label} hantavirus surveillance | Orthohantavirus Monitor",
            description=description,
            canonical=canonical,
            h1=f"{label} hantavirus surveillance",
            body=body,
            updated_at=period_end if period_end != "unknown" else None,
            structured_data={
                "@context": "https://schema.org",
                "@type": "Dataset",
                "name": f"{label} hantavirus surveillance",
                "description": description,
                "url": canonical,
                "dateModified": period_end,
                "creator": {
                    "@type": "Organization",
                    "name": "Orthohantavirus Monitor",
                },
            },
        )
    )


@app.get("/outbreaks/{outbreak_id}", response_class=HTMLResponse)
def outbreak_page(outbreak_id: str) -> HTMLResponse:
    storage = S3Storage(settings)
    outbreaks = read_json_artifact(storage, "public/map/latest/outbreaks.geojson", empty_feature_collection())
    feature = find_feature(outbreaks, outbreak_id)
    properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
    title = str(properties.get("title") or feature.get("id") or outbreak_id).strip()
    reported_at = format_human_date(properties.get("reported_at"))
    source_url = str(properties.get("source_url") or "")
    source = str(properties.get("source") or "source").upper()
    cases = properties.get("confirmed_cases")
    deaths = properties.get("deaths")
    location = str(properties.get("location_label") or "reported location")
    description = (
        f"{title}: verified outbreak report for {location}, with cases, deaths, source, and map links."
    )
    body = f"""
        <p><strong>Status:</strong> {escape(str(properties.get("status") or "unknown"))}</p>
        <p><strong>Location:</strong> {escape(location)}</p>
        <p><strong>Reported:</strong> <time datetime="{escape(reported_at)}">{escape(reported_at)}</time></p>
        <p><strong>Confirmed cases:</strong> {escape(str(cases if cases is not None else "not reported"))}</p>
        <p><strong>Deaths:</strong> {escape(str(deaths if deaths is not None else "not reported"))}</p>
        <p><strong>Source:</strong> <a href="{escape(source_url)}" rel="nofollow noopener">{escape(source)}</a></p>
        <h2>Follow-up</h2>
        <ul>
          <li><a href="/">Open this outbreak on the interactive map</a></li>
          <li><a href="/data-sources/">Review data sources and confidence levels</a></li>
        </ul>
    """
    canonical = canonical_url(settings.app_public_base_url, f"/outbreaks/{outbreak_id}")
    return HTMLResponse(
        html_document(
            title=f"{title} | Orthohantavirus Monitor",
            description=description,
            canonical=canonical,
            h1=title,
            body=body,
            updated_at=reported_at if reported_at != "unknown" else None,
            structured_data={
                "@context": "https://schema.org",
                "@type": "SpecialAnnouncement",
                "name": title,
                "text": description,
                "datePosted": reported_at,
                "url": canonical,
                "category": "https://www.wikidata.org/wiki/Q735",
            },
        )
    )


@app.get("/sitemap.xml")
def sitemap() -> Response:
    storage = S3Storage(settings)
    manifest_updated_at = latest_manifest_generated_at(storage)
    default_lastmod = format_human_date(manifest_updated_at) if manifest_updated_at else None
    paths: list[tuple[str, str | None]] = [
        ("/", default_lastmod),
        ("/about/", default_lastmod),
        ("/methodology/", default_lastmod),
        ("/data-sources/", default_lastmod),
    ]

    regions = read_json_artifact(storage, "public/map/latest/regions.geojson", empty_feature_collection())
    for feature in feature_items(regions):
        properties = feature.get("properties", {})
        region_code = str(properties.get("region_code") or feature.get("id") or "").strip()
        if region_code:
            paths.append((f"/countries/{slug(region_code)}", format_human_date(properties.get("period_end"))))

    outbreaks = read_json_artifact(storage, "public/map/latest/outbreaks.geojson", empty_feature_collection())
    for feature in feature_items(outbreaks):
        outbreak_id = str(feature.get("id") or "").strip()
        if outbreak_id:
            paths.append((f"/outbreaks/{slug(outbreak_id)}", format_human_date(feature.get("properties", {}).get("reported_at"))))

    for item in load_merged_news_items(storage):
        paths.append((f"/news/{slug(item.id)}", format_human_date(item.published_at or item.fetched_at)))

    return Response(
        content=xml_sitemap(settings.app_public_base_url, paths),
        media_type="application/xml",
    )


def feature_items(collection: Any) -> list[dict[str, Any]]:
    if not isinstance(collection, dict):
        return []
    features = collection.get("features")
    if not isinstance(features, list):
        return []
    return [feature for feature in features if isinstance(feature, dict)]


def find_feature(collection: Any, feature_id: str) -> dict[str, Any]:
    expected = feature_id.strip().lower()
    for feature in feature_items(collection):
        properties = feature.get("properties", {}) if isinstance(feature.get("properties"), dict) else {}
        candidates = [
            str(feature.get("id") or ""),
            str(properties.get("region_code") or ""),
            str(properties.get("country_code") or ""),
        ]
        if any(candidate.lower() == expected for candidate in candidates):
            return feature
    raise HTTPException(status_code=404, detail="Surveillance page not found")


def load_related_news(storage: S3Storage, *, region_code: str) -> list:
    return [
        item
        for item in load_merged_news_items(storage)
        if region_code in item.related_region_codes
    ]
