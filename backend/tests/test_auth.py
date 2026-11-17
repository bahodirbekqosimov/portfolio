from tests.conftest import API, png_bytes

CREDS = {"email": "ali@test.uz", "name": "Ali", "password": "password1"}


async def test_cannot_login_before_verifying_email(client, sent_codes):
    await client.post(f"{API}/auth/register/", json=CREDS)
    response = await client.post(f"{API}/auth/login/", json={"email": CREDS["email"], "password": "password1"})
    assert response.status_code == 403


async def test_register_verify_login_refresh(client, sent_codes):
    assert (await client.post(f"{API}/auth/register/", json=CREDS)).status_code == 201
    response = await client.post(
        f"{API}/auth/verify-email/",
        json={"email": CREDS["email"], "password": "password1", "code": sent_codes[CREDS["email"]]},
    )
    assert response.status_code == 200
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    me = await client.get(f"{API}/users/me/", headers=headers)
    assert me.json()["email"] == CREDS["email"]

    login = await client.post(f"{API}/auth/login/", json={"email": CREDS["email"], "password": "password1"})
    assert login.status_code == 200
    refresh = await client.post(f"{API}/auth/refresh/", json={"refresh_token": login.json()["refresh_token"]})
    assert refresh.status_code == 200

    # Access token refresh o'rnida ishlamaydi
    wrong = await client.post(f"{API}/auth/refresh/", json={"refresh_token": login.json()["access_token"]})
    assert wrong.status_code == 401


async def test_wrong_code_attempts_are_limited(client, sent_codes):
    await client.post(f"{API}/auth/register/", json=CREDS)
    correct = sent_codes[CREDS["email"]]
    wrong = "000000" if correct != "000000" else "111111"
    body = {"email": CREDS["email"], "password": "password1", "code": wrong}
    for _ in range(5):
        assert (await client.post(f"{API}/auth/verify-email/", json=body)).status_code == 400
    # 5 ta xatodan keyin to'g'ri kod ham o'tmaydi
    response = await client.post(f"{API}/auth/verify-email/", json={**body, "code": correct})
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]


async def test_preregistered_email_cannot_be_hijacked(client, sent_codes):
    await client.post(f"{API}/auth/register/", json={**CREDS, "password": "attacker-pass"})
    await client.post(f"{API}/auth/register/", json={**CREDS, "password": "victim-pass1"})
    code = sent_codes[CREDS["email"]]
    # Kod to'g'ri bo'lsa ham, parol oxirgisi bilan mos kelishi kerak
    response = await client.post(
        f"{API}/auth/verify-email/", json={"email": CREDS["email"], "password": "attacker-pass", "code": code}
    )
    assert response.status_code == 400


async def test_duplicate_verified_email_rejected(client, make_user):
    await make_user("ali@test.uz")
    response = await client.post(f"{API}/auth/register/", json=CREDS)
    assert response.status_code == 409


async def test_logout_revokes_tokens(client, make_user):
    headers = await make_user("ali@test.uz")
    assert (await client.post(f"{API}/auth/logout/", headers=headers)).status_code == 200
    assert (await client.get(f"{API}/users/me/", headers=headers)).status_code == 401


async def test_password_reset_changes_password_and_revokes_tokens(client, make_user, reset_codes):
    headers = await make_user("ali@test.uz")
    assert (await client.post(f"{API}/auth/forgot-password/", json={"email": "ali@test.uz"})).status_code == 200

    body = {"email": "ali@test.uz", "code": reset_codes["ali@test.uz"], "new_password": "new-password1"}
    assert (await client.post(f"{API}/auth/reset-password/", json=body)).status_code == 200

    # Eski token va eski parol ishlamaydi, yangisi ishlaydi
    assert (await client.get(f"{API}/users/me/", headers=headers)).status_code == 401
    old = await client.post(f"{API}/auth/login/", json={"email": "ali@test.uz", "password": "password1"})
    assert old.status_code == 401
    new = await client.post(f"{API}/auth/login/", json={"email": "ali@test.uz", "password": "new-password1"})
    assert new.status_code == 200

    # Kod faqat bir marta ishlaydi
    assert (await client.post(f"{API}/auth/reset-password/", json=body)).status_code == 400


