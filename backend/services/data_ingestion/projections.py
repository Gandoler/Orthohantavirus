from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from services.data_ingestion.adapters import SourceRunResult
from shared.contracts import CaseAggregate, NewsItem, OutbreakEvent


STATE_COORDS = {
    "US-AK": (-152.4044, 61.3707),
    "US-AL": (-86.7911, 32.8067),
    "US-AR": (-92.3731, 34.9697),
    "US-AZ": (-111.4312, 33.7298),
    "US-CA": (-119.6816, 36.1162),
    "US-CO": (-105.3111, 39.0598),
    "US-CT": (-72.7554, 41.5978),
    "US-DC": (-77.0268, 38.8974),
    "US-DE": (-75.5071, 39.3185),
    "US-FL": (-81.6868, 27.7663),
    "US-GA": (-83.6431, 33.0406),
    "US-HI": (-157.4983, 21.0943),
    "US-IA": (-93.2105, 42.0115),
    "US-ID": (-114.4788, 44.2405),
    "US-IL": (-88.9861, 40.3495),
    "US-IN": (-86.2583, 39.8494),
    "US-KS": (-96.7265, 38.5266),
    "US-KY": (-84.6701, 37.6681),
    "US-LA": (-91.8678, 31.1695),
    "US-MA": (-71.5301, 42.2302),
    "US-MD": (-76.8021, 39.0639),
    "US-ME": (-69.3819, 44.6939),
    "US-MI": (-84.5361, 43.3266),
    "US-MN": (-93.9002, 45.6945),
    "US-MO": (-92.2884, 38.4561),
    "US-MS": (-89.6787, 32.7416),
    "US-MT": (-110.4544, 46.9219),
    "US-NC": (-79.8064, 35.6301),
    "US-ND": (-99.784, 47.5289),
    "US-NE": (-99.9018, 41.1254),
    "US-NH": (-71.5639, 43.4525),
    "US-NJ": (-74.521, 40.2989),
    "US-NM": (-106.2485, 34.8405),
    "US-NV": (-117.0554, 38.3135),
    "US-NY": (-74.9481, 42.1657),
    "US-OH": (-82.7649, 40.3888),
    "US-OK": (-96.9289, 35.5653),
    "US-OR": (-122.0709, 44.572),
    "US-PA": (-77.2098, 40.5908),
    "US-RI": (-71.5118, 41.6809),
    "US-SC": (-80.945, 33.8569),
    "US-SD": (-99.4388, 44.2998),
    "US-TN": (-86.6923, 35.7478),
    "US-TX": (-97.5635, 31.0545),
    "US-UT": (-111.8624, 40.15),
    "US-VA": (-78.1699, 37.7693),
    "US-VT": (-72.7107, 44.0459),
    "US-WA": (-121.4905, 47.4009),
    "US-WI": (-89.6165, 44.2685),
    "US-WV": (-80.9545, 38.4912),
    "US-WY": (-107.3025, 42.7559),
}

COUNTRY_COORDS = {
    "AT": (14.5501, 47.5162),
    "BE": (4.4699, 50.5039),
    "BG": (25.4858, 42.7339),
    "CY": (33.4299, 35.1264),
    "CZ": (15.473, 49.8175),
    "DE": (10.4515, 51.1657),
    "EE": (25.0136, 58.5953),
    "ES": (-3.7492, 40.4637),
    "FI": (25.7482, 61.9241),
    "FR": (2.2137, 46.2276),
    "GR": (21.8243, 39.0742),
    "HR": (15.2, 45.1),
    "HU": (19.5033, 47.1625),
    "IE": (-8.2439, 53.4129),
    "IS": (-19.0208, 64.9631),
    "IT": (12.5674, 41.8719),
    "LI": (9.5554, 47.166),
    "LT": (23.8813, 55.1694),
    "LU": (6.1296, 49.8153),
    "LV": (24.6032, 56.8796),
    "MT": (14.3754, 35.9375),
    "NL": (5.2913, 52.1326),
    "NO": (8.4689, 60.472),
    "PL": (19.1451, 51.9194),
    "PT": (-8.2245, 39.3999),
    "RO": (24.9668, 45.9432),
    "SE": (18.6435, 60.1282),
    "SI": (14.9955, 46.1512),
    "SK": (19.699, 48.669),
}


def build_public_artifacts(
    results: list[SourceRunResult],
    *,
    generated_at: datetime | None = None,
) -> dict[str, Any]:
    generated_at = generated_at or datetime.now(UTC)
    cases = [record for result in results for record in result.cases]
    outbreaks = [record for result in results for record in result.outbreaks]
    news = [record for result in results for record in result.news]

    return {
        "public/map/latest/regions.geojson": build_regions_geojson(cases, generated_at),
        "public/map/latest/outbreaks.geojson": build_outbreaks_geojson(outbreaks, generated_at),
        "public/stats/latest/summary.json": build_summary(results, cases, outbreaks, news, generated_at),
        "public/timeline/latest/cases.json": build_case_timeline(cases, generated_at),
        "public/news/latest/feed.json": build_news_feed(news, generated_at),
        "manifests/latest.json": build_latest_manifest(results, generated_at),
    }


