from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

from shared.contracts import CaseAggregate, NewsItem, OutbreakEvent


@dataclass(frozen=True)
class RawArtifact:
    key_suffix: str
    content_type: str
    body: bytes


@dataclass(frozen=True)
class SourceRunResult:
    source: str
    fetched_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    raw_artifacts: list[RawArtifact] = field(default_factory=list)
    cases: list[CaseAggregate] = field(default_factory=list)
    outbreaks: list[OutbreakEvent] = field(default_factory=list)
    news: list[NewsItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class SourceAdapter(Protocol):
    source: str

    def run(self) -> SourceRunResult:
        """Fetch source data and return normalized records."""
