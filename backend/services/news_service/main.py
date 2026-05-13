from datetime import UTC, datetime
from html import escape
import re
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import Field, HttpUrl

from shared.config import get_settings
from shared.contracts import HealthResponse, NewsItem, SourceConfidence
from shared.contracts.models import ProjectModel
from shared.news_store import (
    load_manual_news_items,
    load_merged_news_items,
    save_manual_news_items,
)
from shared.observability import configure_json_logging, install_access_log_middleware
from shared.public_artifacts import latest_manifest_generated_at
from shared.seo import canonical_url, format_human_date, html_document, localized_path, normalize_locale, slug
from shared.storage import S3Storage

settings = get_settings()
configure_json_logging(settings)

app = FastAPI(title="Orthohantavirus News Service", version="0.1.0")
install_access_log_middleware(app, settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class ManualNewsCreate(ProjectModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str | None = Field(default=None, max_length=3000)
    source_url: HttpUrl
    published_at: datetime | None = None
    tags: list[str] = Field(default_factory=list, max_length=12)
    related_region_codes: list[str] = Field(default_factory=list, max_length=12)
    language: str = Field(default="ru", min_length=2, max_length=8)


def require_admin_access(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_token: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.news_admin_api_token
    if not expected:
        raise HTTPException(status_code=503, detail="Admin news API token is not configured")

    supplied = None
    if authorization and authorization.lower().startswith("bearer "):
        supplied = authorization[7:].strip()
    elif x_admin_token:
        supplied = x_admin_token.strip()

    if supplied is None or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid admin token")


def manual_news_id(title: str, now: datetime) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if not slug:
        slug = "news"
    return f"manual-{now.strftime('%Y%m%d%H%M%S')}-{slug[:48]}"


def clean_tags(tags: list[str]) -> list[str]:
    cleaned = []
    for tag in tags:
        value = tag.strip().lower()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned or ["manual"]


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


@app.get("/v1/news", response_model=list[NewsItem])
def news_feed(
    limit: int = Query(default=50, ge=1, le=100),
    tag: str | None = None,
    source: str | None = None,
    lang: str | None = None,
) -> list[NewsItem]:
    _ = normalize_locale(lang)
    items = load_merged_news_items(S3Storage(settings))
    if tag is not None:
        items = [item for item in items if tag in item.tags]
    if source is not None:
        items = [item for item in items if item.source == source]
    return items[:limit]


@app.get("/v1/news/tags", response_model=list[str])
def news_tags() -> list[str]:
    tags: set[str] = set()
    for item in load_merged_news_items(S3Storage(settings)):
        tags.update(item.tags)
    return sorted(tags)


@app.get("/v1/news/{news_id}", response_model=NewsItem)
def news_item(news_id: str) -> NewsItem:
    return find_news_item(news_id)


@app.get("/news/{news_id}", response_class=HTMLResponse)
@app.get("/{locale}/news/{news_id}", response_class=HTMLResponse)
def public_news_page(news_id: str, locale: str = "ru") -> HTMLResponse:
    locale = normalize_locale(locale)
    item = find_news_item(news_id)
    published = format_human_date(item.published_at or item.fetched_at)
    fallback_description = (
        f"Verified {item.source.upper()} update for Orthohantavirus Monitor, published {published}."
        if locale == "en"
        else f"Проверенное обновление {item.source.upper()} для Ортхохантавирус.рф, опубликовано {published}."
    )
    description = item.summary or fallback_description
    country_prefix = "/en/countries" if locale == "en" else "/countries"
    outbreak_prefix = "/en/outbreaks" if locale == "en" else "/outbreaks"
    related_regions = "".join(
        f'<li><a href="{country_prefix}/{slug(region_code)}">{escape(region_code)}</a></li>'
        for region_code in item.related_region_codes
    )
    related_outbreaks = "".join(
        f'<li><a href="{outbreak_prefix}/{slug(outbreak_id)}">{escape(outbreak_id)}</a></li>'
        for outbreak_id in item.related_outbreak_ids
    )
    tags = ", ".join(item.tags) if item.tags else "surveillance"
    if locale == "en":
        body = f"""
            <p><strong>Source:</strong> <a href="{escape(str(item.source_url))}" rel="nofollow noopener">{escape(item.source.upper())}</a></p>
            <p><strong>Published:</strong> <time datetime="{escape(published)}">{escape(published)}</time></p>
            <p><strong>Tags:</strong> {escape(tags)}</p>
            <p>{escape(description)}</p>
            <h2>Related surveillance records</h2>
            <ul>
              {related_regions or '<li><a href="/en/">Open the interactive map</a></li>'}
              {related_outbreaks}
            </ul>
        """
        page_title = f"{item.title} | Orthohantavirus Monitor"
    else:
        body = f"""
            <p><strong>Источник:</strong> <a href="{escape(str(item.source_url))}" rel="nofollow noopener">{escape(item.source.upper())}</a></p>
            <p><strong>Опубликовано:</strong> <time datetime="{escape(published)}">{escape(published)}</time></p>
            <p><strong>Теги:</strong> {escape(tags)}</p>
            <p>{escape(description)}</p>
            <h2>Связанные записи наблюдения</h2>
            <ul>
              {related_regions or '<li><a href="/">Открыть интерактивную карту</a></li>'}
              {related_outbreaks}
            </ul>
        """
        page_title = f"{item.title} | Ортхохантавирус.рф"
    canonical = canonical_url(settings.app_public_base_url, localized_path(f"/news/{news_id}", locale))
    return HTMLResponse(
        html_document(
            title=page_title,
            description=description,
            canonical=canonical,
            h1=item.title,
            body=body,
            locale=locale,
            updated_at=published,
            structured_data={
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": item.title,
                "description": description,
                "datePublished": published,
                "dateModified": format_human_date(item.fetched_at),
                "url": canonical,
                "inLanguage": locale,
                "isAccessibleForFree": True,
                "publisher": {
                    "@type": "Organization",
                    "name": "Ортхохантавирус.рф" if locale == "ru" else "Orthohantavirus Monitor",
                },
            },
        )
    )


def find_news_item(news_id: str) -> NewsItem:
    for item in load_merged_news_items(S3Storage(settings)):
        if item.id == news_id:
            return item
    raise HTTPException(status_code=404, detail="News item not found")


@app.get("/v1/admin/news", response_model=list[NewsItem])
def admin_news(_: Annotated[None, Depends(require_admin_access)]) -> list[NewsItem]:
    return load_manual_news_items(S3Storage(settings))


@app.post("/v1/admin/news", response_model=NewsItem, status_code=status.HTTP_201_CREATED)
def create_admin_news(
    payload: ManualNewsCreate,
    _: Annotated[None, Depends(require_admin_access)],
) -> NewsItem:
    storage = S3Storage(settings)
    items = load_manual_news_items(storage)
    now = datetime.now(UTC)
    item = NewsItem(
        id=manual_news_id(payload.title, now),
        source="manual",
        source_url=payload.source_url,
        published_at=payload.published_at or now,
        fetched_at=now,
        title=payload.title.strip(),
        summary=payload.summary.strip() if payload.summary else None,
        tags=clean_tags(payload.tags),
        related_region_codes=[code.strip().upper() for code in payload.related_region_codes if code.strip()],
        related_outbreak_ids=[],
        language=payload.language.strip().lower(),
        confidence=SourceConfidence.SECONDARY_VERIFIED,
    )
    save_manual_news_items(storage, [item, *items])
    return item


@app.delete("/v1/admin/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_news(
    news_id: str,
    _: Annotated[None, Depends(require_admin_access)],
) -> Response:
    storage = S3Storage(settings)
    items = load_manual_news_items(storage)
    remaining = [item for item in items if item.id != news_id]
    if len(remaining) == len(items):
        raise HTTPException(status_code=404, detail="Manual news item not found")
    save_manual_news_items(storage, remaining)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