async def test_forgot_password_does_not_reveal_whether_email_exists(client, make_user, reset_codes):
    await make_user("ali@test.uz")
    known = await client.post(f"{API}/auth/forgot-password/", json={"email": "ali@test.uz"})
    unknown = await client.post(f"{API}/auth/forgot-password/", json={"email": "yoq@test.uz"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert "yoq@test.uz" not in reset_codes


async def test_password_reset_wrong_code_attempts_are_limited(client, make_user, reset_codes):
    await make_user("ali@test.uz")
    await client.post(f"{API}/auth/forgot-password/", json={"email": "ali@test.uz"})
    correct = reset_codes["ali@test.uz"]
    wrong = "000000" if correct != "000000" else "111111"
    body = {"email": "ali@test.uz", "code": wrong, "new_password": "new-password1"}
    for _ in range(5):
        assert (await client.post(f"{API}/auth/reset-password/", json=body)).status_code == 400
    # 5 ta xatodan keyin to'g'ri kod ham o'tmaydi
    assert (await client.post(f"{API}/auth/reset-password/", json={**body, "code": correct})).status_code == 400
    login = await client.post(f"{API}/auth/login/", json={"email": "ali@test.uz", "password": "password1"})
    assert login.status_code == 200


async def test_verification_code_cannot_reset_password(client, sent_codes, reset_codes):
    await client.post(f"{API}/auth/register/", json=CREDS)
    # Tasdiqlanmagan akkauntga tiklash kodi yuborilmaydi
    await client.post(f"{API}/auth/forgot-password/", json={"email": CREDS["email"]})
    assert CREDS["email"] not in reset_codes
    body = {"email": CREDS["email"], "code": sent_codes[CREDS["email"]], "new_password": "new-password1"}
    assert (await client.post(f"{API}/auth/reset-password/", json=body)).status_code == 400


async def test_banned_user_cannot_reset_password(client, admin_headers, make_user, reset_codes):
    await make_user("bad@test.uz")
    await client.post(f"{API}/auth/forgot-password/", json={"email": "bad@test.uz"})
    code = reset_codes.pop("bad@test.uz")

    users = (await client.get(f"{API}/admin/users/", headers=admin_headers)).json()["items"]
    bad_id = next(user["id"] for user in users if user["email"] == "bad@test.uz")
    await client.post(f"{API}/admin/users/{bad_id}/ban/", json={}, headers=admin_headers)

    # Ban'dan oldin olingan kod ham ishlamaydi, yangisi yuborilmaydi
    body = {"email": "bad@test.uz", "code": code, "new_password": "new-password1"}
    assert (await client.post(f"{API}/auth/reset-password/", json=body)).status_code == 400
    await client.post(f"{API}/auth/forgot-password/", json={"email": "bad@test.uz"})
    assert "bad@test.uz" not in reset_codes


async def test_login_is_rate_limited(client):
    statuses = [
        (await client.post(f"{API}/auth/login/", json={"email": "x@test.uz", "password": "nope"})).status_code
        for _ in range(11)
    ]
    assert statuses[-1] == 429
    assert statuses[0] == 401


async def test_register_reports_email_failure_and_allows_retry(client, monkeypatch, sent_codes):
    from app.api.v1 import auth as auth_module
    from app.core.email import EmailSendError

    async def broken_send(to: str, code: str) -> None:
        raise EmailSendError("smtp down")

    monkeypatch.setattr(auth_module, "send_verification_code", broken_send)
    payload = {"email": "fail@test.uz", "name": "Fail", "password": "password1"}
    response = await client.post(f"{API}/auth/register/", json=payload)
    assert response.status_code == 503
    assert "could not send" in response.json()["detail"]

    async def working_send(to: str, code: str) -> None:
        sent_codes[to] = code

    monkeypatch.setattr(auth_module, "send_verification_code", working_send)
    response = await client.post(f"{API}/auth/resend-code/", json={"email": "fail@test.uz"})
    assert response.status_code == 200
    assert "fail@test.uz" in sent_codes


async def test_media_urls_are_relative_by_default(client, admin_headers):
    avatar = await client.put(
        f"{API}/users/me/avatar/", files={"file": ("me.png", png_bytes(), "image/png")}, headers=admin_headers
    )
    assert avatar.json()["avatar"].startswith("/media/avatars/")
