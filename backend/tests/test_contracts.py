from shared.config import Settings
from shared.contracts import HealthResponse


def test_health_response_contract() -> None:
    response = HealthResponse(
        status="ok",
        service="map-api",
        app_env="test",
        s3="ok",
        latest_manifest=None,
    )

    assert response.status == "ok"
    assert response.service == "map-api"


def test_settings_parse_cors_origins() -> None:
    assert Settings(cors_allow_origins="https://a.example, https://b.example").cors_origins == [
        "https://a.example",
        "https://b.example",
    ]
    assert Settings(cors_allow_origins="").cors_origins == ["*"]
