from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from shared.contracts import HealthResponse, MetadataResponse
from shared.observability import configure_json_logging, install_access_log_middleware
from shared.public_artifacts import empty_feature_collection, read_json_artifact
from shared.storage import S3Storage

settings = get_settings()
configure_json_logging(settings)

app = FastAPI(title="Orthohantavirus Map API", version="0.1.0")
install_access_log_middleware(app, settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        latest_manifest=None,
    )


@app.get("/v1/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    manifest = read_json_artifact(S3Storage(settings), "manifests/latest.json", {})
    return MetadataResponse(
        app_env=settings.app_env,
        latest_manifest=None,
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
    return read_json_artifact(
        S3Storage(settings),
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
