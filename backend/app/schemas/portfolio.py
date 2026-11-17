from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import UserPublic
from app.schemas.common import MediaPathIn, MediaUrl, ORMModel, Trimmed
from app.schemas.profile import BioOut, ProfileImageOut


# --- O'qish (public) ---
class SkillOut(ORMModel):
    id: int
    name: str


class ProjectOut(ORMModel):
    id: int
    title: str
    description: str
    image: MediaUrl
    link: str | None
    skills: list[SkillOut]


class WorkExperienceOut(ORMModel):
    id: int
    company: str
    job_title: str
    description: str | None
    start_date: date | None
    end_date: date | None


class EducationOut(ORMModel):
    id: int
    institution: str
    degree: str | None
    description: str | None
    start_date: date | None
    end_date: date | None


class ContactOut(ORMModel):
    id: int
    name: str
    data: str
    image: MediaUrl


class HomeOut(BaseModel):
    profile: UserPublic | None
    profile_image: ProfileImageOut | None = Field(
        default=None, description="Admin paneldan yuklangan profil rasmi. Yo'q bo'lsa null."
    )
    bio: BioOut | None = Field(default=None, description="Admin paneldan yozilgan bio. Yo'q bo'lsa null.")
    work_experience: list[WorkExperienceOut]
    projects: list[ProjectOut]
    skills: list[SkillOut]
    contacts: list[ContactOut]
    education: list[EducationOut]


# --- Admin: yaratish / o'zgartirish ---
class SkillCreate(BaseModel):
    name: Trimmed(255)
    show_home: bool = False
    sort_order: int = 0


class SkillUpdate(BaseModel):
    name: Trimmed(255) | None = None
    show_home: bool | None = None
    sort_order: int | None = None


class SkillAdminOut(SkillOut):
    show_home: bool
    sort_order: int


class ProjectCreate(BaseModel):
    title: Trimmed(255)
    description: str
    image: MediaPathIn = None
    link: str | None = Field(default=None, max_length=255)
    is_active: bool = True
    show_home: bool = False
    sort_order: int = 0
    skill_ids: list[int] = []


class ProjectUpdate(BaseModel):
    title: Trimmed(255) | None = None
    description: str | None = None
    image: MediaPathIn = None
    link: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    show_home: bool | None = None
    sort_order: int | None = None
    skill_ids: list[int] | None = None


class ProjectAdminOut(ProjectOut):
    is_active: bool
    show_home: bool
    sort_order: int


class WorkExperienceCreate(BaseModel):
    company: Trimmed(255)
    job_title: Trimmed(255)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    sort_order: int = 0


class WorkExperienceUpdate(BaseModel):
    company: Trimmed(255) | None = None
    job_title: Trimmed(255) | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    sort_order: int | None = None


class WorkExperienceAdminOut(WorkExperienceOut):
    sort_order: int


class EducationCreate(BaseModel):
    institution: Trimmed(255)
    degree: str | None = Field(default=None, max_length=255)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    sort_order: int = 0


class EducationUpdate(BaseModel):
    institution: Trimmed(255) | None = None
    degree: str | None = Field(default=None, max_length=255)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    sort_order: int | None = None


class EducationAdminOut(EducationOut):
    sort_order: int


class ContactCreate(BaseModel):
    name: Trimmed(255)
    data: Trimmed(255)
    image: MediaPathIn = None
    sort_order: int = 0


class ContactUpdate(BaseModel):
    name: Trimmed(255) | None = None
    data: Trimmed(255) | None = None
    image: MediaPathIn = None
    sort_order: int | None = None


class ContactAdminOut(ContactOut):
    sort_order: int
