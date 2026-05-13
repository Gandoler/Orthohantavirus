from typing import Any

from shared.storage import S3Storage, StorageError


def read_json_artifact(storage: S3Storage, key: str, default: Any) -> Any:
    try:
        return storage.get_json(key)
    except StorageError:
        return default


def empty_feature_collection() -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": []}
