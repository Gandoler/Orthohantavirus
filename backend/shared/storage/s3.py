from typing import Any

import boto3
import orjson
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from shared.config import Settings, get_settings


class StorageError(RuntimeError):
    """Raised when object storage cannot complete a requested operation."""


class S3Storage:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: BaseClient | None = None

    @property
    def client(self) -> BaseClient:
        if self._client is None:
            config = Config(
                connect_timeout=2,
                read_timeout=2,
                retries={"max_attempts": 1},
                s3={"addressing_style": "path" if self.settings.s3_force_path_style else "auto"},
            )
            self._client = boto3.client(
                "s3",
                endpoint_url=self.settings.s3_endpoint_url or None,
                region_name=self.settings.s3_region,
                aws_access_key_id=self.settings.s3_access_key_id,
                aws_secret_access_key=self.settings.s3_secret_access_key,
                config=config,
            )
        return self._client

    def bucket_available(self) -> bool:
        try:
            self.client.head_bucket(Bucket=self.settings.s3_bucket)
        except (BotoCoreError, ClientError):
            return False
        return True

    def put_json(self, key: str, payload: Any) -> None:
        try:
            self.client.put_object(
                Bucket=self.settings.s3_bucket,
                Key=key,
                Body=orjson.dumps(payload),
                ContentType="application/json",
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"failed to write s3://{self.settings.s3_bucket}/{key}") from exc

    def put_bytes(self, key: str, body: bytes, content_type: str) -> None:
        try:
            self.client.put_object(
                Bucket=self.settings.s3_bucket,
                Key=key,
                Body=body,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"failed to write s3://{self.settings.s3_bucket}/{key}") from exc

    def get_json(self, key: str) -> Any:
        try:
            response = self.client.get_object(Bucket=self.settings.s3_bucket, Key=key)
            return orjson.loads(response["Body"].read())
        except (BotoCoreError, ClientError, orjson.JSONDecodeError) as exc:
            raise StorageError(f"failed to read s3://{self.settings.s3_bucket}/{key}") from exc
