from datetime import UTC, date, datetime

from services.data_ingestion.adapters import SourceRunResult
from services.data_ingestion.projections import build_public_artifacts
from shared.contracts import CaseAggregate, GeoPrecision, NewsItem, SourceConfidence


def test_build_public_artifacts() -> None:
    fetched_at = datetime(2026, 5, 12, tzinfo=UTC)
    result = SourceRunResult(
        source="cdc",
        fetched_at=fetched_at,
        cases=[
            CaseAggregate(
                id="cdc-us-az-1993-2023-hantavirus",
                source="cdc",
                source_url="https://www.cdc.gov/hantavirus/data-research/cases/index.html",
                country_code="US",
                admin1_code="US-AZ",
                admin2_code=None,
                location_label="Arizona",
                geo_precision=GeoPrecision.ADMIN1,
                disease="hantavirus_disease",
                clinical_form="hps_or_non_hps",
                period_start=date(1993, 1, 1),
                period_end=date(2023, 12, 31),
                confirmed_cases=10,
                probable_cases=None,
                deaths=3,
                confidence=SourceConfidence.OFFICIAL,
                updated_at=fetched_at,
            )
        ],
        news=[
            NewsItem(
                id="who-test",
                source="who",
                source_url="https://www.who.int/emergencies/disease-outbreak-news",
                published_at=fetched_at,
                fetched_at=fetched_at,
                title="Test item",
                summary="Test summary",
                tags=["official"],
                confidence=SourceConfidence.OFFICIAL,
            )
        ],
    )

    artifacts = build_public_artifacts([result], generated_at=fetched_at)

    assert "manifests/latest.json" in artifacts
    assert artifacts["public/stats/latest/summary.json"]["reported_cases_total"] == 10
    feature = artifacts["public/map/latest/regions.geojson"]["features"][0]
    assert feature["id"] == "US-AZ"
    assert feature["geometry"]["type"] == "Point"
    assert artifacts["public/news/latest/feed.json"]["items"][0]["id"] == "who-test"
