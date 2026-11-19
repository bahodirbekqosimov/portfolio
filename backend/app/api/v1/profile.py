"""Home page uchun profil rasmi va bio. Ikkalasi ham bitta yozuvli (singleton) resurs."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, require_admin
from app.core.cv import CvData, CvExperience, CvProject, cv_filename, parse_contact, render_cv
from app.core.storage import delete_file, save_image
from app.models import SINGLETON_ID, Bio, Contact, Education, ProfileImage, Project, Skill, User, WorkExperience
from app.schemas.profile import BioIn, BioOut, ErrorOut, ProfileImageOut

PROFILE_FOLDER = "profile"

public_router = APIRouter(tags=["profile"])
admin_router = APIRouter(prefix="/admin", tags=["admin: profile"], dependencies=[Depends(require_admin)])

_error = {"model": ErrorOut}
AUTH_ERRORS = {
    status.HTTP_401_UNAUTHORIZED: {**_error, "description": "Token yo'q yoki yaroqsiz."},
    status.HTTP_403_FORBIDDEN: {**_error, "description": "Admin access only."},
}
IMAGE_NOT_FOUND = {status.HTTP_404_NOT_FOUND: {**_error, "description": "No profile image has been uploaded yet."}}
BIO_NOT_FOUND = {status.HTTP_404_NOT_FOUND: {**_error, "description": "No bio has been created yet."}}
UPLOAD_ERRORS = {
    status.HTTP_400_BAD_REQUEST: {**_error, "description": "Fayl rasm emas (JPEG, PNG, WEBP, GIF ruxsat etilgan)."},
    status.HTTP_413_CONTENT_TOO_LARGE: {**_error, "description": "Rasm hajmi ruxsat etilganidan katta."},
}


async def get_profile_image(session: AsyncSession) -> ProfileImage | None:
    return await session.get(ProfileImage, SINGLETON_ID, populate_existing=True)


async def get_bio(session: AsyncSession) -> Bio | None:
    return await session.get(Bio, SINGLETON_ID, populate_existing=True)


async def _image_or_404(session: AsyncSession) -> ProfileImage:
    image = await get_profile_image(session)
    if image is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No profile image has been uploaded yet.")
    return image


async def _bio_or_404(session: AsyncSession) -> Bio:
    bio = await get_bio(session)
    if bio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No bio has been created yet.")
    return bio


# ---------- Public ----------
@public_router.get("/profile/image/", response_model=ProfileImageOut, responses=IMAGE_NOT_FOUND)
async def public_profile_image(session: SessionDep):
    """Home page'dagi profil rasmi. Rasm yo'q bo'lsa 404."""
    return await _image_or_404(session)


@public_router.get("/bio/", response_model=BioOut, responses=BIO_NOT_FOUND)
async def public_bio(session: SessionDep):
    """Home page'dagi bio matni. Bio yo'q bo'lsa 404."""
    return await _bio_or_404(session)


# ---------- Admin: profil rasmi ----------
@admin_router.get(
    "/profile/image/", response_model=ProfileImageOut, responses={**AUTH_ERRORS, **IMAGE_NOT_FOUND}
)
async def admin_get_profile_image(session: SessionDep):
    return await _image_or_404(session)


@admin_router.post(
    "/profile/image/",
    response_model=ProfileImageOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        **AUTH_ERRORS,
        **UPLOAD_ERRORS,
        status.HTTP_409_CONFLICT: {**_error, "description": "Rasm allaqachon bor. Almashtirish uchun PUT ishlating."},
    },
)
async def admin_create_profile_image(file: UploadFile, session: SessionDep):
    """Birinchi marta rasm yuklash (multipart/form-data, maydon: `file`)."""
    if await get_profile_image(session) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A profile image already exists. Use PUT to replace it.")
    path = await save_image(file, PROFILE_FOLDER)
    image = ProfileImage(id=SINGLETON_ID, file=path)
    session.add(image)
    try:
        await session.commit()
    except IntegrityError:
        # Parallel so'rov bizdan oldin yaratib ulgurdi.
        await session.rollback()
        delete_file(path)
        raise HTTPException(status.HTTP_409_CONFLICT, "A profile image already exists. Use PUT to replace it.")
    return image


@admin_router.put(
    "/profile/image/",
    response_model=ProfileImageOut,
    responses={**AUTH_ERRORS, **UPLOAD_ERRORS, **IMAGE_NOT_FOUND},
)
async def admin_replace_profile_image(file: UploadFile, session: SessionDep):
    """Mavjud rasmni yangisiga almashtiradi (multipart/form-data, maydon: `file`). Eski fayl o'chadi."""
    image = await _image_or_404(session)
    old = image.file
    image.file = await save_image(file, PROFILE_FOLDER)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        delete_file(image.file)
        raise
    delete_file(old)
    return image


