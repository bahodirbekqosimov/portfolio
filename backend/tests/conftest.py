import io
import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="portfolio-tests-"))
os.environ.update(
    DEBUG="true",
    SECRET_KEY="test-secret-key-test-secret-key-test-secret-key",
    DATABASE_URL=f"sqlite+aiosqlite:///{_tmp}/test.db",
    MEDIA_DIR=str(_tmp / "media"),
    SMTP_PASSWORD="",
    EMAIL_CODE_RESEND_SECONDS="0",
)

import httpx  # noqa: E402
import pytest  # noqa: E402
from PIL import Image  # noqa: E402

from app.api.v1 import auth as auth_module  # noqa: E402
from app.core.database import SessionLocal, engine  # noqa: E402
from app.core.rate_limit import reset_rate_limits  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base, User  # noqa: E402

API = "/api/v1"


def png_bytes(color: str = "red") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buffer, "PNG")
    return buffer.getvalue()


@pytest.fixture(autouse=True)
async def database():
    reset_rate_limits()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
def sent_codes(monkeypatch) -> dict[str, str]:
    codes: dict[str, str] = {}

    async def fake_send(to: str, code: str) -> None:
        codes[to] = code

    monkeypatch.setattr(auth_module, "send_verification_code", fake_send)
    return codes


@pytest.fixture
def reset_codes(monkeypatch) -> dict[str, str]:
    codes: dict[str, str] = {}

    async def fake_send(to: str, code: str) -> None:
        codes[to] = code

    monkeypatch.setattr(auth_module, "send_password_reset_code", fake_send)
    return codes


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


@pytest.fixture
async def admin_headers(client) -> dict[str, str]:
    async with SessionLocal() as session:
        session.add(
            User(
                email="admin@test.uz",
                name="Admin",
                password_hash=hash_password("adminpass1"),
                is_admin=True,
                is_verified=True,
            )
        )
        await session.commit()
    response = await client.post(
        f"{API}/auth/login/", json={"email": "admin@test.uz", "password": "adminpass1"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def make_user(client, sent_codes):
    async def _make(email: str, name: str = "User", password: str = "password1") -> dict[str, str]:
        reset_rate_limits()
        response = await client.post(
            f"{API}/auth/register/", json={"email": email, "name": name, "password": password}
        )
        assert response.status_code == 201, response.text
        response = await client.post(
            f"{API}/auth/verify-email/",
            json={"email": email, "password": password, "code": sent_codes[email]},
        )
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make


@pytest.fixture
def make_post(client, admin_headers):
    async def _make(title: str = "Salom dunyo", **fields) -> dict:
        response = await client.post(
            f"{API}/admin/blog_posts/",
            json={"title": title, "status": "published", **fields},
            headers=admin_headers,
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make
