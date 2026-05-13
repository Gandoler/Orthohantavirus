from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    service_name: str = "orthohantavirus-service"
    log_level: str = "info"
    cors_allow_origins: str = "*"

    s3_endpoint_url: str | None = "http://minio:9000"
    s3_region: str = "us-east-1"
    s3_bucket: str = "orthohantavirus-data"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_force_path_style: bool = True

    ingestion_default_sources: str = "cdc,ecdc,who"
    ingestion_write_public: bool = True

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]
        return origins or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
