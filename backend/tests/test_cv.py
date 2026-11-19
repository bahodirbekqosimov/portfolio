from app.api.v1.profile import collect_cv_data
from app.core.database import SessionLocal
from tests.conftest import API


async def test_cv_is_a_pdf_even_when_portfolio_is_empty(client):
    response = await client.get(f"{API}/cv/")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.content.startswith(b"%PDF")

    preview = await client.get(f"{API}/cv/?download=false")
    assert preview.headers["content-disposition"].startswith("inline;")


async def test_cv_collects_only_home_projects_and_skills(client, admin_headers):
    async def post(path: str, payload: dict) -> dict:
        response = await client.post(f"{API}/admin/{path}/", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    python = await post("skills", {"name": "Python", "show_home": True, "sort_order": 1})
    await post("skills", {"name": "Hidden Skill", "show_home": False})
    await post("projects", {"title": "Shown", "description": "d", "show_home": True, "skill_ids": [python["id"]]})
    await post("projects", {"title": "Not On Home", "description": "d", "show_home": False})
    await post("projects", {"title": "Inactive", "description": "d", "show_home": True, "is_active": False})
    await post("work_experience", {"company": "Acme", "job_title": "Backend Developer", "start_date": "2024-01-01"})
    await post("contacts", {"name": "Phone", "data": "tel:+998901234567"})
    await post("education", {"institution": "Najot Ta'lim", "degree": "Backend Python", "start_date": "2025-07-04"})
    await client.post(
        f"{API}/admin/bio/",
        json={"content": "Hello, I build APIs.", "headline": "Python Backend Engineer"},
        headers=admin_headers,
    )

    async with SessionLocal() as session:
        data = await collect_cv_data(session)

    assert data.name == "Admin"
    assert data.headline == "Python Backend Engineer"
    assert data.bio == "Hello, I build APIs."
    assert [project.title for project in data.projects] == ["Shown"]
    assert data.projects[0].skills == ["Python"]
    assert data.skills == ["Python"]
    assert [item.company for item in data.experience] == ["Acme"]
    assert data.contacts[0].text == "+998 90 123 45 67"
    assert [(e.job_title, e.company) for e in data.education] == [("Backend Python", "Najot Ta'lim")]

    response = await client.get(f"{API}/cv/")
    assert response.status_code == 200
    assert response.headers["content-disposition"].endswith('filename="Admin-CV.pdf"')


async def test_bio_headline_is_optional_and_kept_on_partial_update(client, admin_headers):
    created = await client.post(
        f"{API}/admin/bio/", json={"content": "Bio", "headline": "  Engineer  "}, headers=admin_headers
    )
    assert created.json()["headline"] == "Engineer"
    updated = await client.patch(f"{API}/admin/bio/", json={"content": "New bio"}, headers=admin_headers)
    assert updated.json()["headline"] == "Engineer"
    cleared = await client.patch(f"{API}/admin/bio/", json={"content": "New bio", "headline": ""}, headers=admin_headers)
    assert cleared.json()["headline"] is None
