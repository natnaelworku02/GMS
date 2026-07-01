from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GMS Backend"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://gms:gms@postgres:5432/gms"
    redis_url: str = "redis://redis:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Default admin
    admin_phone: str = "+251900000000"
    admin_password: str = "admin123"

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
