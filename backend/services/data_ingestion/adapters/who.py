from datetime import UTC, datetime
from html.parser import HTMLParser
import re
from typing import Any

import httpx

from services.data_ingestion.adapters.base import RawArtifact, SourceRunResult
from shared.contracts import (
    EventLocation,
    GeoPrecision,
    NewsItem,
    OutbreakEvent,
    SourceConfidence,
)


WHO_DON_API_URL = "https://www.who.int/api/hubs/diseaseoutbreaknews"
WHO_DON_PAGE_BASE_URL = "https://www.who.int/emergencies/disease-outbreak-news/item"

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
}

HANTAVIRUS_TITLE_TERMS = (
    "hantavirus",
    "seoul virus",
    "haemorrhagic fever with renal syndrome",
    "hemorrhagic fever with renal syndrome",
)
HANTAVIRUS_BODY_TERMS = (
    "hantavirus pulmonary syndrome",
    "hantavirus disease",
    "hantavirus infection",
    "confirmed hantavirus",
    "haemorrhagic fever with renal syndrome",
    "hemorrhagic fever with renal syndrome",
)
INCIDENTAL_MENTION_TERMS = (
    "negative: ebola, hantavirus",
    "negative for hantavirus",
    "differential diagnosis",
)


class WhoDiseaseOutbreakNewsAdapter:
    source = "who"

    def __init__(self, client: httpx.Client | None = None, max_items: int = 20) -> None:
        self.client = client or httpx.Client(timeout=30, follow_redirects=True)
        self.max_items = max_items

    def run(self) -> SourceRunResult:
        fetched_at = datetime.now(UTC)
        params = {
            "$filter": "contains(tolower(Title),'hantavirus') "
            "or contains(tolower(Summary),'hantavirus') "
            "or contains(tolower(Overview),'hantavirus') "
            "or contains(tolower(Overview),'andes virus')",
            "$top": str(self.max_items),
            "$orderby": "PublicationDateAndTime desc",
        }
        response = self.client.get(WHO_DON_API_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        items = [item for item in payload.get("value", []) if is_hantavirus_relevant(item)]

        news = [to_news_item(item, fetched_at=fetched_at) for item in items]
        outbreaks = [to_outbreak_event(item) for item in items]
        return SourceRunResult(
            source=self.source,
            fetched_at=fetched_at,
            raw_artifacts=[
                RawArtifact(
                    key_suffix="who-don-hantavirus.json",
                    content_type="application/json",
                    body=response.content,
                )
            ],
            outbreaks=outbreaks,
            news=news,
            metadata={
                "source_url": str(response.url),
                "record_count": len(items),
            },
        )


def to_news_item(item: dict[str, Any], *, fetched_at: datetime) -> NewsItem:
    source_url = build_don_url(item)
    published_at = parse_datetime(item.get("PublicationDateAndTime"))
    don_id = str(item.get("DonId") or item.get("UrlName") or item.get("Id"))
    summary = strip_html(str(item.get("Summary") or item.get("Overview") or ""))
    return NewsItem(
        id=f"who-{don_id.lower()}",
        source="who",
        source_url=source_url,
        published_at=published_at,
        fetched_at=fetched_at,
        title=str(item.get("Title") or "WHO Disease Outbreak News"),
        summary=summary or None,
        tags=derive_tags(item),
        related_region_codes=[],
        related_outbreak_ids=[f"who-{don_id.lower()}"],
        language="en",
        confidence=SourceConfidence.OFFICIAL,
    )


def is_hantavirus_relevant(item: dict[str, Any]) -> bool:
    title = strip_html(str(item.get("Title") or "")).lower()
    body = " ".join(
        strip_html(str(item.get(field) or ""))
        for field in ["Summary", "Overview", "Epidemiology"]
    ).lower()
    if any(term in title for term in HANTAVIRUS_TITLE_TERMS):
        return True
    if any(term in body for term in INCIDENTAL_MENTION_TERMS):
        return False
    return any(term in body for term in HANTAVIRUS_BODY_TERMS)


def to_outbreak_event(item: dict[str, Any]) -> OutbreakEvent:
    source_url = build_don_url(item)
    don_id = str(item.get("DonId") or item.get("UrlName") or item.get("Id"))
    title = str(item.get("Title") or "WHO Disease Outbreak News")
    text = " ".join(
        strip_html(str(item.get(field) or ""))
        for field in ["Title", "Summary", "Overview", "Epidemiology"]
    )
    confirmed_cases = extract_count(
        text,
        r"(\d+|[A-Za-z]+)\s+(?:laboratory-)?confirmed(?:\s+cases?)?",
    )
    probable_cases = extract_count(text, r"(\d+|[A-Za-z]+)\s+probable cases?")
    deaths = extract_count(text, r"(\d+|[A-Za-z]+)\s+deaths?")

    return OutbreakEvent(
        id=f"who-{don_id.lower()}",
        source="who",
        source_url=source_url,
        title=title,
        status="active",
        pathogen="andes_orthohantavirus" if "andes" in text.lower() else "hantavirus",
        started_at=None,
        reported_at=parse_datetime(item.get("PublicationDateAndTime")).date()
        if parse_datetime(item.get("PublicationDateAndTime"))
        else None,
        locations=[
            EventLocation(
                label=extract_location_label(title),
                country_code=None,
                lat=None,
                lon=None,
                precision=GeoPrecision.EVENT,
            )
        ],
        confirmed_cases=confirmed_cases,
        probable_cases=probable_cases,
        deaths=deaths,
        confidence=SourceConfidence.OFFICIAL,
        summary=strip_html(str(item.get("Summary") or item.get("Overview") or "")) or None,
    )


def build_don_url(item: dict[str, Any]) -> str:
    url_name = str(item.get("UrlName") or item.get("ItemDefaultUrl") or "").strip("/")
    if url_name:
        return f"{WHO_DON_PAGE_BASE_URL}/{url_name}"
    return "https://www.who.int/emergencies/disease-outbreak-news"


def parse_datetime(value: object) -> datetime | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    return datetime.fromisoformat(text)


def derive_tags(item: dict[str, Any]) -> list[str]:
    text = " ".join(str(item.get(field) or "") for field in ["Title", "Summary", "Overview"]).lower()
    tags = ["official", "outbreak"]
    if "hantavirus" in text:
        tags.append("hantavirus")
    if "andes" in text:
        tags.append("andes-virus")
    return tags


def extract_location_label(title: str) -> str:
    if "," in title:
        return title.rsplit(",", maxsplit=1)[-1].strip()
    return "Location not specified"


def extract_count(text: str, pattern: str) -> int | None:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    raw = match.group(1).lower()
    if raw.isdigit():
        return int(raw)
    return NUMBER_WORDS.get(raw)


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(data.strip())


def strip_html(value: str) -> str:
    parser = _TextExtractor()
    parser.feed(value)
    if parser.parts:
        return " ".join(parser.parts)
    return re.sub(r"\s+", " ", value).strip()
