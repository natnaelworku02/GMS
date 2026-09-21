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

    # Optional operational seed users. Roles are always created; a user is
    # created only when its password is supplied through the environment.
    seed_inventory_phone: str = "+251900000101"
    seed_inventory_password: str | None = None
    seed_tools_phone: str = "+251900000102"
    seed_tools_password: str | None = None
    seed_job_cards_phone: str = "+251900000103"
    seed_job_cards_password: str | None = None

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    cors_origins: str = "http://localhost:3000,https://gms-six-lyart.vercel.app"

    backup_dir: str = "/backups"
    backup_retention_days: int = 30
    backup_interval_hours: int = 24

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
