from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from shared.contracts import HealthResponse, NewsItem
from shared.public_artifacts import read_json_artifact
from shared.storage import S3Storage

app = FastAPI(title="Orthohantavirus News Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    storage = S3Storage(settings)
    return HealthResponse(
        status="ok",
        service=settings.service_name,
        app_env=settings.app_env,
        s3="ok" if storage.bucket_available() else "unavailable",
        latest_manifest=None,
    )


@app.get("/v1/news", response_model=list[NewsItem])
def news_feed(
    limit: int = Query(default=50, ge=1, le=100),
    tag: str | None = None,
    source: str | None = None,
) -> list[NewsItem]:
    feed = read_json_artifact(S3Storage(get_settings()), "public/news/latest/feed.json", {"items": []})
    items = feed.get("items", [])
    if tag is not None:
        items = [item for item in items if tag in item.get("tags", [])]
    if source is not None:
        items = [item for item in items if item.get("source") == source]
    return items[:limit]


@app.get("/v1/news/tags", response_model=list[str])
def news_tags() -> list[str]:
    feed = read_json_artifact(S3Storage(get_settings()), "public/news/latest/feed.json", {"items": []})
    tags: set[str] = set()
    for item in feed.get("items", []):
        tags.update(item.get("tags", []))
    return sorted(tags)


@app.get("/v1/news/{news_id}", response_model=NewsItem)
def news_item(news_id: str) -> NewsItem:
    feed = read_json_artifact(S3Storage(get_settings()), "public/news/latest/feed.json", {"items": []})
    for item in feed.get("items", []):
        if item.get("id") == news_id:
            return item
    raise HTTPException(status_code=404, detail="News item not found")
