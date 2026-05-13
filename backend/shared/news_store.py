from datetime import UTC, datetime
from typing import Any

from shared.contracts import NewsItem
from shared.public_artifacts import read_json_artifact
from shared.storage import S3Storage

PUBLIC_NEWS_KEY = "public/news/latest/feed.json"
MANUAL_NEWS_KEY = "manual/news/items.json"


def sort_news_items(items: list[NewsItem]) -> list[NewsItem]:
    return sorted(items, key=lambda item: item.published_at or item.fetched_at, reverse=True)


def load_official_news_items(storage: S3Storage) -> list[NewsItem]:
    feed = read_json_artifact(storage, PUBLIC_NEWS_KEY, {"items": []})
    return parse_news_items(feed.get("items", []) if isinstance(feed, dict) else [])


def load_manual_news_items(storage: S3Storage) -> list[NewsItem]:
    feed = read_json_artifact(storage, MANUAL_NEWS_KEY, {"items": []})
    return parse_news_items(feed.get("items", []) if isinstance(feed, dict) else [])


def load_merged_news_items(storage: S3Storage) -> list[NewsItem]:
    items_by_id: dict[str, NewsItem] = {}
    for item in load_official_news_items(storage) + load_manual_news_items(storage):
        items_by_id[item.id] = item
    return sort_news_items(list(items_by_id.values()))


def save_manual_news_items(storage: S3Storage, items: list[NewsItem]) -> None:
    storage.put_json(
        MANUAL_NEWS_KEY,
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "items": [item.model_dump(mode="json") for item in sort_news_items(items)],
        },
    )


def parse_news_items(items: Any) -> list[NewsItem]:
    if not isinstance(items, list):
        return []
    parsed: list[NewsItem] = []
    for item in items:
        try:
            parsed.append(NewsItem.model_validate(item))
        except ValueError:
            continue
    return parsed
