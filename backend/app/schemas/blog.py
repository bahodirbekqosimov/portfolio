from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.auth import UserPublic
from app.schemas.common import MediaUrl, ORMModel, RequiredMediaUrl, Trimmed


class TagOut(ORMModel):
    id: int
    name: str


class TagWithCount(TagOut):
    posts_count: int


class PostListItem(ORMModel):
    title: str
    slug: str
    published_at: datetime | None


class TextBlockOut(BaseModel):
    type: Literal["text"] = "text"
    text: str


class MediaBlockOut(BaseModel):
    """Rasm, video, audio yoki yuklab olinadigan fayl. `type` faylning turiga qarab keladi."""

    type: Literal["image", "video", "audio", "file"] = "image"
    media_id: int
    url: RequiredMediaUrl
    alt_text: str | None
    name: str | None = None
    mime: str | None = None
    size: int | None = None


# Eski nom: rasm bloklari ham shu model.
ImageBlockOut = MediaBlockOut

ContentBlockOut = Annotated[TextBlockOut | MediaBlockOut, Field(discriminator="type")]


class ReactionSummary(BaseModel):
    emoji_id: int
    name: str
    image: RequiredMediaUrl
    count: int
    reacted_by_me: bool


class PostDetail(BaseModel):
    title: str
    slug: str
    image: MediaUrl
    content: list[ContentBlockOut]
    tags: list[TagOut]
    views_count: int
    published_at: datetime | None
    updated_at: datetime
    reactions: list[ReactionSummary]
    comments_count: int
    is_bookmarked: bool


class EmojiOut(ORMModel):
    id: int
    name: str
    image: RequiredMediaUrl


class ReactionToggleIn(BaseModel):
    emoji_id: int


class ReactionToggleOut(BaseModel):
    reacted: bool
    reactions: list[ReactionSummary]


class BookmarkToggleOut(BaseModel):
    bookmarked: bool


class CommentCreateIn(BaseModel):
    text: Trimmed(2000)
    parent_id: int | None = None


class CommentUpdateIn(BaseModel):
    text: Trimmed(2000)


class CommentReply(BaseModel):
    id: int
    text: str | None
    is_deleted: bool
    user: UserPublic | None
    created_at: datetime
    updated_at: datetime


class CommentOut(CommentReply):
    replies: list[CommentReply] = []


class ComplaintIn(BaseModel):
    reason: Annotated[str | None, Field(max_length=255)] = None


class ComplaintOut(BaseModel):
    complaints_count: int
    comment_deleted: bool
