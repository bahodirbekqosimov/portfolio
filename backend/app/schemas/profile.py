from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel, RequiredMediaUrl, Trimmed

BIO_MAX_LENGTH = 5000


class ProfileImageOut(ORMModel):
    url: RequiredMediaUrl = Field(
        validation_alias="file",
        description="Rasmning to'liq URL manzili (`<PUBLIC_BASE_URL>/media/profile/...`).",
    )
    updated_at: datetime


HEADLINE_MAX_LENGTH = 120


class BioOut(ORMModel):
    content: str
    headline: str | None
    created_at: datetime
    updated_at: datetime


class BioIn(BaseModel):
    content: Trimmed(BIO_MAX_LENGTH) = Field(
        description=f"Bio matni. Bo'sh bo'lmasligi kerak, ko'pi bilan {BIO_MAX_LENGTH} belgi.",
        examples=["Backend dasturchiman. Python va FastAPI bilan ishlayman."],
    )
    headline: str | None = Field(
        default=None,
        max_length=HEADLINE_MAX_LENGTH,
        description="Ism ostidagi qisqa lavozim (home page va CV). Bo'sh qoldirilsa chiqmaydi.",
        examples=["Python Backend Engineer"],
    )

    @field_validator("headline", mode="before")
    @classmethod
    def _blank_headline_is_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class ErrorOut(BaseModel):
    detail: str
