from collections import defaultdict
from datetime import UTC, date, datetime
from typing import Any

import httpx

from services.data_ingestion.adapters.base import RawArtifact, SourceRunResult
from shared.contracts import CaseAggregate, GeoPrecision, SourceConfidence


CDC_CASES_PAGE_URL = "https://www.cdc.gov/hantavirus/data-research/cases/index.html"
CDC_BY_YEAR_URL = (
    "https://gis.cdc.gov/grasp/HantavirusCaseViewAPI/"
    "GetData_JSON_ByYear?appVersion=Public"
)

FIPS_TO_STATE: dict[str, tuple[str, str]] = {
    "01": ("AL", "Alabama"),
    "02": ("AK", "Alaska"),
    "04": ("AZ", "Arizona"),
    "05": ("AR", "Arkansas"),
    "06": ("CA", "California"),
    "08": ("CO", "Colorado"),
    "09": ("CT", "Connecticut"),
    "10": ("DE", "Delaware"),
    "11": ("DC", "District of Columbia"),
    "12": ("FL", "Florida"),
    "13": ("GA", "Georgia"),
    "15": ("HI", "Hawaii"),
    "16": ("ID", "Idaho"),
    "17": ("IL", "Illinois"),
    "18": ("IN", "Indiana"),
    "19": ("IA", "Iowa"),
    "20": ("KS", "Kansas"),
    "21": ("KY", "Kentucky"),
    "22": ("LA", "Louisiana"),
    "23": ("ME", "Maine"),
    "24": ("MD", "Maryland"),
    "25": ("MA", "Massachusetts"),
    "26": ("MI", "Michigan"),
    "27": ("MN", "Minnesota"),
    "28": ("MS", "Mississippi"),
    "29": ("MO", "Missouri"),
    "30": ("MT", "Montana"),
    "31": ("NE", "Nebraska"),
    "32": ("NV", "Nevada"),
    "33": ("NH", "New Hampshire"),
    "34": ("NJ", "New Jersey"),
    "35": ("NM", "New Mexico"),
    "36": ("NY", "New York"),
    "37": ("NC", "North Carolina"),
    "38": ("ND", "North Dakota"),
    "39": ("OH", "Ohio"),
    "40": ("OK", "Oklahoma"),
    "41": ("OR", "Oregon"),
    "42": ("PA", "Pennsylvania"),
    "44": ("RI", "Rhode Island"),
    "45": ("SC", "South Carolina"),
    "46": ("SD", "South Dakota"),
    "47": ("TN", "Tennessee"),
    "48": ("TX", "Texas"),
    "49": ("UT", "Utah"),
    "50": ("VT", "Vermont"),
    "51": ("VA", "Virginia"),
    "53": ("WA", "Washington"),
    "54": ("WV", "West Virginia"),
    "55": ("WI", "Wisconsin"),
    "56": ("WY", "Wyoming"),
}


class CdcHantavirusAdapter:
    source = "cdc"

    def __init__(self, client: httpx.Client | None = None) -> None:
        self.client = client or httpx.Client(timeout=30, follow_redirects=True)

    def run(self) -> SourceRunResult:
        fetched_at = datetime.now(UTC)
        response = self.client.get(CDC_BY_YEAR_URL)
        response.raise_for_status()
        payload = response.json()

        records = payload.get("Data", [])
        cases, warnings = parse_cdc_by_year_records(records, fetched_at=fetched_at)
        return SourceRunResult(
            source=self.source,
            fetched_at=fetched_at,
            raw_artifacts=[
                RawArtifact(
                    key_suffix="cdc-hantavirus-by-year.json",
                    content_type="application/json",
                    body=response.content,
                )
            ],
            cases=cases,
            warnings=warnings,
            metadata={
                "source_url": CDC_BY_YEAR_URL,
                "public_page_url": CDC_CASES_PAGE_URL,
                "record_count": len(records),
            },
        )


def parse_cdc_by_year_records(
    records: list[dict[str, Any]],
    *,
    fetched_at: datetime,
) -> tuple[list[CaseAggregate], list[str]]:
    grouped: dict[str, dict[str, int]] = defaultdict(lambda: {"cases": 0, "deaths": 0})
    numeric_years: list[int] = []
    warnings: list[str] = []

    for record in records:
        fips = str(record.get("StateFIPS", "")).zfill(2)
        if fips not in FIPS_TO_STATE:
            warnings.append(f"unknown CDC StateFIPS: {fips}")
            continue

        case_count = int(record.get("CaseCount") or 0)
        grouped[fips]["cases"] += case_count
        if record.get("Outcome") == "Dead":
            grouped[fips]["deaths"] += case_count

        year = str(record.get("IllnessOnsetYear") or "")
        if year.isdigit():
            numeric_years.append(int(year))

    if not numeric_years:
        period_start = date(1993, 1, 1)
        period_end = date(fetched_at.year, 12, 31)
        warnings.append("CDC records did not include numeric years; used fallback period")
    else:
        period_start = date(min(numeric_years), 1, 1)
        period_end = date(max(numeric_years), 12, 31)

    cases: list[CaseAggregate] = []
    for fips, values in sorted(grouped.items()):
        state_abbr, state_name = FIPS_TO_STATE[fips]
        admin1_code = f"US-{state_abbr}"
        cases.append(
            CaseAggregate(
                id=f"cdc-{admin1_code.lower()}-{period_start.year}-{period_end.year}-hantavirus",
                source="cdc",
                source_url=CDC_CASES_PAGE_URL,
                country_code="US",
                admin1_code=admin1_code,
                admin2_code=None,
                location_label=state_name,
                geo_precision=GeoPrecision.ADMIN1,
                disease="hantavirus_disease",
                clinical_form="hps_or_non_hps",
                period_start=period_start,
                period_end=period_end,
                confirmed_cases=values["cases"],
                probable_cases=None,
                deaths=values["deaths"],
                confidence=SourceConfidence.OFFICIAL,
                updated_at=fetched_at,
            )
        )

    return cases, sorted(set(warnings))
