# ECDC Hantavirus Feasibility

Last reviewed: 2026-05-12

## Sources Reviewed

| Source | URL | Format | Result |
| --- | --- | --- | --- |
| ECDC Annual Epidemiological Report 2023 page | https://www.ecdc.europa.eu/en/publications-data/hantavirus-infection-annual-epidemiological-report-2023 | HTML | Public page includes summary text and PDF download link |
| ECDC Annual Epidemiological Report 2023 PDF | https://www.ecdc.europa.eu/sites/default/files/documents/HANTA_AER_2023.pdf | PDF | Contains Table 1 with country/year case counts and rates for 2019-2023 |
| ECDC Surveillance Atlas | https://www.ecdc.europa.eu/en/surveillance-atlas-infectious-diseases | Web dashboard | Useful long-term, but the public API/download path needs separate inspection |

## Key Findings

- The 2023 annual report is enough for an MVP Europe baseline layer.
- The PDF explicitly reports 1 885 EU/EEA cases for 2023.
- Table 1 contains country rows with `Number` and `Rate` pairs for 2019-2023.
- The PDF text is extractable with `pdftotext -layout`; this means a parser is feasible.
- The report states reproduction is authorised when the source is acknowledged.

## Parser Risk

Risk: medium.

Reasons:

- PDF table extraction is more fragile than JSON.
- Country names and rate values are visually table-aligned rather than represented as structured data.
- Some cells contain non-numeric values such as `NDR`, `NRC`, and `NA`.
- Annual report filenames may change by year.

## Recommended MVP Approach

Implement an ECDC annual-report adapter, not an Atlas adapter, for the first pass.

Adapter steps:

1. Fetch the annual report HTML page.
2. Extract the PDF link from the page.
3. Store the raw HTML and raw PDF in S3.
4. Extract text from the PDF.
5. Parse Table 1 into country/year records.
6. Emit `CaseAggregate` records for 2023 country-level data.
7. Store extraction warnings for rows with `NDR`, `NRC`, or `NA`.

## Required Parser Dependency

Preferred:

- `PyMuPDF` for PDF text extraction in Python.

Fallback:

- `pdftotext -layout` through Poppler, but this adds a host/container system dependency.

For Docker portability, `PyMuPDF` is the cleaner first implementation.

## Public Data Semantics

Use:

```text
country_code: ISO 3166-1 alpha-2
geo_precision: country
disease: hantavirus_infection
clinical_form: hfrs_or_unspecified
confidence: official_report_derived
source: ecdc
source_url: annual report page URL
```

Do not show ECDC report data as active outbreak data. It is annual surveillance data.

## Proposed Backlog

| ID | Title | Area | Priority | Status |
| --- | --- | --- | --- | --- |
| OHV-024 | Add PyMuPDF dependency and PDF text extractor helper | ingestion | P1 | done |
| OHV-025 | Implement ECDC annual report adapter | ingestion | P1 | done |
| OHV-026 | Add ECDC PDF table parser fixtures | ingestion | P1 | done |
| OHV-027 | Normalize ECDC 2023 country aggregates | ingestion | P1 | done |

## Decision

Proceed with ECDC annual report PDF parsing through PyMuPDF. Runtime S3/MinIO write verification remains blocked by local Docker daemon availability.
