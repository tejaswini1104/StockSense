"""Application settings, loaded from environment / .env file."""

from functools import lru_cache

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Application ---
    PROJECT_NAME: str = "StockSense API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/stocksense"

    # --- Security / JWT ---
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # --- CORS ---
    # NoDecode: parsed by the validator below so a plain comma-separated
    # string works in .env, not just a JSON array.
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
    )

    # --- Password reset OTP ---
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5

    # --- SMTP (optional; OTP is logged to the console when unset) ---
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "no-reply@stocksense.local"
    SMTP_TLS: bool = True

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, value):
        """Accept either a JSON list or a comma-separated string."""
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
