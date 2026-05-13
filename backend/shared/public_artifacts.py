from datetime import datetime
from typing import Any

from shared.storage import S3Storage, StorageError


def read_json_artifact(storage: S3Storage, key: str, default: Any) -> Any:
    try:
        return storage.get_json(key)
    except StorageError:
        return default


def latest_manifest_generated_at(storage: S3Storage) -> datetime | None:
    manifest = read_json_artifact(storage, "manifests/latest.json", {})
    if not isinstance(manifest, dict):
        return None
    generated_at = manifest.get("generated_at")
    if not isinstance(generated_at, str):
        return None
    try:
        return datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    except ValueError:
        return None


def empty_feature_collection() -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": []}
