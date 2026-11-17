from urllib.parse import urlsplit

from tests.conftest import API, png_bytes


async def test_home_empty_database(client):
    response = await client.get(f"{API}/home/")
    assert response.status_code == 200
    assert response.json()["profile"] is None


async def test_home_returns_admin_avatar_and_only_home_projects(client, admin_headers):
    avatar = await client.put(
        f"{API}/users/me/avatar/", files={"file": ("me.png", png_bytes(), "image/png")}, headers=admin_headers
    )
    assert avatar.status_code == 200, avatar.text
    served = await client.get(urlsplit(avatar.json()["avatar"]).path)
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"

    skill = await client.post(f"{API}/admin/skills/", json={"name": "Python", "show_home": True}, headers=admin_headers)
    skill_id = skill.json()["id"]
    for title, show_home, is_active in (("Bosh", True, True), ("Oddiy", False, True), ("Nofaol", True, False)):
        response = await client.post(
            f"{API}/admin/projects/",
            json={"title": title, "description": "d", "show_home": show_home, "is_active": is_active, "skill_ids": [skill_id]},
            headers=admin_headers,
        )
        assert response.status_code == 201, response.text

    await client.post(
        f"{API}/admin/work_experience/",
        json={"company": "Acme", "job_title": "Dev", "start_date": "2024-01-01"},
        headers=admin_headers,
    )
    await client.post(f"{API}/admin/education/", json={"institution": "TATU"}, headers=admin_headers)
    await client.post(f"{API}/admin/contacts/", json={"name": "Telegram", "data": "@me"}, headers=admin_headers)

    body = (await client.get(f"{API}/home/")).json()
    assert body["profile"]["name"] == "Admin"
    assert "/media/avatars/" in body["profile"]["avatar"]
    assert [project["title"] for project in body["projects"]] == ["Bosh"]
    assert body["projects"][0]["skills"][0]["name"] == "Python"
    assert body["work_experience"][0]["company"] == "Acme"
    assert body["education"][0]["institution"] == "TATU"
    assert body["contacts"][0]["data"] == "@me"
    assert "email" not in body["profile"]

    all_projects = (await client.get(f"{API}/projects/")).json()
    assert {project["title"] for project in all_projects} == {"Bosh", "Oddiy"}


async def test_image_paths_are_normalized_and_stable_across_saves(client, admin_headers):
    upload = await client.post(
        f"{API}/admin/uploads/", files={"file": ("p.png", png_bytes(), "image/png")}, headers=admin_headers
    )
    url = upload.json()["url"]
    created = await client.post(
        f"{API}/admin/projects/", json={"title": "P", "description": "d", "image": url}, headers=admin_headers
    )
    assert created.json()["image"] == url
    project_id = created.json()["id"]
    # Admin form tahrirlashda API qaytargan URL'ni yana yuboradi: prefiks ko'paymasligi kerak.
    for _ in range(3):
        updated = await client.patch(
            f"{API}/admin/projects/{project_id}/", json={"image": created.json()["image"]}, headers=admin_headers
        )
        assert updated.json()["image"] == url
    absolute = await client.patch(
        f"{API}/admin/projects/{project_id}/", json={"image": f"http://localhost:8000{url}"}, headers=admin_headers
    )
    assert absolute.json()["image"] == url
    external = await client.patch(
        f"{API}/admin/projects/{project_id}/", json={"image": "https://example.com/a.png"}, headers=admin_headers
    )
    assert external.json()["image"] == "https://example.com/a.png"
