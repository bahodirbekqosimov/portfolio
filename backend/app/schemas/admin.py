from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.models import PostStatus
from app.schemas.blog import ContentBlockOut, TagOut
from app.schemas.common import MediaPathIn, MediaUrl, ORMModel, RequiredMediaPathIn, RequiredMediaUrl, TagName, Trimmed

Slug = Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=255)]


class TextBlockIn(BaseModel):
    type: Literal["text"]
    text: Annotated[str, Field(min_length=1)]


class ImageBlockIn(BaseModel):
    type: Literal["image"]
    media_id: int


ContentBlockIn = Annotated[TextBlockIn | ImageBlockIn, Field(discriminator="type")]


class PostCreate(BaseModel):
    """Yangi postda rasm bloklari bo'lmaydi: avval post, keyin media, so'ng content PATCH qilinadi."""

    title: Trimmed(255)
    slug: Slug | None = None
    image: MediaPathIn = None
    status: PostStatus = PostStatus.draft
    tags: list[TagName] = []
    content: list[TextBlockIn] = []


class PostUpdate(BaseModel):
    title: Trimmed(255) | None = None
    slug: Slug | None = None
    image: MediaPathIn = None
    status: PostStatus | None = None
    tags: list[TagName] | None = None
    content: list[ContentBlockIn] | None = None


class MediaOut(ORMModel):
    id: int
    url: RequiredMediaUrl = Field(validation_alias="file")
    alt_text: str | None


class PostAdminOut(BaseModel):
    id: int
    title: str
    slug: str
    image: MediaUrl
    status: PostStatus
    content: list[ContentBlockOut]
    tags: list[TagOut]
    media: list[MediaOut]
    views_count: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class PostAdminListItem(ORMModel):
    id: int
    title: str
    slug: str
    status: PostStatus
    views_count: int
    created_at: datetime
    published_at: datetime | None


class UploadOut(BaseModel):
    path: str
    url: str


class TagCreate(BaseModel):
    name: TagName


class EmojiCreate(BaseModel):
    name: Trimmed(50)
    image: RequiredMediaPathIn
    is_active: bool = True


class EmojiUpdate(BaseModel):
    name: Trimmed(50) | None = None
    image: MediaPathIn = None
    is_active: bool | None = None


class EmojiAdminOut(ORMModel):
    id: int
    name: str
    image: RequiredMediaUrl
    is_active: bool


class UserAdminOut(ORMModel):
    id: int
    email: str
    name: str
    avatar: MediaUrl
    is_active: bool
    is_admin: bool
    is_verified: bool
    is_banned: bool
    ban_reason: str | None
    banned_at: datetime | None
    created_at: datetime


class BanIn(BaseModel):
    reason: Annotated[str | None, Field(max_length=500)] = None
    delete_comments: bool = False


class CommentAdminOut(BaseModel):
    id: int
    post_slug: str
    text: str
    user_id: int
    user_name: str
    is_deleted: bool
    deleted_reason: str | None
    complaints_count: int
    created_at: datetime
