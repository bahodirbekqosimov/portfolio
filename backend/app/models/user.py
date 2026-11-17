from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, IdMixin, IdType, TimestampMixin, UTCDateTime


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[str | None] = mapped_column(Text)
    banned_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    # Oshirilsa foydalanuvchining barcha eski tokenlari bekor bo'ladi (logout, ban).
    token_version: Mapped[int] = mapped_column(Integer, default=0)


class EmailCodeMixin(IdMixin, CreatedAtMixin):
    """Emailga yuborilgan bir martalik kod. Har bir user uchun bittadan."""

    user_id: Mapped[int] = mapped_column(
        IdType, ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    sent_at: Mapped[datetime] = mapped_column(UTCDateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0)


class EmailVerification(EmailCodeMixin, Base):
    __tablename__ = "email_verifications"


class PasswordReset(EmailCodeMixin, Base):
    __tablename__ = "password_resets"
