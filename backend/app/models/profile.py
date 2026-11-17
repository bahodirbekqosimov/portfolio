from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdType, TimestampMixin

# Bu jadvallarda faqat bitta yozuv bo'ladi: id doim 1.
# O'chirilgandan keyin id=1 bo'shaydi va yana yaratish mumkin.
SINGLETON_ID = 1


class SingletonMixin:
    id: Mapped[int] = mapped_column(IdType, primary_key=True, autoincrement=False, default=SINGLETON_ID)


class ProfileImage(SingletonMixin, TimestampMixin, Base):
    """Home page'dagi portret rasm. Bir vaqtda faqat bitta."""

    __tablename__ = "profile_images"
    __table_args__ = (CheckConstraint(f"id = {SINGLETON_ID}", name="single_row"),)

    file: Mapped[str] = mapped_column(String(255))


class Bio(SingletonMixin, TimestampMixin, Base):
    """Home page'dagi tanishtiruv matni. Bir vaqtda faqat bitta."""

    __tablename__ = "bios"
    __table_args__ = (CheckConstraint(f"id = {SINGLETON_ID}", name="single_row"),)

    content: Mapped[str] = mapped_column(Text)
    # Ism ostidagi qisqa lavozim: home page va CV'da chiqadi (masalan "Python Backend Engineer").
    headline: Mapped[str | None] = mapped_column(String(120))
