from fastapi.testclient import TestClient
import orjson

from services.map_api.main import app as map_app
from services.news_service.main import app as news_app
from services.news_service.main import settings as news_settings
from shared.observability.logging import JsonLogFormatter
from shared.storage import S3Storage

PUBLIC_ARTIFACTS = {
    "manifests/latest.json": {
        "generated_at": "2026-05-12T00:00:00+00:00",
        "sources": [{"source": "cdc"}, {"source": "who"}],
        "artifacts": [],
    },
    "manual/news/items.json": {
        "generated_at": "2026-05-12T12:00:00+00:00",
        "items": [
            {
                "id": "manual-test",
                "source": "manual",
                "source_url": "https://example.com/manual-hantavirus-note",
                "published_at": "2026-05-12T12:00:00Z",
                "fetched_at": "2026-05-12T12:00:00Z",
                "title": "Manual editorial update",
                "summary": "Admin-created note.",
                "tags": ["manual", "editorial"],
                "related_region_codes": ["US-AZ"],
                "related_outbreak_ids": [],
                "language": "ru",
                "confidence": "secondary_verified",
            }
        ],
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
    patch_artifacts(monkeypatch)

    response = TestClient(map_app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["s3"] == "ok"
    assert response.json()["latest_manifest"] == "2026-05-12T00:00:00Z"


def test_map_api_metadata(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    response = TestClient(map_app).get("/v1/metadata")

    assert response.status_code == 200
    assert response.json()["sources"] == ["cdc", "who"]
    assert response.json()["latest_manifest"] == "2026-05-12T00:00:00Z"


def test_map_api_public_artifact_endpoints(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(map_app)

    assert client.get("/v1/map/regions").json()["features"][0]["id"] == "US-AZ"
    assert client.get("/v1/map/outbreaks").json()["features"] == []
    assert client.get("/v1/stats/summary").json()["reported_cases_total"] == 10
    assert client.get("/v1/stats/summary").json()["news_items"] == 3
    assert client.get("/v1/stats/timeline").json()["items"][0]["year"] == 2023
    assert client.get("/v1/sources").json()["sources"][0]["source"] == "cdc"


def test_news_service_health(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    response = TestClient(news_app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["s3"] == "ok"
    assert response.json()["latest_manifest"] == "2026-05-12T00:00:00Z"


def test_news_service_feed(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    response = TestClient(news_app).get("/v1/news")

    assert response.status_code == 200
    assert response.json()[0]["id"] == "manual-test"


def test_news_service_feed_filters(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(news_app)

    assert [item["id"] for item in client.get("/v1/news?limit=1").json()] == ["manual-test"]
    assert [item["id"] for item in client.get("/v1/news?tag=editorial").json()] == ["manual-test"]
    assert [item["id"] for item in client.get("/v1/news?tag=surveillance").json()] == ["cdc-test"]
    assert [item["id"] for item in client.get("/v1/news?source=who").json()] == ["who-test"]


def test_news_service_item_and_tags(monkeypatch) -> None:
    patch_artifacts(monkeypatch)

    client = TestClient(news_app)

    assert client.get("/v1/news/who-test").json()["title"] == "Test news"
    assert client.get("/v1/news/manual-test").json()["title"] == "Manual editorial update"
    assert client.get("/v1/news/tags").json() == [
        "editorial",
        "hantavirus",
        "manual",
        "official",
        "surveillance",
    ]
    assert client.get("/v1/news/missing").status_code == 404


def test_admin_news_requires_token(monkeypatch) -> None:
    patch_artifacts(monkeypatch)
    monkeypatch.setattr(news_settings, "news_admin_api_token", "secret")

    response = TestClient(news_app).get("/v1/admin/news")

    assert response.status_code == 401


def test_admin_news_create_and_delete(monkeypatch) -> None:
    patch_artifacts(monkeypatch)
    monkeypatch.setattr(news_settings, "news_admin_api_token", "secret")
    writes = []
    monkeypatch.setattr(S3Storage, "put_json", lambda self, key, payload: writes.append((key, payload)))
    client = TestClient(news_app)

    create_response = client.post(
        "/v1/admin/news",
        headers={"Authorization": "Bearer secret"},
        json={
            "title": "Региональное обновление",
            "summary": "Ручная новость для ленты.",
            "source_url": "https://example.com/regional-update",
            "tags": ["manual", "Russia", "manual"],
            "related_region_codes": ["ru-mow"],
        },
    )

    assert create_response.status_code == 201
    assert create_response.json()["source"] == "manual"
    assert create_response.json()["tags"] == ["manual", "russia"]
    assert writes[-1][0] == "manual/news/items.json"
    created_id = create_response.json()["id"]

    monkeypatch.setattr(
        S3Storage,
        "get_json",
        lambda self, key: {**PUBLIC_ARTIFACTS["manual/news/items.json"], "items": writes[-1][1]["items"]}
        if key == "manual/news/items.json"
        else PUBLIC_ARTIFACTS[key],
    )
    delete_response = client.delete(
        f"/v1/admin/news/{created_id}",
        headers={"X-Admin-Token": "secret"},
    )

    assert delete_response.status_code == 204
    assert writes[-1][1]["items"][0]["id"] == "manual-test"


def test_api_access_log_is_structured_json(monkeypatch, caplog) -> None:
    monkeypatch.setattr(S3Storage, "bucket_available", lambda self: True)

    with caplog.at_level("INFO", logger="orthohantavirus.access"):
        response = TestClient(map_app).get("/health")

    assert response.status_code == 200
    records = [record for record in caplog.records if getattr(record, "event", None) == "request_finished"]
    assert records
    payload = orjson.loads(JsonLogFormatter().format(records[-1]))
    assert payload["event"] == "request_finished"
    assert payload["method"] == "GET"
    assert payload["path"] == "/health"
    assert payload["status_code"] == 200
    assert payload["service"] == "orthohantavirus-service"
    assert "duration_ms" in payload
