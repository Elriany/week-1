"""Environment Settings with fail-fast validation using Pydantic Settings v2."""

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    JWT_SECRET: str = "super_secret_jwt_key_for_approval_management_api_2026"
    JWT_EXPIRES_IN: str = "24h"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
