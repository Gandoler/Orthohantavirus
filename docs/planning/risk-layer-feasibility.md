# Ecological Risk Layer Feasibility

Last updated: 2026-05-13

## Verdict

Feasible as a post-MVP ecological/modelled layer, not as an infection or outbreak layer. Risk data must stay visually and semantically separate from official reported cases.

## Sources Checked

- GBIF occurrence download/API documentation: `https://techdocs.gbif.org/en/data-use/api-downloads`
- GBIF API reference: `https://techdocs.gbif.org/en/openapi/`
- IUCN Red List API: `https://api.iucnredlist.org/`
- ESA WorldCover data access: `https://esa-worldcover.org/en/data-access`

## Candidate Data Roles

| Source | Role | Caveat |
| --- | --- | --- |
| GBIF | Reservoir-host occurrence points and coarse occurrence density | Large downloads require a GBIF account and async download workflow; occurrence data is sampling-biased. |
| IUCN Red List | Species range/reference metadata where terms allow | Requires token and careful terms review; API warns against scraping and commercial misuse. |
| ESA WorldCover | Land-cover covariates around regions or occurrence buffers | Free CC BY 4.0 data, but raster processing requires separate geospatial pipeline. |

## Proposed Contract

```json
{
  "id": "risk-us-az-2021-host-landcover-v1",
  "data_type": "ecological_risk_layer",
  "risk_model": "host_occurrence_landcover_v1",
  "region_code": "US-AZ",
  "period_start": "2021-01-01",
  "period_end": "2021-12-31",
  "risk_score": 0.42,
  "risk_label": "moderate ecological suitability",
  "confidence": "modelled",
  "sources": ["gbif", "esa_worldcover"],
  "model_version": "0.1.0",
  "generated_at": "2026-05-13T00:00:00Z"
}
```

## Implementation Plan

1. Add contracts for `RiskLayer`, `RiskFeature`, and model metadata.
2. Add a separate artifact path: `public/risk/latest/layers.geojson`.
3. Add a disabled-by-default frontend layer with clear `modelled` labeling.
4. Prototype GBIF occurrence ingestion for selected reservoir taxa.
5. Prototype ESA WorldCover raster summaries per country/admin1 region.
6. Add a model card for every published risk layer.

## Acceptance Criteria

- risk artifacts never write into `public/map/latest/regions.geojson`;
- frontend labels risk as ecological/modelled and not as confirmed infection;
- every risk feature has model version, source list, period, and confidence;
- no precise species occurrence points are exposed if a source marks them sensitive;
- model card explains limitations before public release.

## Risk Notes

- Occurrence records are not surveillance data.
- Land-cover suitability is not a direct disease incidence measure.
- IUCN terms and token use must be reviewed before automated ingestion.
