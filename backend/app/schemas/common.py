from typing import Annotated

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

from app.core.storage import media_url, to_media_path

# Bazada nisbiy yo'l saqlanadi, API to'liq URL qaytaradi.
MediaUrl = Annotated[str | None, AfterValidator(media_url)]
RequiredMediaUrl = Annotated[str, AfterValidator(media_url)]

# Kiruvchi rasm maydoni: `/admin/uploads/` qaytargan `path` yoki `url`, yoki tashqi https havola.
_MEDIA_PATH_DOC = "`/admin/uploads/` javobidagi `path` (yoki `url`) yoki tashqi rasm havolasi."
# max_length faqat matnga qo'llanadi: bo'sh yoki null rasm (rasm olib tashlandi) xato bermasligi kerak.
MediaPathIn = Annotated[
    Annotated[str, StringConstraints(max_length=255)] | None,
    BeforeValidator(to_media_path),
    Field(description=_MEDIA_PATH_DOC),
]
RequiredMediaPathIn = Annotated[
    str, BeforeValidator(to_media_path), Field(min_length=1, max_length=255, description=_MEDIA_PATH_DOC)
]


def Trimmed(max_length: int, min_length: int = 1):  # noqa: N802
    return Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length),
    ]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


def page_of[T](items: list[T], total: int, page: int, size: int) -> Page[T]:
    return Page(items=items, total=total, page=page, size=size, pages=(total + size - 1) // size)


class Message(BaseModel):
    message: str


def _normalize_tag(value: object) -> object:
    # "#Python", " python " va "python" bitta tag bo'lishi kerak.
    if isinstance(value, str):
        return value.strip().lstrip("#").strip().lower()
    return value


TagName = Annotated[
    str,
    BeforeValidator(_normalize_tag),
    StringConstraints(min_length=1, max_length=150),
    Field(description="Tag nomi. Boshidagi `#` olib tashlanadi va kichik harfga o'tkaziladi."),
]
