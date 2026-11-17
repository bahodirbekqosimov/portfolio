from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Bio, ProfileImage
from tests.conftest import API, png_bytes


def _upload(color: str = "red"):
    return {"file": ("me.png", png_bytes(color), "image/png")}


def _media_path(url: str) -> Path:
    return settings.media_dir / urlsplit(url).path.removeprefix("/media/")


async def _count(model) -> int:
    async with SessionLocal() as session:
        return await session.scalar(select(func.count()).select_from(model))


async def test_profile_endpoints_require_admin(client, make_user):
    user = await make_user("user@test.uz")
    for method, path in (
        ("GET", "/admin/profile/image/"),
        ("DELETE", "/admin/profile/image/"),
        ("GET", "/admin/bio/"),
        ("DELETE", "/admin/bio/"),
    ):
        assert (await client.request(method, f"{API}{path}")).status_code == 401
        assert (await client.request(method, f"{API}{path}", headers=user)).status_code == 403
    assert (await client.post(f"{API}/admin/bio/", json={"content": "x"}, headers=user)).status_code == 403
    assert (await client.post(f"{API}/admin/profile/image/", files=_upload(), headers=user)).status_code == 403


async def test_profile_image_lifecycle(client, admin_headers):
    assert (await client.get(f"{API}/profile/image/")).status_code == 404
    assert (await client.put(f"{API}/admin/profile/image/", files=_upload(), headers=admin_headers)).status_code == 404
    assert (await client.delete(f"{API}/admin/profile/image/", headers=admin_headers)).status_code == 404

    created = await client.post(f"{API}/admin/profile/image/", files=_upload(), headers=admin_headers)
    assert created.status_code == 201, created.text
    first_url = created.json()["url"]
    assert "/media/profile/" in first_url
    served = await client.get(urlsplit(first_url).path)
    assert served.status_code == 200 and served.headers["content-type"] == "image/png"

    again = await client.post(f"{API}/admin/profile/image/", files=_upload(), headers=admin_headers)
    assert again.status_code == 409
    assert await _count(ProfileImage) == 1

    replaced = await client.put(f"{API}/admin/profile/image/", files=_upload("blue"), headers=admin_headers)
    assert replaced.status_code == 200, replaced.text
    second_url = replaced.json()["url"]
    assert second_url != first_url
    assert not _media_path(first_url).exists()
    assert _media_path(second_url).exists()
    assert (await client.get(f"{API}/profile/image/")).json()["url"] == second_url
    assert (await client.get(f"{API}/home/")).json()["profile_image"]["url"] == second_url

    assert (await client.delete(f"{API}/admin/profile/image/", headers=admin_headers)).status_code == 204
    assert not _media_path(second_url).exists()
    assert (await client.get(f"{API}/profile/image/")).status_code == 404
    assert (await client.get(f"{API}/home/")).json()["profile_image"] is None

    recreated = await client.post(f"{API}/admin/profile/image/", files=_upload(), headers=admin_headers)
    assert recreated.status_code == 201
    assert await _count(ProfileImage) == 1


async def test_profile_image_rejects_non_image(client, admin_headers):
    response = await client.post(
        f"{API}/admin/profile/image/", files={"file": ("x.png", b"not an image", "image/png")}, headers=admin_headers
    )
    assert response.status_code == 400
    assert await _count(ProfileImage) == 0

    await client.post(f"{API}/admin/profile/image/", files=_upload(), headers=admin_headers)
    before = (await client.get(f"{API}/profile/image/")).json()["url"]
    bad = await client.put(
        f"{API}/admin/profile/image/", files={"file": ("x.png", b"nope", "image/png")}, headers=admin_headers
    )
    assert bad.status_code == 400
    assert (await client.get(f"{API}/profile/image/")).json()["url"] == before
    assert _media_path(before).exists()


async def test_bio_lifecycle(client, admin_headers):
    assert (await client.get(f"{API}/bio/")).status_code == 404
    assert (await client.patch(f"{API}/admin/bio/", json={"content": "x"}, headers=admin_headers)).status_code == 404
    assert (await client.delete(f"{API}/admin/bio/", headers=admin_headers)).status_code == 404
    assert (await client.post(f"{API}/admin/bio/", json={"content": "   "}, headers=admin_headers)).status_code == 422
    assert (await client.post(f"{API}/admin/bio/", json={"content": "x" * 5001}, headers=admin_headers)).status_code == 422

    created = await client.post(f"{API}/admin/bio/", json={"content": "  Salom!  "}, headers=admin_headers)
    assert created.status_code == 201, created.text
    assert created.json()["content"] == "Salom!"
    assert (await client.post(f"{API}/admin/bio/", json={"content": "ikkinchi"}, headers=admin_headers)).status_code == 409

    updated = await client.patch(f"{API}/admin/bio/", json={"content": "Yangilandi"}, headers=admin_headers)
    assert updated.status_code == 200
    assert (await client.get(f"{API}/bio/")).json()["content"] == "Yangilandi"
    assert (await client.get(f"{API}/admin/bio/", headers=admin_headers)).json()["content"] == "Yangilandi"
    assert (await client.get(f"{API}/home/")).json()["bio"]["content"] == "Yangilandi"

    assert (await client.delete(f"{API}/admin/bio/", headers=admin_headers)).status_code == 204
    assert (await client.get(f"{API}/bio/")).status_code == 404
    assert (await client.get(f"{API}/home/")).json()["bio"] is None

    recreated = await client.post(f"{API}/admin/bio/", json={"content": "Qaytadan"}, headers=admin_headers)
    assert recreated.status_code == 201
    assert (await client.get(f"{API}/bio/")).json()["content"] == "Qaytadan"
    assert await _count(Bio) == 1


async def test_database_enforces_single_row():
    async with SessionLocal() as session:
        session.add(Bio(id=2, content="ikkinchi"))
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
        else:
            raise AssertionError("CHECK constraint ishlamadi")
    assert await _count(Bio) == 0
