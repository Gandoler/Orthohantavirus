from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ProjectModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class SourceConfidence(StrEnum):
    OFFICIAL = "official"
    OFFICIAL_REPORT_DERIVED = "official_report_derived"
    SECONDARY_VERIFIED = "secondary_verified"
    MODELLED = "modelled"
    MANUAL_REVIEW_REQUIRED = "manual_review_required"


class GeoPrecision(StrEnum):
    COUNTRY = "country"
    ADMIN1 = "admin1"
    ADMIN2 = "admin2"
    EVENT = "event"
    POINT = "point"
    MODELLED_AREA = "modelled_area"
    UNKNOWN = "unknown"


class RegionType(StrEnum):
    COUNTRY = "country"
    ADMIN1 = "admin1"
    ADMIN2 = "admin2"
    EVENT = "event"
    MODELLED_AREA = "modelled_area"


class SourceMetadata(ProjectModel):
    source: str
    source_url: HttpUrl
    fetched_at: datetime
    published_at: datetime | None = None
    confidence: SourceConfidence


class Region(ProjectModel):
    region_code: str
    region_type: RegionType
    name_en: str
    name_local: str | None = None
    country_code: str = Field(min_length=2, max_length=2)
    country_iso3: str | None = Field(default=None, min_length=3, max_length=3)
    parent_region_code: str | None = None
    geometry_source: str | None = None
    geometry_precision: str | None = None


class CaseAggregate(ProjectModel):
    id: str
    source: str
    source_url: HttpUrl
    country_code: str = Field(min_length=2, max_length=2)
    admin1_code: str | None = None
    admin2_code: str | None = None
    location_label: str
    geo_precision: GeoPrecision
    disease: str
    clinical_form: str | None = None
    period_start: date
    period_end: date
    confirmed_cases: int | None = Field(default=None, ge=0)
    probable_cases: int | None = Field(default=None, ge=0)
    deaths: int | None = Field(default=None, ge=0)
    confidence: SourceConfidence
    updated_at: datetime


class EventLocation(ProjectModel):
    label: str
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    admin1_code: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    precision: GeoPrecision


class OutbreakEvent(ProjectModel):
    id: str
    source: str
    source_url: HttpUrl
    title: str
    status: str
    pathogen: str | None = None
    started_at: date | None = None
    reported_at: date | None = None
    locations: list[EventLocation] = Field(default_factory=list)
    confirmed_cases: int | None = Field(default=None, ge=0)
    probable_cases: int | None = Field(default=None, ge=0)
    deaths: int | None = Field(default=None, ge=0)
    confidence: SourceConfidence
    summary: str | None = None


class NewsItem(ProjectModel):
    id: str
    source: str
    source_url: HttpUrl
    published_at: datetime | None = None
    fetched_at: datetime
    title: str
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    related_region_codes: list[str] = Field(default_factory=list)
    related_outbreak_ids: list[str] = Field(default_factory=list)
    language: str = "en"
    confidence: SourceConfidence


class HealthResponse(ProjectModel):
    status: str
    service: str
    app_env: str
    s3: str
    latest_manifest: datetime | None = None


class MetadataResponse(ProjectModel):
    app_env: str
    latest_manifest: datetime | None = None
    sources: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
