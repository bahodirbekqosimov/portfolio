import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, IdMixin, IdType, TimestampMixin, UTCDateTime
from app.models.user import User


class PostStatus(enum.StrEnum):
    draft = "draft"
    published = "published"


class BlockType(enum.StrEnum):
    text = "text"
    image = "image"


class CommentDeleteReason(enum.StrEnum):
    author = "author"
    admin = "admin"
    complaints = "complaints"


def _enum(enum_class: type[enum.Enum], name: str) -> Enum:
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        length=20,
        create_constraint=True,
        values_callable=lambda items: [item.value for item in items],
    )


post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", IdType, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Tag(IdMixin, Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(150), unique=True)


class BlogPost(IdMixin, TimestampMixin, Base):
    __tablename__ = "blog_posts"
    __table_args__ = (Index("ix_blog_posts_status_published_at", "status", "published_at"),)

    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    image: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[PostStatus] = mapped_column(_enum(PostStatus, "post_status"), default=PostStatus.draft)
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    tags: Mapped[list[Tag]] = relationship(secondary=post_tags, order_by=Tag.name)
    blocks: Mapped[list["PostBlock"]] = relationship(
        order_by="PostBlock.position", cascade="all, delete-orphan", passive_deletes=True
    )
    media: Mapped[list["Media"]] = relationship(
        order_by="Media.id", cascade="all, delete-orphan", passive_deletes=True
    )


class Media(IdMixin, CreatedAtMixin, Base):
    """Postga tegishli yuklangan rasm."""

    __tablename__ = "media"

    post_id: Mapped[int] = mapped_column(
        IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"), index=True
    )
    file: Mapped[str] = mapped_column(String(255))
    alt_text: Mapped[str | None] = mapped_column(String(255))


class PostBlock(IdMixin, Base):
    """Post matni ketma-ket bloklardan iborat: matn, rasm, rasm, matn..."""

    __tablename__ = "post_blocks"
    __table_args__ = (
        UniqueConstraint("post_id", "position"),
        CheckConstraint(
            "(type = 'text' AND text IS NOT NULL AND media_id IS NULL) OR "
            "(type = 'image' AND media_id IS NOT NULL AND text IS NULL)",
            name="content_matches_type",
        ),
    )

    post_id: Mapped[int] = mapped_column(IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    type: Mapped[BlockType] = mapped_column(_enum(BlockType, "block_type"))
    text: Mapped[str | None] = mapped_column(Text)
    # Postda ishlatilayotgan rasmni alohida o'chirib bo'lmaydi (ondelete yo'q = NO ACTION).
    media_id: Mapped[int | None] = mapped_column(IdType, ForeignKey("media.id"), index=True)

    media: Mapped[Media | None] = relationship()


class Emoji(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "emojis"

    name: Mapped[str] = mapped_column(String(50), unique=True)
    image: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Reaction(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "reactions"
    # Bitta foydalanuvchi bitta postga faqat bitta reaksiya qo'ya oladi.
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_reactions_post_user"),)

    post_id: Mapped[int] = mapped_column(IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(IdType, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    emoji_id: Mapped[int] = mapped_column(IdType, ForeignKey("emojis.id", ondelete="CASCADE"), index=True)


class Comment(IdMixin, TimestampMixin, Base):
    __tablename__ = "comments"
    __table_args__ = (Index("ix_comments_post_parent_created", "post_id", "parent_id", "created_at"),)

    post_id: Mapped[int] = mapped_column(IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(IdType, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(
        IdType, ForeignKey("comments.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_reason: Mapped[CommentDeleteReason | None] = mapped_column(
        _enum(CommentDeleteReason, "comment_delete_reason")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    user: Mapped[User] = relationship()


class CommentComplaint(IdMixin, CreatedAtMixin, Base):
    """Bitta user bitta commentga faqat bir marta shikoyat qila oladi."""

    __tablename__ = "comment_complaints"
    __table_args__ = (UniqueConstraint("comment_id", "user_id"),)

    comment_id: Mapped[int] = mapped_column(IdType, ForeignKey("comments.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(IdType, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str | None] = mapped_column(String(255))


class Bookmark(IdMixin, CreatedAtMixin, Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "post_id"),)

    user_id: Mapped[int] = mapped_column(IdType, ForeignKey("users.id", ondelete="CASCADE"))
    post_id: Mapped[int] = mapped_column(IdType, ForeignKey("blog_posts.id", ondelete="CASCADE"), index=True)

    post: Mapped[BlogPost] = relationship()
