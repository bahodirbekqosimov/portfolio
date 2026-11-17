from datetime import date

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, IdMixin, IdType

project_skills = Table(
    "project_skills",
    Base.metadata,
    Column("project_id", IdType, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", IdType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class SortOrderMixin:
    # Admin o'zi tartibni belgilaydi: kichik son birinchi chiqadi.
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Skill(IdMixin, CreatedAtMixin, SortOrderMixin, Base):
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(255), unique=True)
    show_home: Mapped[bool] = mapped_column(Boolean, default=False)


class Project(IdMixin, CreatedAtMixin, SortOrderMixin, Base):
    __tablename__ = "projects"

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    image: Mapped[str | None] = mapped_column(String(255))
    link: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    show_home: Mapped[bool] = mapped_column(Boolean, default=False)

    skills: Mapped[list[Skill]] = relationship(secondary=project_skills, order_by=Skill.sort_order)


class WorkExperience(IdMixin, CreatedAtMixin, SortOrderMixin, Base):
    __tablename__ = "work_experiences"

    company: Mapped[str] = mapped_column(String(255))
    job_title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)  # None = hozirgacha


class Education(IdMixin, CreatedAtMixin, SortOrderMixin, Base):
    __tablename__ = "educations"

    institution: Mapped[str] = mapped_column(String(255))
    degree: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)


class Contact(IdMixin, CreatedAtMixin, SortOrderMixin, Base):
    __tablename__ = "contacts"

    name: Mapped[str] = mapped_column(String(255))
    data: Mapped[str] = mapped_column(String(255))
    image: Mapped[str | None] = mapped_column(String(255))
