import json
from datetime import UTC, datetime
from pathlib import Path

from services.data_ingestion.adapters.cdc import parse_cdc_by_year_records
from services.data_ingestion.adapters.ecdc import parse_ecdc_table_text
from services.data_ingestion.adapters.who import is_hantavirus_relevant, to_news_item, to_outbreak_event


FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_cdc_by_year_records() -> None:
    payload = json.loads((FIXTURES / "cdc_by_year_sample.json").read_text())

    cases, warnings = parse_cdc_by_year_records(
        payload["Data"],
        fetched_at=datetime(2026, 5, 12, tzinfo=UTC),
    )

    assert warnings == []
    assert len(cases) == 2
    arizona = next(record for record in cases if record.admin1_code == "US-AZ")
    assert arizona.confirmed_cases == 3
    assert arizona.deaths == 2
    assert arizona.period_start.year == 1993
    assert arizona.period_end.year == 2023


def test_who_news_item_from_don_api_record() -> None:
    item = json.loads((FIXTURES / "who_don_hantavirus_sample.json").read_text())["value"][0]

    news = to_news_item(item, fetched_at=datetime(2026, 5, 12, tzinfo=UTC))

    assert news.id == "who-2026-don600"
    assert str(news.source_url).endswith("/2026-DON600")
    assert "hantavirus" in news.tags
    assert "andes-virus" in news.tags


def test_who_outbreak_event_from_don_api_record() -> None:
    item = json.loads((FIXTURES / "who_don_hantavirus_sample.json").read_text())["value"][0]

    outbreak = to_outbreak_event(item)

    assert outbreak.id == "who-2026-don600"
    assert outbreak.confirmed_cases == 6
    assert outbreak.probable_cases == 2
    assert outbreak.deaths == 3
    assert outbreak.pathogen == "andes_orthohantavirus"
    assert outbreak.reported_at.isoformat() == "2026-05-08"


def test_who_relevance_filter_excludes_incidental_mentions() -> None:
    assert is_hantavirus_relevant(
        {
            "Title": "Yellow fever - Brazil",
            "Summary": "Samples were tested for differential diagnosis, including dengue and hantavirus.",
            "Overview": "",
        }
    ) is False
    assert is_hantavirus_relevant(
        {
            "Title": "Haemorrhagic fever in Kosovo",
            "Summary": "Laboratory tests confirm hantavirus infection.",
            "Overview": "",
        }
    ) is True


def test_parse_ecdc_table_text() -> None:
    text = (FIXTURES / "ecdc_table_text_sample.txt").read_text()

    cases, warnings = parse_ecdc_table_text(
        text,
        fetched_at=datetime(2026, 5, 12, tzinfo=UTC),
    )

    assert len(cases) == 2
    assert any("Denmark" in warning for warning in warnings)
    finland = next(record for record in cases if record.country_code == "FI")
    assert finland.confirmed_cases == 806
    assert finland.geo_precision == "country"
    germany = next(record for record in cases if record.country_code == "DE")
    assert germany.confirmed_cases == 335
