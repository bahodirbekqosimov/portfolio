from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from slugify import slugify
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, require_admin
from app.api.v1.blog import _like, serialize_blocks
from app.api.v1.comments import soft_delete
from app.core.storage import delete_file, media_url, save_image
from app.models import (
    BlockType,
    BlogPost,
    Comment,
    CommentComplaint,
    CommentDeleteReason,
    Contact,
    Education,
    Emoji,
    Media,
    PostBlock,
    PostStatus,
    Project,
    Skill,
    Tag,
    User,
    WorkExperience,
)
from app.models.base import utcnow
from app.schemas import admin as schemas
from app.schemas import portfolio as portfolio_schemas
from app.schemas.blog import TagOut
from app.schemas.common import Page, page_of

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


async def _get_or_404(session: AsyncSession, model, item_id: int):
    item = await session.get(model, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    return item


# ---------- Rasm yuklash ----------
@router.post("/uploads/", response_model=schemas.UploadOut, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile):
    """Cover, emoji, project, contact rasmlari uchun. Qaytgan `path`ni tegishli `image` maydoniga yozing."""
    path = await save_image(file, "uploads")
    return schemas.UploadOut(path=path, url=media_url(path))


# ---------- Blog postlar ----------
POST_OPTIONS = (
    selectinload(BlogPost.tags),
    selectinload(BlogPost.media),
    selectinload(BlogPost.blocks).selectinload(PostBlock.media),
)


async def _load_post(session: AsyncSession, post_id: int) -> BlogPost:
    post = await session.scalar(
        select(BlogPost).where(BlogPost.id == post_id).options(*POST_OPTIONS).execution_options(populate_existing=True)
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    return post


def _post_out(post: BlogPost) -> schemas.PostAdminOut:
    return schemas.PostAdminOut(
        id=post.id,
        title=post.title,
        slug=post.slug,
        image=post.image,
        status=post.status,
        content=serialize_blocks(post.blocks),
        tags=[TagOut.model_validate(tag) for tag in post.tags],
        media=[schemas.MediaOut.model_validate(item) for item in post.media],
        views_count=post.views_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at,
    )


async def _unique_slug(session: AsyncSession, title: str) -> str:
    base = slugify(title, max_length=240) or "post"
    slug = base
    suffix = 2
    while await session.scalar(select(BlogPost.id).where(BlogPost.slug == slug)):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


async def _ensure_slug_free(session: AsyncSession, slug: str, post_id: int | None = None) -> None:
    owner = await session.scalar(select(BlogPost.id).where(BlogPost.slug == slug))
    if owner is not None and owner != post_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "This slug is already taken.")


async def _resolve_tags(session: AsyncSession, names: list[str]) -> list[Tag]:
    unique = list(dict.fromkeys(names))
    if not unique:
        return []
    existing = {tag.name: tag for tag in await session.scalars(select(Tag).where(Tag.name.in_(unique)))}
    return [existing.get(name) or Tag(name=name) for name in unique]


async def _replace_blocks(session: AsyncSession, post_id: int, blocks: list) -> None:
    media_ids = {block.media_id for block in blocks if block.type == "image"}
    if media_ids:
        owned = set(
            await session.scalars(select(Media.id).where(Media.post_id == post_id, Media.id.in_(media_ids)))
        )
        if missing := media_ids - owned:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"These images do not belong to this post: {sorted(missing)}"
            )
    await session.execute(delete(PostBlock).where(PostBlock.post_id == post_id))
    for position, block in enumerate(blocks):
        session.add(
            PostBlock(
                post_id=post_id,
                position=position,
                type=BlockType(block.type),
                text=block.text if block.type == "text" else None,
                media_id=block.media_id if block.type == "image" else None,
            )
        )


@router.get("/blog_posts/", response_model=Page[schemas.PostAdminListItem])
async def admin_list_posts(
    session: SessionDep,
    page: PageNumber = 1,
    size: PageSize = 20,
    post_status: Annotated[PostStatus | None, Query(alias="status")] = None,
):
    query = select(BlogPost)
    if post_status:
        query = query.where(BlogPost.status == post_status)
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    posts = await session.scalars(
        query.order_by(BlogPost.created_at.desc(), BlogPost.id.desc()).offset((page - 1) * size).limit(size)
    )
    return page_of(list(posts), total, page, size)