@admin_router.delete(
    "/profile/image/", status_code=status.HTTP_204_NO_CONTENT, responses={**AUTH_ERRORS, **IMAGE_NOT_FOUND}
)
async def admin_delete_profile_image(session: SessionDep):
    image = await _image_or_404(session)
    file = image.file
    await session.execute(delete(ProfileImage).where(ProfileImage.id == SINGLETON_ID))
    await session.commit()
    delete_file(file)


# ---------- Admin: bio ----------
@admin_router.get("/bio/", response_model=BioOut, responses={**AUTH_ERRORS, **BIO_NOT_FOUND})
async def admin_get_bio(session: SessionDep):
    return await _bio_or_404(session)


@admin_router.post(
    "/bio/",
    response_model=BioOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        **AUTH_ERRORS,
        status.HTTP_409_CONFLICT: {**_error, "description": "A bio already exists. Use PATCH to update it."},
    },
)
async def admin_create_bio(payload: BioIn, session: SessionDep):
    if await get_bio(session) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A bio already exists. Use PATCH to update it.")
    bio = Bio(id=SINGLETON_ID, content=payload.content, headline=payload.headline)
    session.add(bio)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "A bio already exists. Use PATCH to update it.")
    return bio


@admin_router.patch("/bio/", response_model=BioOut, responses={**AUTH_ERRORS, **BIO_NOT_FOUND})
async def admin_update_bio(payload: BioIn, session: SessionDep):
    bio = await _bio_or_404(session)
    bio.content = payload.content
    if "headline" in payload.model_fields_set:
        bio.headline = payload.headline
    await session.commit()
    return bio


@admin_router.delete("/bio/", status_code=status.HTTP_204_NO_CONTENT, responses={**AUTH_ERRORS, **BIO_NOT_FOUND})
async def admin_delete_bio(session: SessionDep):
    """Bio o'chiriladi. Keyin POST bilan yana yaratish mumkin."""
    await _bio_or_404(session)
    await session.execute(delete(Bio).where(Bio.id == SINGLETON_ID))
    await session.commit()


# ---------- CV ----------
async def collect_cv_data(session: AsyncSession) -> CvData:
    """CV faqat portfolio ma'lumotlaridan yig'iladi (home page bilan bir xil manbalar)."""
    admin = await session.scalar(select(User).where(User.is_admin).order_by(User.id).limit(1))
    bio = await get_bio(session)
    contacts = await session.scalars(select(Contact).order_by(Contact.sort_order, Contact.id))
    experience = await session.scalars(select(WorkExperience).order_by(WorkExperience.sort_order, WorkExperience.id))
    projects = await session.scalars(
        select(Project)
        .where(Project.show_home, Project.is_active)
        .options(selectinload(Project.skills))
        .order_by(Project.sort_order, Project.id)
    )
    skills = await session.scalars(select(Skill).where(Skill.show_home).order_by(Skill.sort_order, Skill.id))
    education = await session.scalars(select(Education).order_by(Education.sort_order, Education.id))
    return CvData(
        name=admin.name if admin else "Portfolio",
        headline=bio.headline if bio else None,
        contacts=[parse_contact(c.name, c.data) for c in contacts],
        bio=bio.content if bio else None,
        experience=[
            CvExperience(e.job_title, e.company, e.description, e.start_date, e.end_date) for e in experience
        ],
        projects=[
            CvProject(p.title, p.description, p.link, [s.name for s in p.skills]) for p in projects
        ],
        skills=[s.name for s in skills],
        education=[
            CvExperience(e.degree or "", e.institution, e.description, e.start_date, e.end_date) for e in education
        ],
    )


@public_router.get(
    "/cv/",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "CV, PDF fayl (A4)."}},
)
async def download_cv(
    session: SessionDep,
    download: Annotated[
        bool, Query(description="true: fayl sifatida yuklab olinadi; false: brauzerda ochiladi (preview).")
    ] = True,
):
    """Portfolio'dan avtomatik yig'iladigan CV.

    Manbalar: admin ismi, bio va headline, contacts, work experience, education, `show_home=true` va faol
    projectlar, `show_home=true` skilllar. Alohida saqlanmaydi, har so'rovda yangidan yasaladi.
    """
    data = await collect_cv_data(session)
    pdf = await run_in_threadpool(render_cv, data)
    disposition = "attachment" if download else "inline"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{cv_filename(data.name)}"',
            "Cache-Control": "no-store",
        },
    )
