from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    debug: bool = False
    secret_key: str
    database_url: str = "sqlite+aiosqlite:///./portfolio.db"
    public_base_url: str = ""
    cors_origins: list[str] = []

    access_token_minutes: int = 30
    refresh_token_days: int = 30

    media_dir: Path = Path("media")
    max_upload_mb: int = 10

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    # Xatdagi "From" manzili. Bo'sh bo'lsa SMTP_USER ishlatiladi (masalan Gmail).
    # Brevo kabi relay'da login boshqa bo'ladi, shuning uchun alohida: noreply@bahodirbek.uz.
    email_from: str = ""
    email_from_name: str = "bahodirbek.uz"

    email_code_ttl_minutes: int = 15
    email_code_resend_seconds: int = 60
    email_code_max_attempts: int = 5

    complaints_to_delete: int = 3

    @property
    def email_sender(self) -> str:
        return self.email_from or self.smtp_user

    @model_validator(mode="after")
    def _check_production(self) -> "Settings":
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY kamida 32 belgi bo'lishi kerak")
        if not self.debug and not self.smtp_password:
            raise ValueError("DEBUG=false bo'lganda SMTP_PASSWORD majburiy")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
