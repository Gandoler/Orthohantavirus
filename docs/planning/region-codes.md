# Region Code Strategy

Last reviewed: 2026-05-12

The project needs stable region identifiers before ingestion and frontend map joins start.

## Canonical Codes

Use these canonical fields:

| Field | Meaning | Example | Required |
| --- | --- | --- | --- |
| `country_code` | ISO 3166-1 alpha-2 country code | `US`, `DE`, `RU` | yes |
| `country_iso3` | ISO 3166-1 alpha-3 country code | `USA`, `DEU`, `RUS` | optional |
| `admin1_code` | ISO 3166-2 subdivision code when available | `US-CA`, `DE-BY`, `RU-BA` | optional |
| `admin2_code` | Local/source-specific second-level admin code | `US-06037` | optional |
| `source_region_code` | Region code exactly as used by the source | `California`, `FI` | optional |
| `region_code` | Best canonical join key for public map features | `US-CA` or `US` | yes |

## Precision Values

Use `geo_precision` to avoid implying exact locations:

```text
country
admin1
admin2
event
point
modelled_area
unknown
```

Rules:

- CDC state aggregates use `geo_precision=admin1`.
- ECDC country aggregates use `geo_precision=country` unless a source explicitly provides lower-level regions.
- WHO outbreak events use `geo_precision=event` unless a reliable country/admin region is explicitly present.
- Ecological risk layers use `geo_precision=modelled_area`.

## Region Entity Shape

```json
{
  "region_code": "US-CA",
  "region_type": "admin1",
  "name_en": "California",
  "name_local": "California",
  "country_code": "US",
  "country_iso3": "USA",
  "parent_region_code": "US",
  "geometry_source": "natural_earth",
  "geometry_precision": "admin1_simplified"
}
```

## Geometry Source

MVP geometry source:

- Natural Earth for country/admin boundaries where suitable.
- Store public geometries as simplified WGS84 / EPSG:4326 GeoJSON.
- Keep geometry source and simplification level in metadata.

Natural Earth data is public domain, but the app can still cite it in source metadata for transparency.

## Join Policy

- Never geocode patient-level or inferred exposure locations from aggregate data.
- Use source-provided region names only after mapping them to canonical region codes.
- Store unresolved region mappings as validation warnings and exclude them from public map projections until reviewed.
- Keep a small manual mapping file for source-specific names that do not match canonical names.

## Stage 01 Implementation Target

Create shared contracts for:

- `Region`;
- `GeoPrecision`;
- `CaseAggregate`;
- `OutbreakEvent`;
- `NewsItem`;
- `SourceMetadata`.

Stage 02 adapters should emit records using these contracts.
