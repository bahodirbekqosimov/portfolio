from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.api.v1.blog import _reply_out
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.models import Comment, CommentComplaint, CommentDeleteReason
from app.models.base import utcnow
from app.schemas.blog import CommentReply, CommentUpdateIn, ComplaintIn, ComplaintOut

router = APIRouter(prefix="/comments", tags=["comments"])


def soft_delete(comment: Comment, reason: CommentDeleteReason) -> None:
    comment.is_deleted = True
    comment.deleted_reason = reason
    comment.deleted_at = utcnow()


async def _get_live_comment(session: AsyncSession, comment_id: int, *, lock: bool = False) -> Comment:
    query = select(Comment).where(Comment.id == comment_id, Comment.is_deleted.is_(False))
    if lock:
        # Bir vaqtda kelgan shikoyatlar sanog'i to'g'ri bo'lishi uchun (Postgres'da ishlaydi).
        query = query.with_for_update()
    comment = await session.scalar(query.options(selectinload(Comment.user)))
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    return comment


@router.patch("/{comment_id}/", response_model=CommentReply)
async def update_comment(comment_id: int, payload: CommentUpdateIn, session: SessionDep, user: CurrentUser):
    comment = await _get_live_comment(session, comment_id)
    if comment.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own comments.")
    comment.text = payload.text
    await session.commit()
    return _reply_out(comment)


@router.delete("/{comment_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: int, session: SessionDep, user: CurrentUser):
    comment = await _get_live_comment(session, comment_id)
    if comment.user_id == user.id:
        soft_delete(comment, CommentDeleteReason.author)
    elif user.is_admin:
        soft_delete(comment, CommentDeleteReason.admin)
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot delete this comment.")
    await session.commit()


@router.post(
    "/{comment_id}/complaints/",
    response_model=ComplaintOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("complaint", 20))],
)
async def complain(comment_id: int, payload: ComplaintIn, session: SessionDep, user: CurrentUser):
    comment = await _get_live_comment(session, comment_id, lock=True)
    if comment.user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot report your own comment.")

    session.add(CommentComplaint(comment_id=comment.id, user_id=user.id, reason=payload.reason))
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already reported this comment.") from None

    total = await session.scalar(
        select(func.count(CommentComplaint.id)).where(CommentComplaint.comment_id == comment.id)
    )
    deleted = total >= settings.complaints_to_delete
    if deleted:
        soft_delete(comment, CommentDeleteReason.complaints)
    await session.commit()
    return ComplaintOut(complaints_count=total, comment_deleted=deleted)