def build_regions_geojson(cases: list[CaseAggregate], generated_at: datetime) -> dict[str, Any]:
    grouped: dict[str, list[CaseAggregate]] = defaultdict(list)
    for record in cases:
        grouped[record.admin1_code or record.country_code].append(record)

    features = []
    for region_code, records in sorted(grouped.items()):
        confirmed_cases = sum(record.confirmed_cases or 0 for record in records)
        deaths = sum(record.deaths or 0 for record in records)
        label = records[0].location_label
        lon_lat = coordinate_for_region(region_code)
        features.append(
            {
                "type": "Feature",
                "id": region_code,
                "geometry": {"type": "Point", "coordinates": list(lon_lat)} if lon_lat else None,
                "properties": {
                    "region_code": region_code,
                    "label": label,
                    "geo_precision": records[0].geo_precision.value,
                    "confirmed_cases": confirmed_cases,
                    "deaths": deaths,
                    "sources": sorted({record.source for record in records}),
                    "confidence": sorted({record.confidence.value for record in records}),
                    "period_start": min(record.period_start for record in records).isoformat(),
                    "period_end": max(record.period_end for record in records).isoformat(),
                    "data_type": "reported_cases",
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "generated_at": generated_at.isoformat(),
        "features": features,
    }


def build_outbreaks_geojson(outbreaks: list[OutbreakEvent], generated_at: datetime) -> dict[str, Any]:
    features = []
    for outbreak in sorted(outbreaks, key=lambda item: item.reported_at or datetime.min.date(), reverse=True):
        location = outbreak.locations[0] if outbreak.locations else None
        geometry = None
        if location and location.lon is not None and location.lat is not None:
            geometry = {"type": "Point", "coordinates": [location.lon, location.lat]}
        features.append(
            {
                "type": "Feature",
                "id": outbreak.id,
                "geometry": geometry,
                "properties": {
                    "title": outbreak.title,
                    "source": outbreak.source,
                    "source_url": str(outbreak.source_url),
                    "status": outbreak.status,
                    "pathogen": outbreak.pathogen,
                    "reported_at": outbreak.reported_at.isoformat() if outbreak.reported_at else None,
                    "confirmed_cases": outbreak.confirmed_cases,
                    "probable_cases": outbreak.probable_cases,
                    "deaths": outbreak.deaths,
                    "confidence": outbreak.confidence.value,
                    "location_label": location.label if location else None,
                    "data_type": "outbreak_report",
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "generated_at": generated_at.isoformat(),
        "features": features,
    }


def build_summary(
    results: list[SourceRunResult],
    cases: list[CaseAggregate],
    outbreaks: list[OutbreakEvent],
    news: list[NewsItem],
    generated_at: datetime,
) -> dict[str, Any]:
    return {
        "generated_at": generated_at.isoformat(),
        "sources": sorted(result.source for result in results),
        "reported_case_records": len(cases),
        "reported_cases_total": sum(record.confirmed_cases or 0 for record in cases),
        "reported_deaths_total": sum(record.deaths or 0 for record in cases),
        "outbreak_events": len(outbreaks),
        "news_items": len(news),
    }


def build_case_timeline(cases: list[CaseAggregate], generated_at: datetime) -> dict[str, Any]:
    grouped: dict[tuple[int, str], int] = defaultdict(int)
    for record in cases:
        grouped[(record.period_end.year, record.source)] += record.confirmed_cases or 0

    return {
        "generated_at": generated_at.isoformat(),
        "items": [
            {"year": year, "source": source, "confirmed_cases": confirmed_cases}
            for (year, source), confirmed_cases in sorted(grouped.items())
        ],
    }


def build_news_feed(news: list[NewsItem], generated_at: datetime) -> dict[str, Any]:
    def sort_key(item: NewsItem) -> datetime:
        return item.published_at or item.fetched_at

    return {
        "generated_at": generated_at.isoformat(),
        "items": [item.model_dump(mode="json") for item in sorted(news, key=sort_key, reverse=True)],
    }


def build_latest_manifest(results: list[SourceRunResult], generated_at: datetime) -> dict[str, Any]:
    artifacts = [
        "public/map/latest/regions.geojson",
        "public/map/latest/outbreaks.geojson",
        "public/stats/latest/summary.json",
        "public/timeline/latest/cases.json",
        "public/news/latest/feed.json",
    ]
    return {
        "generated_at": generated_at.isoformat(),
        "sources": [
            {
                "source": result.source,
                "fetched_at": result.fetched_at.isoformat(),
                "cases": len(result.cases),
                "outbreaks": len(result.outbreaks),
                "news": len(result.news),
                "warnings": result.warnings,
            }
            for result in sorted(results, key=lambda item: item.source)
        ],
        "artifacts": artifacts,
    }


def coordinate_for_region(region_code: str) -> tuple[float, float] | None:
    if region_code.startswith("US-"):
        return STATE_COORDS.get(region_code)
    return COUNTRY_COORDS.get(region_code)
