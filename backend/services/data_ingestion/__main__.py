import argparse
import json
from datetime import UTC, datetime
from typing import Iterable

import orjson

from services.data_ingestion.adapters import (
    CdcHantavirusAdapter,
    EcdcAnnualReportAdapter,
    SourceRunResult,
)
from services.data_ingestion.adapters.who import WhoDiseaseOutbreakNewsAdapter
from services.data_ingestion.projections import build_public_artifacts
from shared.config import get_settings
from shared.storage import S3Storage

ADAPTERS = {
    "cdc": CdcHantavirusAdapter,
    "ecdc": EcdcAnnualReportAdapter,
    "who": WhoDiseaseOutbreakNewsAdapter,
}


def emit(event: str, **payload: object) -> None:
    record = {
        "timestamp": datetime.now(UTC).isoformat(),
        "service": "data-ingestion",
        "event": event,
        **payload,
    }
    print(json.dumps(record, sort_keys=True), flush=True)


def run_source(source: str, *, dry_run: bool = False) -> SourceRunResult:
    adapter_cls = ADAPTERS.get(source)
    if adapter_cls is None:
        raise SystemExit(f"unknown source adapter: {source}")

    settings = get_settings()
    result = adapter_cls().run()
    emit(
        "source_run_finished",
        source=source,
        cases=len(result.cases),
        outbreaks=len(result.outbreaks),
        news=len(result.news),
        warnings=len(result.warnings),
        dry_run=dry_run,
    )

    if dry_run:
        return result

    storage = S3Storage(settings)
    if not storage.bucket_available():
        raise SystemExit(f"S3 bucket is unavailable: {settings.s3_bucket}")

    write_result(storage, result)
    return result


def run_all(*, dry_run: bool = False) -> list[SourceRunResult]:
    settings = get_settings()
    sources = [source.strip() for source in settings.ingestion_default_sources.split(",")]
    results: list[SourceRunResult] = []
    for source in sources:
        if source:
            if source not in ADAPTERS:
                emit("source_skipped", source=source, reason="adapter_not_implemented")
                continue
            results.append(run_source(source, dry_run=dry_run))

    if not dry_run and settings.ingestion_write_public:
        storage = S3Storage(settings)
        write_public_artifacts(storage, results)

    emit("run_all_finished", sources=[result.source for result in results], dry_run=dry_run)
    return results


def write_result(storage: S3Storage, result: SourceRunResult) -> None:
    run_date = result.fetched_at.strftime("%Y/%m/%d")
    snapshot_date = result.fetched_at.date().isoformat()

    for artifact in result.raw_artifacts:
        storage.put_bytes(
            key=f"raw/{result.source}/{run_date}/{artifact.key_suffix}",
            body=artifact.body,
            content_type=artifact.content_type,
        )

    if result.cases:
        storage.put_bytes(
            key=f"normalized/cases/snapshot_date={snapshot_date}/{result.source}.jsonl",
            body=to_jsonl(record.model_dump(mode="json") for record in result.cases),
            content_type="application/x-ndjson",
        )
    if result.outbreaks:
        storage.put_bytes(
            key=f"normalized/outbreaks/snapshot_date={snapshot_date}/{result.source}.jsonl",
            body=to_jsonl(record.model_dump(mode="json") for record in result.outbreaks),
            content_type="application/x-ndjson",
        )
    if result.news:
        storage.put_bytes(
            key=f"normalized/news/snapshot_date={snapshot_date}/{result.source}.jsonl",
            body=to_jsonl(record.model_dump(mode="json") for record in result.news),
            content_type="application/x-ndjson",
        )

    storage.put_json(
        key=f"manifests/runs/{result.source}-{result.fetched_at.strftime('%Y-%m-%dT%H-%M-%SZ')}.json",
        payload={
            "source": result.source,
            "fetched_at": result.fetched_at.isoformat(),
            "raw_artifacts": [artifact.key_suffix for artifact in result.raw_artifacts],
            "cases": len(result.cases),
            "outbreaks": len(result.outbreaks),
            "news": len(result.news),
            "warnings": result.warnings,
            "metadata": result.metadata,
        },
    )


def write_public_artifacts(storage: S3Storage, results: list[SourceRunResult]) -> None:
    for key, payload in build_public_artifacts(results).items():
        storage.put_json(key=key, payload=payload)


def to_jsonl(records: Iterable[object]) -> bytes:
    return b"".join(orjson.dumps(record) + b"\n" for record in records)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="data-ingestion")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--source", required=True)
    run_parser.add_argument("--dry-run", action="store_true")

    run_all_parser = subparsers.add_parser("run-all")
    run_all_parser.add_argument("--dry-run", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "run":
        run_source(args.source, dry_run=args.dry_run)
    elif args.command == "run-all":
        run_all(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
