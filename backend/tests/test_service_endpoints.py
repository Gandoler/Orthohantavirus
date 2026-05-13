from fastapi.testclient import TestClient

from services.map_api.main import app as map_app
from services.news_service.main import app as news_app
from shared.storage import S3Storage

PUBLIC_ARTIFACTS = {
    "manifests/latest.json": {
        "sources": [{"source": "cdc"}, {"source": "who"}],
        "artifacts": [],
    },
    "public/map/latest/regions.geojson": {
        "type": "FeatureCollection",
        "features": [{"type": "Feature", "id": "US-AZ", "geometry": None, "properties": {}}],
    },
    "public/map/latest/outbreaks.geojson": {"type": "FeatureCollection", "features": []},
    "public/stats/latest/summary.json": {
        "sources": ["cdc", "who"],
        "reported_cases_total": 10,
        "reported_deaths_total": 2,
        "reported_case_records": 1,
        "outbreak_events": 0,
        "news_items": 1,
    },
    "public/timeline/latest/cases.json": {
        "items": [{"year": 2023, "source": "cdc", "confirmed_cases": 10}]
    },
    "public/news/latest/feed.json": {
        "items": [
            {
                "id": "who-test",
                "source": "who",
                "source_url": "https://www.who.int/emergencies/disease-outbreak-news",
                "published_at": "2026-05-08T18:00:00Z",
                "fetched_at": "2026-05-12T00:00:00Z",
                "title": "Test news",
                "summary": "Summary",
                "tags": ["official", "hantavirus"],
                "related_region_codes": [],
                "related_outbreak_ids": [],
                "language": "en",
                "confidence": "official",
            },
            {
                "id": "cdc-test",
                "source": "cdc",
                "source_url": "https://www.cdc.gov/hantavirus/",
                "published_at": "2025-01-01T00:00:00Z",
                "fetched_at": "2026-05-12T00:00:00Z",
                "title": "CDC update",
                "summary": "CDC summary",
                "tags": ["official", "surveillance"],
                "related_region_codes": [],
                "related_outbreak_ids": [],
                "language": "en",
                "confidence": "official",
            }
        ]
    },
}


def patch_artifacts(monkeypatch) -> None:
    monkeypatch.setattr(S3Storage, "bucket_available", lambda self: True)
    monkeypatch.setattr(S3Storage, "get_json", lambda self, key: PUBLIC_ARTIFACTS[key])


def test_map_api_health(monkeypatch) -> None:
    monkeypatch.setattr(S3Storage, "bucket_available", lambda self: True)

    response = TestClient(map_app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["s3"] == "ok"


def test_map_api_metadata(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    response = TestClient(map_app).get("/v1/metadata")

    assert response.status_code == 200
    assert response.json()["sources"] == ["cdc", "who"]


def test_map_api_public_artifact_endpoints(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(map_app)

    assert client.get("/v1/map/regions").json()["features"][0]["id"] == "US-AZ"
    assert client.get("/v1/map/outbreaks").json()["features"] == []
    assert client.get("/v1/stats/summary").json()["reported_cases_total"] == 10
    assert client.get("/v1/stats/timeline").json()["items"][0]["year"] == 2023
    assert client.get("/v1/sources").json()["sources"][0]["source"] == "cdc"


def test_news_service_health(monkeypatch) -> None:
    monkeypatch.setattr(S3Storage, "bucket_available", lambda self: True)

    response = TestClient(news_app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["s3"] == "ok"


def test_news_service_feed(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    response = TestClient(news_app).get("/v1/news")

    assert response.status_code == 200
    assert response.json()[0]["id"] == "who-test"


def test_news_service_feed_filters(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(news_app)

    assert [item["id"] for item in client.get("/v1/news?limit=1").json()] == ["who-test"]
    assert [item["id"] for item in client.get("/v1/news?tag=surveillance").json()] == ["cdc-test"]
    assert [item["id"] for item in client.get("/v1/news?source=who").json()] == ["who-test"]


def test_news_service_item_and_tags(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(news_app)

    assert client.get("/v1/news/who-test").json()["title"] == "Test news"
    assert client.get("/v1/news/tags").json() == ["hantavirus", "official", "surveillance"]
    assert client.get("/v1/news/missing").status_code == 404