@router.post("/blog_posts/", response_model=schemas.PostAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_post(payload: schemas.PostCreate, session: SessionDep):
    if payload.slug:
        await _ensure_slug_free(session, payload.slug)
    post = BlogPost(
        title=payload.title,
        slug=payload.slug or await _unique_slug(session, payload.title),
        image=payload.image,
        status=payload.status,
        published_at=utcnow() if payload.status == PostStatus.published else None,
        tags=await _resolve_tags(session, payload.tags),
    )
    session.add(post)
    await session.flush()
    await _replace_blocks(session, post.id, payload.content)
    await session.commit()
    return _post_out(await _load_post(session, post.id))


@router.get("/blog_posts/{post_id}/", response_model=schemas.PostAdminOut)
async def admin_get_post(post_id: int, session: SessionDep):
    return _post_out(await _load_post(session, post_id))


@router.patch("/blog_posts/{post_id}/", response_model=schemas.PostAdminOut)
async def admin_update_post(post_id: int, payload: schemas.PostUpdate, session: SessionDep):
    post = await _load_post(session, post_id)
    data = payload.model_dump(exclude_unset=True, exclude={"tags", "content"})
    if data.get("slug"):
        await _ensure_slug_free(session, data["slug"], post.id)
    for field in ("title", "slug", "status"):
        if field in data and data[field] is None:
            del data[field]
    for field, value in data.items():
        setattr(post, field, value)
    if post.status == PostStatus.published and post.published_at is None:
        post.published_at = utcnow()
    if payload.tags is not None:
        post.tags = await _resolve_tags(session, payload.tags)
    if payload.content is not None:
        await _replace_blocks(session, post.id, payload.content)
        post.updated_at = utcnow()
    await session.commit()
    return _post_out(await _load_post(session, post.id))


@router.delete("/blog_posts/{post_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_post(post_id: int, session: SessionDep):
    post = await _load_post(session, post_id)
    files = [item.file for item in post.media]
    await session.execute(delete(BlogPost).where(BlogPost.id == post_id))
    await session.commit()
    for file in files:
        delete_file(file)


@router.post(
    "/blog_posts/{post_id}/media/", response_model=schemas.MediaOut, status_code=status.HTTP_201_CREATED
)
async def admin_upload_media(
    post_id: int,
    file: UploadFile,
    session: SessionDep,
    alt_text: Annotated[str | None, Form(max_length=255)] = None,
):
    await _get_or_404(session, BlogPost, post_id)
    media = Media(post_id=post_id, file=await save_image(file, "posts"), alt_text=alt_text)
    session.add(media)
    await session.commit()
    return media


@router.delete("/media/{media_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_media(media_id: int, session: SessionDep):
    media = await _get_or_404(session, Media, media_id)
    if await session.scalar(select(PostBlock.id).where(PostBlock.media_id == media_id).limit(1)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This image is used in the post content. Remove it from the content first.")
    await session.delete(media)
    await session.commit()
    delete_file(media.file)


# ---------- Taglar ----------
@router.post("/tags/", response_model=TagOut, status_code=status.HTTP_201_CREATED)
async def admin_create_tag(payload: schemas.TagCreate, session: SessionDep):
    tag = Tag(name=payload.name)
    session.add(tag)
    await session.commit()
    return tag


@router.delete("/tags/{tag_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_tag(tag_id: int, session: SessionDep):
    await session.delete(await _get_or_404(session, Tag, tag_id))
    await session.commit()


# ---------- Reaksiyalar (emoji) ----------
@router.get("/emojis/", response_model=list[schemas.EmojiAdminOut])
async def admin_list_emojis(session: SessionDep):
    return list(await session.scalars(select(Emoji).order_by(Emoji.id)))


@router.post("/emojis/", response_model=schemas.EmojiAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_emoji(payload: schemas.EmojiCreate, session: SessionDep):
    emoji = Emoji(**payload.model_dump())
    session.add(emoji)
    await session.commit()
    return emoji


@router.post("/emojis/bulk_delete/", response_model=schemas.EmojiBulkDeleteOut)
async def admin_bulk_delete_emojis(payload: schemas.EmojiBulkDeleteIn, session: SessionDep):
    """Belgilangan emojilarni bitta so'rovda o'chiradi (reaksiyalari bilan). Topilmagan id'lar e'tiborsiz qoldiriladi."""
    ids = set(payload.ids)
    images = list(await session.scalars(select(Emoji.image).where(Emoji.id.in_(ids))))
    await session.execute(delete(Emoji).where(Emoji.id.in_(ids)))
    await session.commit()
    for image in images:
        delete_file(image)
    return schemas.EmojiBulkDeleteOut(deleted=len(images))


@router.patch("/emojis/{emoji_id}/", response_model=schemas.EmojiAdminOut)
async def admin_update_emoji(emoji_id: int, payload: schemas.EmojiUpdate, session: SessionDep):
    emoji = await _get_or_404(session, Emoji, emoji_id)
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(emoji, field, value)
    await session.commit()
    return emoji


@router.delete("/emojis/{emoji_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_emoji(emoji_id: int, session: SessionDep):
    """Emoji bilan unga bosilgan reaksiyalar ham o'chadi. Saqlab qolish uchun is_active=false qiling."""
    emoji = await _get_or_404(session, Emoji, emoji_id)
    await session.execute(delete(Emoji).where(Emoji.id == emoji_id))
    await session.commit()
    delete_file(emoji.image)


# ---------- Foydalanuvchilar va ban ----------
@router.get("/users/", response_model=Page[schemas.UserAdminOut])
async def admin_list_users(
    session: SessionDep,
    page: PageNumber = 1,
    size: PageSize = 20,
    is_banned: bool | None = None,
    search: Annotated[str | None, Query(max_length=100, description="Ism yoki email bo'yicha qidiruv")] = None,
):
    query = select(User)
    if search and search.strip():
        pattern = _like(search.strip())
        query = query.where(User.name.ilike(pattern, escape="\\") | User.email.ilike(pattern, escape="\\"))
    if is_banned is not None:
        query = query.where(User.is_banned.is_(is_banned))
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    users = await session.scalars(query.order_by(User.id.desc()).offset((page - 1) * size).limit(size))
    return page_of(list(users), total, page, size)


@router.post("/users/{user_id}/ban/", response_model=schemas.UserAdminOut)
async def admin_ban_user(user_id: int, payload: schemas.BanIn, session: SessionDep):
    user = await _get_or_404(session, User, user_id)
    if user.is_admin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admins cannot be banned.")
    user.is_banned = True
    user.ban_reason = payload.reason
    user.banned_at = utcnow()
    user.token_version += 1
    if payload.delete_comments:
        await session.execute(
            update(Comment)
            .where(Comment.user_id == user_id, Comment.is_deleted.is_(False))
            .values(is_deleted=True, deleted_reason=CommentDeleteReason.admin, deleted_at=utcnow())
        )
    await session.commit()
    return user


@router.post("/users/{user_id}/unban/", response_model=schemas.UserAdminOut)
async def admin_unban_user(user_id: int, session: SessionDep):
    user = await _get_or_404(session, User, user_id)
    user.is_banned = False
    user.ban_reason = None
    user.banned_at = None
    await session.commit()
    return user


# ---------- Comment moderatsiyasi ----------
@router.get("/comments/", response_model=Page[schemas.CommentAdminOut])
async def admin_list_comments(
    session: SessionDep,
    page: PageNumber = 1,
    size: PageSize = 20,
    complained: Annotated[bool, Query(description="Faqat shikoyat tushganlar, ko'pidan kamiga")] = False,
    is_deleted: bool | None = None,
    search: Annotated[
        str | None, Query(max_length=100, description="Comment matni, muallif ismi yoki post slug'i bo'yicha qidiruv")
    ] = None,
):
    complaints = (
        select(CommentComplaint.comment_id, func.count(CommentComplaint.id).label("total"))
        .group_by(CommentComplaint.comment_id)
        .subquery()
    )
    total_complaints = func.coalesce(complaints.c.total, 0)
    query = (
        select(Comment, BlogPost.slug, User.name, total_complaints.label("complaints_count"))
        .join(BlogPost, BlogPost.id == Comment.post_id)
        .join(User, User.id == Comment.user_id)
        .outerjoin(complaints, complaints.c.comment_id == Comment.id)
    )
    if search and search.strip():
        pattern = _like(search.strip())
        query = query.where(
            Comment.text.ilike(pattern, escape="\\")
            | User.name.ilike(pattern, escape="\\")
            | BlogPost.slug.ilike(pattern, escape="\\")
        )
    if complained:
        query = query.where(complaints.c.total > 0)
    if is_deleted is not None:
        query = query.where(Comment.is_deleted.is_(is_deleted))
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    ordering = [Comment.created_at.desc(), Comment.id.desc()]
    if complained:
        ordering.insert(0, total_complaints.desc())
    rows = await session.execute(query.order_by(*ordering).offset((page - 1) * size).limit(size))
    items = [
        schemas.CommentAdminOut(
            id=comment.id,
            post_slug=slug,
            text=comment.text,
            user_id=comment.user_id,
            user_name=user_name,
            is_deleted=comment.is_deleted,
            deleted_reason=comment.deleted_reason,
            complaints_count=count,
            created_at=comment.created_at,
        )
        for comment, slug, user_name, count in rows
    ]
    return page_of(items, total, page, size)


@router.post("/comments/{comment_id}/restore/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_restore_comment(comment_id: int, session: SessionDep):
    """Noto'g'ri o'chgan commentni qaytaradi. Eski shikoyatlar ham tozalanadi."""
    comment = await _get_or_404(session, Comment, comment_id)
    comment.is_deleted = False
    comment.deleted_reason = None
    comment.deleted_at = None
    await session.execute(delete(CommentComplaint).where(CommentComplaint.comment_id == comment_id))
    await session.commit()


# ---------- Portfolio ----------
def _add_crud(path: str, model, create_schema, update_schema, read_schema, required: tuple[str, ...]) -> None:
    async def list_items(session: SessionDep):
        return list(await session.scalars(select(model).order_by(model.sort_order, model.id)))

    async def create_item(payload: create_schema, session: SessionDep):  # type: ignore[valid-type]
        item = model(**payload.model_dump())
        session.add(item)
        await session.commit()
        return item

    async def update_item(item_id: int, payload: update_schema, session: SessionDep):  # type: ignore[valid-type]
        item = await _get_or_404(session, model, item_id)
        _apply(item, payload, required)
        await session.commit()
        return item

    async def delete_item(item_id: int, session: SessionDep):
        await session.delete(await _get_or_404(session, model, item_id))
        await session.commit()

    router.add_api_route(f"/{path}/", list_items, methods=["GET"], response_model=list[read_schema], name=f"list_{path}")
    router.add_api_route(
        f"/{path}/", create_item, methods=["POST"], response_model=read_schema,
        status_code=status.HTTP_201_CREATED, name=f"create_{path}",
    )
    router.add_api_route(
        f"/{path}/{{item_id}}/", update_item, methods=["PATCH"], response_model=read_schema, name=f"update_{path}"
    )
    router.add_api_route(
        f"/{path}/{{item_id}}/", delete_item, methods=["DELETE"],
        status_code=status.HTTP_204_NO_CONTENT, name=f"delete_{path}",
    )


def _apply(item, payload: BaseModel, required: tuple[str, ...], exclude: set[str] | None = None) -> None:
    """Yuborilgan maydonlarni yozadi. Majburiy maydonga null yuborilsa e'tiborsiz qoldiradi."""
    for field, value in payload.model_dump(exclude_unset=True, exclude=exclude).items():
        if value is None and field in required:
            continue
        setattr(item, field, value)


_add_crud(
    "work_experience", WorkExperience,
    portfolio_schemas.WorkExperienceCreate, portfolio_schemas.WorkExperienceUpdate,
    portfolio_schemas.WorkExperienceAdminOut, ("company", "job_title", "sort_order"),
)
_add_crud(
    "education", Education,
    portfolio_schemas.EducationCreate, portfolio_schemas.EducationUpdate,
    portfolio_schemas.EducationAdminOut, ("institution", "sort_order"),
)
_add_crud(
    "contacts", Contact,
    portfolio_schemas.ContactCreate, portfolio_schemas.ContactUpdate,
    portfolio_schemas.ContactAdminOut, ("name", "data", "sort_order"),
)
_add_crud(
    "skills", Skill,
    portfolio_schemas.SkillCreate, portfolio_schemas.SkillUpdate,
    portfolio_schemas.SkillAdminOut, ("name", "show_home", "sort_order"),
)


async def _load_skills(session: AsyncSession, ids: list[int]) -> list[Skill]:
    skills = list(await session.scalars(select(Skill).where(Skill.id.in_(ids))))
    if missing := set(ids) - {skill.id for skill in skills}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown skill IDs: {sorted(missing)}")
    return skills


async def _load_project(session: AsyncSession, project_id: int) -> Project:
    project = await session.scalar(
        select(Project).where(Project.id == project_id).options(selectinload(Project.skills))
    )
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found.")
    return project


@router.get("/projects/", response_model=list[portfolio_schemas.ProjectAdminOut])
async def admin_list_projects(session: SessionDep):
    return list(
        await session.scalars(
            select(Project).options(selectinload(Project.skills)).order_by(Project.sort_order, Project.id)
        )
    )


@router.post("/projects/", response_model=portfolio_schemas.ProjectAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_project(payload: portfolio_schemas.ProjectCreate, session: SessionDep):
    project = Project(
        **payload.model_dump(exclude={"skill_ids"}),
        skills=await _load_skills(session, payload.skill_ids),
    )
    session.add(project)
    await session.commit()
    return project


@router.patch("/projects/{project_id}/", response_model=portfolio_schemas.ProjectAdminOut)
async def admin_update_project(project_id: int, payload: portfolio_schemas.ProjectUpdate, session: SessionDep):
    project = await _load_project(session, project_id)
    _apply(
        project, payload,
        ("title", "description", "is_active", "show_home", "sort_order"),
        exclude={"skill_ids"},
    )
    if payload.skill_ids is not None:
        project.skills = await _load_skills(session, payload.skill_ids)
    await session.commit()
    return project


@router.delete("/projects/{project_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_project(project_id: int, session: SessionDep):
    await session.delete(await _load_project(session, project_id))
    await session.commit()
