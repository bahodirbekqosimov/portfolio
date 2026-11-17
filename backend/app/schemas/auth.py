from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field

from app.schemas.common import MediaUrl, ORMModel, Trimmed

Email = Annotated[EmailStr, AfterValidator(str.lower)]
Password = Annotated[str, Field(min_length=8, max_length=128)]
Code = Annotated[str, Field(pattern=r"^\d{6}$")]


class RegisterIn(BaseModel):
    email: Email
    name: Trimmed(100)
    password: Password


class RegisterOut(BaseModel):
    message: str
    email: str


class VerifyEmailIn(BaseModel):
    """Parol ham so'raladi: boshqa odam shu email bilan oldindan ochgan accountni egallab bo'lmasin."""

    email: Email
    password: Annotated[str, Field(max_length=128)]
    code: Code


class ResendCodeIn(BaseModel):
    email: Email


class ForgotPasswordIn(BaseModel):
    email: Email


class ResetPasswordIn(BaseModel):
    email: Email
    code: Code
    new_password: Password


class LoginIn(BaseModel):
    email: Email
    password: Annotated[str, Field(max_length=128)]


class RefreshIn(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserPublic(ORMModel):
    id: int
    name: str
    avatar: MediaUrl


class UserMe(UserPublic):
    email: str
    is_admin: bool
    created_at: datetime


class UserUpdateIn(BaseModel):
    name: Trimmed(100)
