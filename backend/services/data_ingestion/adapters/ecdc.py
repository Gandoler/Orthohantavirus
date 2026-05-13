from datetime import UTC, date, datetime
import re
from typing import Any
from urllib.parse import urljoin

import httpx

from services.data_ingestion.adapters.base import RawArtifact, SourceRunResult
from services.data_ingestion.pdf import extract_pdf_text
from shared.contracts import CaseAggregate, GeoPrecision, SourceConfidence


ECDC_AER_2023_PAGE_URL = (
    "https://www.ecdc.europa.eu/en/publications-data/"
    "hantavirus-infection-annual-epidemiological-report-2023"
)

COUNTRY_CODES = {
    "Austria": "AT",
    "Belgium": "BE",
    "Bulgaria": "BG",
    "Croatia": "HR",
    "Cyprus": "CY",
    "Czechia": "CZ",
    "Denmark": "DK",
    "Estonia": "EE",
    "Finland": "FI",
    "France": "FR",
    "Germany": "DE",
    "Greece": "GR",
    "Hungary": "HU",
    "Iceland": "IS",
    "Ireland": "IE",
    "Italy": "IT",
    "Latvia": "LV",
    "Liechtenstein": "LI",
    "Lithuania": "LT",
    "Luxembourg": "LU",
    "Malta": "MT",
    "Netherlands": "NL",
    "Norway": "NO",
    "Poland": "PL",
    "Portugal": "PT",
    "Romania": "RO",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Spain": "ES",
    "Sweden": "SE",
}


class EcdcAnnualReportAdapter:
    source = "ecdc"

    def __init__(self, client: httpx.Client | None = None) -> None:
        self.client = client or httpx.Client(timeout=30, follow_redirects=True)

    def run(self) -> SourceRunResult:
        fetched_at = datetime.now(UTC)
        page_response = self.client.get(ECDC_AER_2023_PAGE_URL)
        page_response.raise_for_status()
        pdf_url = extract_pdf_url(page_response.text, base_url=ECDC_AER_2023_PAGE_URL)

        pdf_response = self.client.get(pdf_url)
        pdf_response.raise_for_status()
        text = extract_pdf_text(pdf_response.content)
        cases, warnings = parse_ecdc_table_text(text, fetched_at=fetched_at)

        return SourceRunResult(
            source=self.source,
            fetched_at=fetched_at,
            raw_artifacts=[
                RawArtifact(
                    key_suffix="ecdc-hantavirus-aer-2023.html",
                    content_type="text/html",
                    body=page_response.content,
                ),
                RawArtifact(
                    key_suffix="ecdc-hantavirus-aer-2023.pdf",
                    content_type="application/pdf",
                    body=pdf_response.content,
                ),
            ],
            cases=cases,
            warnings=warnings,
            metadata={
                "source_url": ECDC_AER_2023_PAGE_URL,
                "pdf_url": pdf_url,
                "record_count": len(cases),
            },
        )


def extract_pdf_url(html: str, *, base_url: str) -> str:
    match = re.search(r'href="([^"]*HANTA_AER_2023\.pdf)"', html)
    if not match:
        raise ValueError("ECDC annual report PDF link was not found")
    return urljoin(base_url, match.group(1))


def parse_ecdc_table_text(
    text: str,
    *,
    fetched_at: datetime,
) -> tuple[list[CaseAggregate], list[str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    warnings: list[str] = []
    cases: list[CaseAggregate] = []

    for index, line in enumerate(lines):
        if line not in COUNTRY_CODES:
            continue

        values = lines[index + 1 : index + 11]
        if len(values) < 10:
            warnings.append(f"ECDC row for {line} did not include 10 year/rate values")
            continue

        number_2023 = parse_number(values[8])
        if number_2023 is None:
            warnings.append(f"ECDC row for {line} has non-numeric 2023 cases: {values[8]}")
            continue

        country_code = COUNTRY_CODES[line]
        cases.append(
            CaseAggregate(
                id=f"ecdc-{country_code.lower()}-2023-hantavirus-infection",
                source="ecdc",
                source_url=ECDC_AER_2023_PAGE_URL,
                country_code=country_code,
                admin1_code=None,
                admin2_code=None,
                location_label=line,
                geo_precision=GeoPrecision.COUNTRY,
                disease="hantavirus_infection",
                clinical_form="hfrs_or_unspecified",
                period_start=date(2023, 1, 1),
                period_end=date(2023, 12, 31),
                confirmed_cases=number_2023,
                probable_cases=None,
                deaths=None,
                confidence=SourceConfidence.OFFICIAL_REPORT_DERIVED,
                updated_at=fetched_at,
            )
        )

    if not cases:
        warnings.append("ECDC parser did not emit any country aggregates")

    return cases, sorted(set(warnings))


def parse_number(value: Any) -> int | None:
    text = str(value).strip()
    if text in {"NDR", "NRC", "NA"}:
        return None
    text = text.replace(" ", "")
    if not text.isdigit():
        return None
    return int(text)
