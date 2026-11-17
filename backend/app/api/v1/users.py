from typing import Annotated

from fastapi import APIRouter, Query, UploadFile
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.storage import delete_file, save_image
from app.models import BlogPost, Bookmark, PostStatus
from app.schemas.auth import UserMe, UserUpdateIn
from app.schemas.blog import PostListItem
from app.schemas.common import Page, page_of

router = APIRouter(prefix="/users/me", tags=["users"])


@router.get("/", response_model=UserMe)
async def me(user: CurrentUser):
    return user


@router.patch("/", response_model=UserMe)
async def update_me(payload: UserUpdateIn, user: CurrentUser, session: SessionDep):
    user.name = payload.name
    await session.commit()
    return user


@router.put("/avatar/", response_model=UserMe)
async def update_avatar(file: UploadFile, user: CurrentUser, session: SessionDep):
    old = user.avatar
    user.avatar = await save_image(file, "avatars")
    await session.commit()
    delete_file(old)
    return user


@router.get("/bookmarks/", response_model=Page[PostListItem])
async def my_bookmarks(
    user: CurrentUser,
    session: SessionDep,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=50)] = 10,
):
    query = (
        select(BlogPost)
        .join(Bookmark, Bookmark.post_id == BlogPost.id)
        .where(Bookmark.user_id == user.id, BlogPost.status == PostStatus.published)
    )
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    posts = await session.scalars(
        query.order_by(Bookmark.created_at.desc(), Bookmark.id.desc()).offset((page - 1) * size).limit(size)
    )
    return page_of(list(posts), total, page, size)
