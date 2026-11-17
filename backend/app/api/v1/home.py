from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.api.v1.profile import get_bio, get_profile_image
from app.models import Contact, Education, Project, Skill, User, WorkExperience
from app.schemas.portfolio import HomeOut, ProjectOut

router = APIRouter(tags=["home"])


async def _ordered(session, model):
    return list(await session.scalars(select(model).order_by(model.sort_order, model.id)))


@router.get("/home/", response_model=HomeOut)
async def home(session: SessionDep):
    # Rasm va ism birinchi admin akkauntidan olinadi.
    admin = await session.scalar(select(User).where(User.is_admin).order_by(User.id).limit(1))
    projects = await session.scalars(
        select(Project)
        .where(Project.show_home, Project.is_active)
        .options(selectinload(Project.skills))
        .order_by(Project.sort_order, Project.id)
    )
    skills = await session.scalars(
        select(Skill).where(Skill.show_home).order_by(Skill.sort_order, Skill.id)
    )
    return HomeOut(
        profile=admin,
        profile_image=await get_profile_image(session),
        bio=await get_bio(session),
        work_experience=await _ordered(session, WorkExperience),
        projects=list(projects),
        skills=list(skills),
        contacts=await _ordered(session, Contact),
        education=await _ordered(session, Education),
    )


@router.get("/projects/", response_model=list[ProjectOut])
async def projects(session: SessionDep):
    """Barcha faol loyihalar (show_home'dan qat'iy nazar)."""
    result = await session.scalars(
        select(Project)
        .where(Project.is_active)
        .options(selectinload(Project.skills))
        .order_by(Project.sort_order, Project.id)
    )
    return list(result)
