from datetime import date, datetime, time, timedelta, UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, exists, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, OptionalUser, SessionDep
from app.core.rate_limit import rate_limit
from app.models import (
    BlockType,
    BlogPost,
    Bookmark,
    Comment,
    Emoji,
    PostBlock,
    PostStatus,
    Reaction,
    Tag,
    User,
    post_tags,
)
from app.schemas.auth import UserPublic
from app.schemas.blog import (
    BookmarkToggleOut,
    CommentCreateIn,
    CommentOut,
    CommentReply,
    EmojiOut,
    ImageBlockOut,
    PostDetail,
    PostListItem,
    ReactionSummary,
    ReactionToggleIn,
    ReactionToggleOut,
    TagWithCount,
    TextBlockOut,
)
from app.schemas.common import Page, page_of

router = APIRouter(tags=["blog"])

PUBLISHED = BlogPost.status == PostStatus.published


def serialize_blocks(blocks: list[PostBlock]) -> list[TextBlockOut | ImageBlockOut]:
    return [
        TextBlockOut(text=block.text)
        if block.type == BlockType.text
        else ImageBlockOut(media_id=block.media_id, url=block.media.file, alt_text=block.media.alt_text)
        for block in blocks
    ]


def _like(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


async def _get_published_post(session: AsyncSession, slug: str) -> BlogPost:
    post = await session.scalar(select(BlogPost).where(BlogPost.slug == slug, PUBLISHED))
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    return post


async def reaction_summary(
    session: AsyncSession, post_id: int, user: User | None
) -> list[ReactionSummary]:
    """Faqat kamida 1 marta bosilgan reaksiyalar, ko'pidan kamiga qarab."""
    count = func.count(Reaction.id)
    rows = await session.execute(
        select(Emoji.id, Emoji.name, Emoji.image, count)
        .join(Reaction, Reaction.emoji_id == Emoji.id)
        .where(Reaction.post_id == post_id, Emoji.is_active)
        .group_by(Emoji.id, Emoji.name, Emoji.image)
        .order_by(count.desc(), Emoji.id)
    )
    mine: set[int] = set()
    if user:
        mine = set(
            await session.scalars(
                select(Reaction.emoji_id).where(Reaction.post_id == post_id, Reaction.user_id == user.id)
            )
        )
    return [
        ReactionSummary(emoji_id=id_, name=name, image=image, count=total, reacted_by_me=id_ in mine)
        for id_, name, image, total in rows
    ]


@router.get("/tags/", response_model=list[TagWithCount])
async def list_tags(session: SessionDep):
    """Faqat chop etilgan postlari bor taglar."""
    rows = await session.execute(
        select(Tag.id, Tag.name, func.count(post_tags.c.post_id))
        .join(post_tags, post_tags.c.tag_id == Tag.id)
        .join(BlogPost, BlogPost.id == post_tags.c.post_id)
        .where(PUBLISHED)
        .group_by(Tag.id, Tag.name)
        .order_by(Tag.name)
    )
    return [TagWithCount(id=id_, name=name, posts_count=total) for id_, name, total in rows]


@router.get("/emojis/", response_model=list[EmojiOut])
async def list_emojis(session: SessionDep):
    """Foydalanuvchi tanlashi mumkin bo'lgan reaksiyalar."""
    return list(await session.scalars(select(Emoji).where(Emoji.is_active).order_by(Emoji.id)))


@router.get("/blog_posts/", response_model=Page[PostListItem])
async def list_posts(
    session: SessionDep,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=50)] = 10,
    search: Annotated[str | None, Query(max_length=200, description="Sarlavha va matn bo'yicha")] = None,
    tag: Annotated[list[str] | None, Query(description="Bir nechta berilsa: istalgan biri mos kelsa")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = select(BlogPost).where(PUBLISHED, BlogPost.published_at.is_not(None))
    if search and search.strip():
        pattern = _like(search.strip())
        query = query.where(
            or_(
                BlogPost.title.ilike(pattern, escape="\\"),
                exists().where(
                    and_(PostBlock.post_id == BlogPost.id, PostBlock.text.ilike(pattern, escape="\\"))
                ),
            )
        )
    if tag:
        query = query.where(BlogPost.tags.any(Tag.name.in_(tag)))
    if date_from:
        query = query.where(BlogPost.published_at >= datetime.combine(date_from, time.min, UTC))
    if date_to:
        next_day = datetime.combine(date_to + timedelta(days=1), time.min, UTC)
        query = query.where(BlogPost.published_at < next_day)

    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    posts = await session.scalars(
        query.order_by(BlogPost.published_at.desc(), BlogPost.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return page_of(list(posts), total, page, size)


@router.get("/blog_posts/{slug}/", response_model=PostDetail)
async def post_detail(slug: str, session: SessionDep, user: OptionalUser):
    post = await session.scalar(
        select(BlogPost)
        .where(BlogPost.slug == slug, PUBLISHED)
        .options(
            selectinload(BlogPost.tags),
            selectinload(BlogPost.blocks).selectinload(PostBlock.media),
        )
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")

    views = await session.scalar(
        update(BlogPost)
        .where(BlogPost.id == post.id)
        .values(views_count=BlogPost.views_count + 1, updated_at=BlogPost.updated_at)
        .returning(BlogPost.views_count)
    )
    await session.commit()

    comments_count = await session.scalar(
        select(func.count(Comment.id)).where(Comment.post_id == post.id, Comment.is_deleted.is_(False))
    )
    is_bookmarked = bool(user) and bool(
        await session.scalar(
            select(Bookmark.id).where(Bookmark.post_id == post.id, Bookmark.user_id == user.id)
        )
    )
    return PostDetail(
        title=post.title,
        slug=post.slug,
        image=post.image,
        content=serialize_blocks(post.blocks),
        tags=post.tags,
        views_count=views,
        published_at=post.published_at,
        updated_at=post.updated_at,
        reactions=await reaction_summary(session, post.id, user),
        comments_count=comments_count,
        is_bookmarked=is_bookmarked,
    )


@router.post(
    "/blog_posts/{slug}/reactions/",
    response_model=ReactionToggleOut,
    dependencies=[Depends(rate_limit("reaction", 60))],
)
async def toggle_reaction(slug: str, payload: ReactionToggleIn, session: SessionDep, user: CurrentUser):
    """Bir marta bosilsa qo'shiladi, yana bosilsa olib tashlanadi."""
    post = await _get_published_post(session, slug)
    emoji = await session.scalar(select(Emoji).where(Emoji.id == payload.emoji_id, Emoji.is_active))
    if emoji is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This reaction does not exist.")

    condition = and_(
        Reaction.post_id == post.id, Reaction.user_id == user.id, Reaction.emoji_id == emoji.id
    )
    existed = await session.scalar(select(Reaction.id).where(condition))
    if existed:
        await session.execute(delete(Reaction).where(Reaction.id == existed))
        await session.commit()
    else:
        session.add(Reaction(post_id=post.id, user_id=user.id, emoji_id=emoji.id))
        try:
            await session.commit()
        except IntegrityError:  # ikki marta tez bosilganda
            await session.rollback()
    return ReactionToggleOut(
        reacted=not existed, reactions=await reaction_summary(session, post.id, user)
    )


@router.post("/blog_posts/{slug}/bookmark/", response_model=BookmarkToggleOut)
async def toggle_bookmark(slug: str, session: SessionDep, user: CurrentUser):
    post = await _get_published_post(session, slug)
    existed = await session.scalar(
        select(Bookmark.id).where(Bookmark.post_id == post.id, Bookmark.user_id == user.id)
    )
    if existed:
        await session.execute(delete(Bookmark).where(Bookmark.id == existed))
        await session.commit()
    else:
        session.add(Bookmark(post_id=post.id, user_id=user.id))
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
    return BookmarkToggleOut(bookmarked=not existed)


def _reply_out(comment: Comment) -> CommentReply:
    return CommentReply(
        id=comment.id,
        text=None if comment.is_deleted else comment.text,
        is_deleted=comment.is_deleted,
        user=None if comment.is_deleted else UserPublic.model_validate(comment.user),
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get("/blog_posts/{slug}/comments/", response_model=Page[CommentOut])
async def list_comments(
    slug: str,
    session: SessionDep,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=50)] = 20,
):
    """O'chirilgan comment javoblari bo'lsagina bo'sh joy sifatida qoladi (text=null)."""
    post = await _get_published_post(session, slug)
    reply = Comment.__table__.alias("reply")
    query = select(Comment).where(
        Comment.post_id == post.id,
        Comment.parent_id.is_(None),
        or_(
            Comment.is_deleted.is_(False),
            exists().where(and_(reply.c.parent_id == Comment.id, reply.c.is_deleted.is_(False))),
        ),
    )
    total = await session.scalar(select(func.count()).select_from(query.subquery()))
    roots = list(
        await session.scalars(
            query.options(selectinload(Comment.user))
            .order_by(Comment.created_at.desc(), Comment.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
    )
    replies_by_root: dict[int, list[CommentReply]] = {}
    if roots:
        replies = await session.scalars(
            select(Comment)
            .where(Comment.parent_id.in_([root.id for root in roots]), Comment.is_deleted.is_(False))
            .options(selectinload(Comment.user))
            .order_by(Comment.created_at, Comment.id)
        )
        for item in replies:
            replies_by_root.setdefault(item.parent_id, []).append(_reply_out(item))
    items = [
        CommentOut(**_reply_out(root).model_dump(), replies=replies_by_root.get(root.id, []))
        for root in roots
    ]
    return page_of(items, total, page, size)


@router.post(
    "/blog_posts/{slug}/comments/",
    response_model=CommentReply,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("comment", 10))],
)
async def create_comment(slug: str, payload: CommentCreateIn, session: SessionDep, user: CurrentUser):
    post = await _get_published_post(session, slug)
    parent_id = None
    if payload.parent_id is not None:
        parent = await session.get(Comment, payload.parent_id)
        if parent is None or parent.post_id != post.id or parent.is_deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "The comment you are replying to was not found.")
        # Daraxt 2 darajadan chuqurlashmaydi: javobga javob ham asosiy commentga bog'lanadi.
        parent_id = parent.parent_id or parent.id
    comment = Comment(post_id=post.id, user_id=user.id, parent_id=parent_id, text=payload.text, user=user)
    session.add(comment)
    await session.commit()
    return _reply_out(comment)
