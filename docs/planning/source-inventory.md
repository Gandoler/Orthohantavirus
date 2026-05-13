# Source Inventory

Last reviewed: 2026-05-12

This file tracks source feasibility before source adapters are implemented. Only official sources should update public case/outbreak counts automatically in the MVP.

## MVP Sources

| Source | Primary URL | Data Type | Format | Update Pattern | Parser Risk | Reuse Notes | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CDC Hantavirus reported cases | https://www.cdc.gov/hantavirus/data-research/cases/index.html | US reported cases, state-level aggregates, surveillance context | HTML page with embedded CDC GIS widget | Irregular/annual; page reviewed as updated 2026-04-23 | Medium: public page HTML can change, state-level only | CDC materials are mostly public domain, but logos/third-party content are restricted; always attribute and link to source | confirmed |
| CDC Hantavirus GIS widget API | https://gis.cdc.gov/grasp/HantavirusCaseViewAPI/GetData_JSON_ByYear?appVersion=Public | US case counts by year, state FIPS, and outcome | JSON | Same source family as CDC page | Low-medium: structured endpoint, but discovered through embedded widget and should be monitored | Attribute CDC and link public CDC page, not only the API endpoint | implemented_poc |
| CDC case definition/reporting | https://www.cdc.gov/hantavirus/php/surveillance/index.html | Reporting context, NNDSS/case definition notes | HTML | Low-frequency reference updates | Low: context page, not primary data feed | Same CDC reuse constraints | confirmed_reference |
| ECDC Hantavirus surveillance | https://www.ecdc.europa.eu/en/hantavirus-infection/surveillance-and-disease-data | EU/EEA surveillance reports and atlas link | HTML + annual report pages/PDF/atlas | Annual | Medium-high: Atlas may need extra discovery; report tables/PDFs may vary | ECDC web/data reuse generally requires attribution; third-party material excluded; use required dataset acknowledgement where applicable | confirmed |
| ECDC Annual Epidemiological Report 2023 | https://www.ecdc.europa.eu/en/publications-data/hantavirus-infection-annual-epidemiological-report-2023 | EU/EEA annual reported cases | HTML page + PDF report | Annual | Medium: PDF Table 1 is text-extractable through PyMuPDF; row parsing uses fixtures | Cite ECDC and indicate modifications | implemented_poc |
| WHO Disease Outbreak News API | https://www.who.int/api/hubs/diseaseoutbreaknews | Outbreak/news items | REST/OData-like JSON API | Event-driven | Low-medium: API exists, content still needs normalization | WHO materials commonly use CC BY-NC-SA 3.0 IGO for publications; commercial use may require permission; always attribute and link | confirmed |
| WHO Disease Outbreak News pages | https://www.who.int/emergencies/disease-outbreak-news | Human-readable outbreak updates | HTML | Event-driven | Medium: good fallback if API fields are insufficient | Same WHO reuse constraints | confirmed_fallback |

## Deferred Sources

| Source | Why Deferred | Next Action |
| --- | --- | --- |
| PAHO epidemiological alerts | Useful for Americas, but likely requires PDF/HTML-specific parsing | Research in Stage 07 |
| Rospotrebnadzor regional pages | Important for Russian GLPS/HFRS data, but source layout is fragmented by region | Research in Stage 07 |
| GBIF/IUCN/NASA ecological inputs | Useful for risk layers, but should not be mixed with official reported cases | Model design in Stage 07 |

## Source Policy

- Official sources can update public reported-case and outbreak layers.
- Secondary sources can create news items only after confidence rules are defined.
- Modeled ecological layers must use separate layer names and confidence values.
- Every public record must retain `source`, `source_url`, `fetched_at`, `published_at` when known, and `confidence`.
- Do not infer finer geography than the source publishes. If CDC publishes state-level data, the app must not create county-level case points.

## First Adapter Order

1. WHO Disease Outbreak News API: implemented POC.
2. CDC reported cases / GIS widget API: implemented POC.
3. ECDC annual report/surveillance page: implemented POC.

## Open Follow-ups

- Confirm whether WHO DON API supports filtering by disease/search term reliably enough for incremental fetches.
- Inspect CDC page HTML structure during adapter implementation and store fixture snapshots.
- Inspect ECDC Atlas network/API behavior before deciding between Atlas ingestion and annual report parsing.
