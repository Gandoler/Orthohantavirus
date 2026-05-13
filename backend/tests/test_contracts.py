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
