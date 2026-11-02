from functools import lru_cache

from pydantic import model_validator
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
    login_attempt_limit: int = 5
    login_attempt_window_seconds: int = 900

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
    trusted_hosts: str = "localhost,127.0.0.1"

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

    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.environment.lower() != "production":
            return self

        errors: list[str] = []
        if self.jwt_secret_key == "change-me-in-production" or len(self.jwt_secret_key) < 32:
            errors.append("JWT_SECRET_KEY must be a unique value of at least 32 characters")
        password_is_weak = (
            self.admin_password == "admin123"
            or len(self.admin_password) < 12
            or not any(char.islower() for char in self.admin_password)
            or not any(char.isupper() for char in self.admin_password)
            or not any(char.isdigit() for char in self.admin_password)
            or self.admin_password.isalnum()
        )
        if password_is_weak:
            errors.append("ADMIN_PASSWORD must be 12+ characters with upper/lowercase, a number, and a symbol")
        if "gms:gms@" in self.database_url:
            errors.append("DATABASE_URL must not use the development database password")
        if self.redis_url in {"redis://redis:6379/0", "redis://localhost:6379/0"}:
            errors.append("REDIS_URL must include production authentication")
        if not self.cors_origin_list or "*" in self.cors_origin_list:
            errors.append("CORS_ORIGINS must be an explicit production allowlist")
        if not self.trusted_host_list or "*" in self.trusted_host_list:
            errors.append("TRUSTED_HOSTS must be an explicit production allowlist")
        if errors:
            raise ValueError("Invalid production configuration: " + "; ".join(errors))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
