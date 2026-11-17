from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, SessionDep, ensure_can_sign_in, user_from_token
from app.core.config import settings
from app.core.email import EmailSendError, send_password_reset_code, send_verification_code
from app.core.rate_limit import rate_limit
from app.core.security import (
    ACCESS,
    REFRESH,
    create_token,
    email_code_matches,
    generate_email_code,
    hash_email_code,
    hash_password,
    verify_password,
)
from app.models import EmailVerification, PasswordReset, User
from app.models.base import utcnow
from app.schemas.auth import (
    ForgotPasswordIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    RegisterOut,
    ResendCodeIn,
    ResetPasswordIn,
    TokenPair,
    VerifyEmailIn,
)
from app.schemas.common import Message

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_SENT = "A verification code has been sent to your email."
EMAIL_FAILED = "We could not send the code to your email. Please check the address and try again in a moment."


async def _deliver_verification_code(session: AsyncSession, user: User, code: str) -> None:
    """Kodni darhol yuboradi. Yuborilmasa foydalanuvchi buni ko'radi va qayta so'ray oladi."""
    try:
        await send_verification_code(user.email, code)
    except EmailSendError:
        # Kutish vaqtini bekor qilamiz: aks holda 60 soniya qayta so'rab bo'lmaydi.
        await session.execute(delete(EmailVerification).where(EmailVerification.user_id == user.id))
        await session.commit()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, EMAIL_FAILED) from None


async def _send_reset_quietly(to: str, code: str) -> None:
    # Javob doim bir xil bo'lishi uchun fonda yuboriladi; xato logga yoziladi.
    try:
        await send_password_reset_code(to, code)
    except EmailSendError:
        pass


def _tokens(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_token(user.id, user.token_version, ACCESS),
        refresh_token=create_token(user.id, user.token_version, REFRESH),
    )


async def _issue_code(
    session: AsyncSession, user: User, model: type[EmailVerification | PasswordReset] = EmailVerification
) -> str | None:
    """Yangi kod yaratadi. Oxirgi kod yaqinda yuborilgan bo'lsa None qaytaradi."""
    row = await session.scalar(select(model).where(model.user_id == user.id))
    now = utcnow()
    if row and now - row.sent_at < timedelta(seconds=settings.email_code_resend_seconds):
        return None

    code = generate_email_code()
    if row is None:
        row = model(user_id=user.id)
        session.add(row)
    row.code_hash = hash_email_code(user.id, code)
    row.sent_at = now
    row.expires_at = now + timedelta(minutes=settings.email_code_ttl_minutes)
    row.attempts = 0
    return code


@router.post(
    "/register/",
    response_model=RegisterOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", 5))],
    responses={503: {"description": "Emailga kod yuborib bo'lmadi. Qayta urinish mumkin."}},
)
async def register(payload: RegisterIn, session: SessionDep):
    user = await session.scalar(select(User).where(User.email == payload.email))
    if user and user.is_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "This email is already registered.")

    password_hash = hash_password(payload.password)
    if user:
        user.name = payload.name
        user.password_hash = password_hash
    else:
        user = User(email=payload.email, name=payload.name, password_hash=password_hash)
        session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "This email is already registered.") from None

    code = await _issue_code(session, user)
    await session.commit()
    if code:
        await _deliver_verification_code(session, user, code)
    return RegisterOut(message=CODE_SENT, email=user.email)


@router.post(
    "/verify-email/",
    response_model=TokenPair,
    dependencies=[Depends(rate_limit("verify", 10))],
)
async def verify_email(payload: VerifyEmailIn, session: SessionDep):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code or password.")

    user = await session.scalar(select(User).where(User.email == payload.email))
    if not verify_password(payload.password, user.password_hash if user else None):
        raise invalid
    if user.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This email is already verified.")

    row = await session.scalar(select(EmailVerification).where(EmailVerification.user_id == user.id))
    if row is None or row.expires_at < utcnow() or row.attempts >= settings.email_code_max_attempts:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The code has expired. Please request a new one.")
    if not email_code_matches(user.id, payload.code, row.code_hash):
        row.attempts += 1
        await session.commit()
        raise invalid

    user.is_verified = True
    await session.delete(row)
    await session.commit()
    ensure_can_sign_in(user)
    return _tokens(user)


@router.post(
    "/resend-code/",
    response_model=Message,
    dependencies=[Depends(rate_limit("resend", 5))],
    responses={503: {"description": "Emailga kod yuborib bo'lmadi. Qayta urinish mumkin."}},
)
async def resend_code(payload: ResendCodeIn, session: SessionDep):
    # Javob doim bir xil: email bazada bor-yo'qligini bilib bo'lmasin.
    user = await session.scalar(select(User).where(User.email == payload.email))
    if user and not user.is_verified:
        code = await _issue_code(session, user)
        await session.commit()
        if code:
            await _deliver_verification_code(session, user, code)
    return Message(message="If the account is not verified yet, a code has been sent to the email.")


@router.post(
    "/forgot-password/",
    response_model=Message,
    dependencies=[Depends(rate_limit("forgot", 5))],
)
async def forgot_password(payload: ForgotPasswordIn, session: SessionDep, background: BackgroundTasks):
    # Javob doim bir xil: email bazada bor-yo'qligini bilib bo'lmasin.
    user = await session.scalar(select(User).where(User.email == payload.email))
    if user and user.is_verified and user.is_active and not user.is_banned:
        code = await _issue_code(session, user, PasswordReset)
        await session.commit()
        if code:
            background.add_task(_send_reset_quietly, user.email, code)
    return Message(message="If this email is registered, a code has been sent to it.")


@router.post(
    "/reset-password/",
    response_model=Message,
    dependencies=[Depends(rate_limit("reset", 10))],
)
async def reset_password(payload: ResetPasswordIn, session: SessionDep):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "The code is invalid or has expired.")

    user = await session.scalar(select(User).where(User.email == payload.email))
    if user is None or user.is_banned or not user.is_active:
        raise invalid
    row = await session.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id))
    if row is None or row.expires_at < utcnow() or row.attempts >= settings.email_code_max_attempts:
        raise invalid
    if not email_code_matches(user.id, payload.code, row.code_hash):
        row.attempts += 1
        await session.commit()
        raise invalid

    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1  # eski parol bilan kirgan barcha qurilmalar chiqib ketadi
    await session.delete(row)
    await session.commit()
    return Message(message="Your password has been changed. Please sign in with your new password.")


@router.post("/login/", response_model=TokenPair, dependencies=[Depends(rate_limit("login", 10))])
async def login(payload: LoginIn, session: SessionDep):
    user = await session.scalar(select(User).where(User.email == payload.email))
    if not verify_password(payload.password, user.password_hash if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    ensure_can_sign_in(user)
    return _tokens(user)


@router.post("/refresh/", response_model=TokenPair, dependencies=[Depends(rate_limit("refresh", 30))])
async def refresh(payload: RefreshIn, session: SessionDep):
    user = await user_from_token(session, payload.refresh_token, REFRESH)
    return _tokens(user)


@router.post("/logout/", response_model=Message)
async def logout(user: CurrentUser, session: SessionDep):
    """Barcha qurilmalardagi tokenlarni bekor qiladi."""
    user.token_version += 1
    await session.commit()
    return Message(message="Signed out.")
