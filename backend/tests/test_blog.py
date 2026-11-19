from tests.conftest import API, png_bytes


async def _upload_media(client, headers, post_id, alt="rasm"):
    response = await client.post(
        f"{API}/admin/blog_posts/{post_id}/media/",
        files={"file": ("a.png", png_bytes(), "image/png")},
        data={"alt_text": alt},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _make_emoji(client, headers, name):
    upload = await client.post(
        f"{API}/admin/uploads/", files={"file": ("e.png", png_bytes(), "image/png")}, headers=headers
    )
    response = await client.post(
        f"{API}/admin/emojis/", json={"name": name, "image": upload.json()["path"]}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_list_pagination_returns_only_requested_fields(client, make_post):
    for number in range(12):
        await make_post(f"Post {number}")
    response = await client.get(f"{API}/blog_posts/")
    body = response.json()
    assert body["total"] == 12 and body["pages"] == 2 and len(body["items"]) == 10
    assert set(body["items"][0]) == {"title", "slug", "published_at"}
    assert body["items"][0]["title"] == "Post 11"
    second = await client.get(f"{API}/blog_posts/", params={"page": 2})
    assert len(second.json()["items"]) == 2


async def test_drafts_are_hidden(client, make_post):
    post = await make_post("Yashirin", status="draft")
    assert (await client.get(f"{API}/blog_posts/")).json()["total"] == 0
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/")).status_code == 404


async def test_search_tag_and_date_filters(client, make_post):
    await make_post("FastAPI haqida", tags=["python", "backend"])
    await make_post("Boshqa post", tags=["life"], content=[{"type": "text", "text": "ichida maxfiy so'z bor"}])

    async def titles(**params):
        response = await client.get(f"{API}/blog_posts/", params=params)
        return [item["title"] for item in response.json()["items"]]

    assert await titles(search="fastapi") == ["FastAPI haqida"]
    assert await titles(search="maxfiy") == ["Boshqa post"]
    assert await titles(search="%") == []
    assert await titles(tag="python") == ["FastAPI haqida"]
    assert len(await titles(tag=["python", "life"])) == 2
    assert await titles(date_to="2000-01-01") == []
    assert len(await titles(date_from="2000-01-01")) == 2

    tags = (await client.get(f"{API}/tags/")).json()
    assert {tag["name"]: tag["posts_count"] for tag in tags} == {"backend": 1, "life": 1, "python": 1}


async def test_detail_keeps_text_and_images_in_order(client, admin_headers, make_post):
    post = await make_post("Rasmli post")
    first = await _upload_media(client, admin_headers, post["id"])
    second = await _upload_media(client, admin_headers, post["id"])
    third = await _upload_media(client, admin_headers, post["id"])
    content = [
        {"type": "text", "text": "boshi"},
        {"type": "image", "media_id": first["id"]},
        {"type": "text", "text": "davomi"},
        {"type": "image", "media_id": second["id"]},
        {"type": "image", "media_id": third["id"]},
        {"type": "text", "text": "oxiri"},
    ]
    response = await client.patch(
        f"{API}/admin/blog_posts/{post['id']}/", json={"content": content}, headers=admin_headers
    )
    assert response.status_code == 200, response.text

    detail = (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()
    assert [block["type"] for block in detail["content"]] == ["text", "image", "text", "image", "image", "text"]
    assert detail["content"][1]["url"].endswith(".png") and "/media/posts/" in detail["content"][1]["url"]
    assert detail["views_count"] == 1
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()["views_count"] == 2

    # Qayta tartiblash ham ishlaydi
    response = await client.patch(
        f"{API}/admin/blog_posts/{post['id']}/", json={"content": list(reversed(content))}, headers=admin_headers
    )
    assert response.json()["content"][0]["text"] == "oxiri"

    # Ishlatilayotgan rasmni o'chirib bo'lmaydi
    assert (await client.delete(f"{API}/admin/media/{first['id']}/", headers=admin_headers)).status_code == 409

    # Post butunlay o'chadi (bloklar va media bilan birga)
    assert (await client.delete(f"{API}/admin/blog_posts/{post['id']}/", headers=admin_headers)).status_code == 204


async def test_block_cannot_use_other_posts_image(client, admin_headers, make_post):
    post_a = await make_post("A")
    post_b = await make_post("B")
    media = await _upload_media(client, admin_headers, post_a["id"])
    response = await client.patch(
        f"{API}/admin/blog_posts/{post_b['id']}/",
        json={"content": [{"type": "image", "media_id": media["id"]}]},
        headers=admin_headers,
    )
    assert response.status_code == 400


async def test_slug_is_generated_and_unique(make_post):
    assert (await make_post("Salom Dunyo!"))["slug"] == "salom-dunyo"
    assert (await make_post("Salom Dunyo!"))["slug"] == "salom-dunyo-2"


async def test_upload_rejects_non_images(client, admin_headers):
    response = await client.post(
        f"{API}/admin/uploads/",
        files={"file": ("x.png", b"<script>alert(1)</script>", "image/png")},
        headers=admin_headers,
    )
    assert response.status_code == 400


async def test_reactions_sorted_toggled_and_require_login(client, admin_headers, make_post, make_user):
    post = await make_post("Reaksiya")
    url = f"{API}/blog_posts/{post['slug']}/reactions/"
    laugh = await _make_emoji(client, admin_headers, "laugh")
    love = await _make_emoji(client, admin_headers, "love")
    await _make_emoji(client, admin_headers, "unused")

    assert (await client.post(url, json={"emoji_id": laugh["id"]})).status_code == 401

    ali = await make_user("ali@test.uz")
    vali = await make_user("vali@test.uz")
    sami = await make_user("sami@test.uz")
    await client.post(url, json={"emoji_id": laugh["id"]}, headers=ali)
    await client.post(url, json={"emoji_id": love["id"]}, headers=vali)
    await client.post(url, json={"emoji_id": love["id"]}, headers=sami)

    detail = (await client.get(f"{API}/blog_posts/{post['slug']}/", headers=vali)).json()
    # Ko'pidan kamiga; hech kim bosmagan "unused" chiqmaydi
    assert [(item["name"], item["count"]) for item in detail["reactions"]] == [("love", 2), ("laugh", 1)]
    assert [item["reacted_by_me"] for item in detail["reactions"]] == [True, False]

    # Bitta foydalanuvchida bitta reaksiya: boshqa emoji bosilsa eskisi almashtiriladi
    response = await client.post(url, json={"emoji_id": love["id"]}, headers=ali)
    assert response.json()["reacted"] is True
    assert [(item["name"], item["count"], item["reacted_by_me"]) for item in response.json()["reactions"]] == [
        ("love", 3, True)
    ]

    # Xuddi shu emoji qayta bosilsa olib tashlanadi
    response = await client.post(url, json={"emoji_id": love["id"]}, headers=ali)
    assert response.json()["reacted"] is False
    assert [(item["name"], item["count"]) for item in response.json()["reactions"]] == [("love", 2)]

    # O'chirilgan emojini bosib bo'lmaydi va ko'rinmaydi
    await client.patch(f"{API}/admin/emojis/{love['id']}/", json={"is_active": False}, headers=admin_headers)
    assert (await client.post(url, json={"emoji_id": love["id"]}, headers=ali)).status_code == 404
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()["reactions"] == []


async def test_admin_bulk_deletes_emojis_with_their_reactions(client, admin_headers, make_post, make_user):
    post = await make_post("Bulk")
    keep = await _make_emoji(client, admin_headers, "keep")
    drop_a = await _make_emoji(client, admin_headers, "drop a")
    drop_b = await _make_emoji(client, admin_headers, "drop b")
    user = await make_user("bulk@test.uz")
    await client.post(f"{API}/blog_posts/{post['slug']}/reactions/", json={"emoji_id": drop_a["id"]}, headers=user)

    url = f"{API}/admin/emojis/bulk_delete/"
    assert (await client.post(url, json={"ids": [drop_a["id"]]}, headers=user)).status_code == 403
    assert (await client.post(url, json={"ids": []}, headers=admin_headers)).status_code == 422

    response = await client.post(url, json={"ids": [drop_a["id"], drop_b["id"], 999999]}, headers=admin_headers)
    assert response.status_code == 200, response.text
    assert response.json() == {"deleted": 2}

    remaining = (await client.get(f"{API}/admin/emojis/", headers=admin_headers)).json()
    assert [item["id"] for item in remaining] == [keep["id"]]
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()["reactions"] == []


async def test_comments_replies_and_counts(client, make_post, make_user):
    post = await make_post("Comment")
    url = f"{API}/blog_posts/{post['slug']}/comments/"
    assert (await client.post(url, json={"text": "salom"})).status_code == 401

    ali = await make_user("ali@test.uz", "Ali")
    vali = await make_user("vali@test.uz", "Vali")
    root = (await client.post(url, json={"text": "salom"}, headers=ali)).json()
    reply = (await client.post(url, json={"text": "javob", "parent_id": root["id"]}, headers=vali)).json()
    # Javobga javob asosiy commentga bog'lanadi
    await client.post(url, json={"text": "javobga javob", "parent_id": reply["id"]}, headers=ali)

    body = (await client.get(url)).json()
    assert body["total"] == 1
    assert [item["text"] for item in body["items"][0]["replies"]] == ["javob", "javobga javob"]
    assert "email" not in body["items"][0]["user"]
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()["comments_count"] == 3

    # Boshqa odam o'zgartira olmaydi; egasi o'zgartiradi va o'chiradi
    assert (await client.patch(f"{API}/comments/{root['id']}/", json={"text": "x"}, headers=vali)).status_code == 403
    assert (await client.patch(f"{API}/comments/{root['id']}/", json={"text": "yangi"}, headers=ali)).status_code == 200
    assert (await client.delete(f"{API}/comments/{root['id']}/", headers=vali)).status_code == 403
    assert (await client.delete(f"{API}/comments/{root['id']}/", headers=ali)).status_code == 204

    # Javoblari bor o'chirilgan comment matnsiz qoladi
    item = (await client.get(url)).json()["items"][0]
    assert item["is_deleted"] is True and item["text"] is None and item["user"] is None
    assert len(item["replies"]) == 2


async def test_three_complaints_delete_comment_and_admin_can_restore(client, admin_headers, make_post, make_user):
    post = await make_post("Shikoyat")
    url = f"{API}/blog_posts/{post['slug']}/comments/"
    author = await make_user("author@test.uz")
    comment = (await client.post(url, json={"text": "haqorat"}, headers=author)).json()
    complaints = f"{API}/comments/{comment['id']}/complaints/"

    assert (await client.post(complaints, json={}, headers=author)).status_code == 400

    first = await make_user("u1@test.uz")
    assert (await client.post(complaints, json={"reason": "yomon"}, headers=first)).json()["comment_deleted"] is False
    # Bitta user ikki marta shikoyat qila olmaydi
    assert (await client.post(complaints, json={}, headers=first)).status_code == 409

    second = await make_user("u2@test.uz")
    assert (await client.post(complaints, json={}, headers=second)).json()["complaints_count"] == 2
    assert (await client.get(url)).json()["total"] == 1

    third = await make_user("u3@test.uz")
    assert (await client.post(complaints, json={}, headers=third)).json()["comment_deleted"] is True
    assert (await client.get(url)).json()["total"] == 0

    listing = (await client.get(f"{API}/admin/comments/", params={"complained": "true"}, headers=admin_headers)).json()
    assert listing["items"][0]["complaints_count"] == 3
    assert listing["items"][0]["deleted_reason"] == "complaints"

    restore = await client.post(f"{API}/admin/comments/{comment['id']}/restore/", headers=admin_headers)
    assert restore.status_code == 204
    assert (await client.get(url)).json()["total"] == 1


async def test_ban_blocks_user_and_can_remove_comments(client, admin_headers, make_post, make_user):
    post = await make_post("Ban")
    url = f"{API}/blog_posts/{post['slug']}/comments/"
    bad = await make_user("bad@test.uz", password="password1")
    await client.post(url, json={"text": "haqorat"}, headers=bad)

    users = (await client.get(f"{API}/admin/users/", headers=admin_headers)).json()["items"]
    bad_id = next(user["id"] for user in users if user["email"] == "bad@test.uz")

    response = await client.post(
        f"{API}/admin/users/{bad_id}/ban/", json={"reason": "haqorat", "delete_comments": True}, headers=admin_headers
    )
    assert response.status_code == 200
    assert (await client.get(url)).json()["total"] == 0
    assert (await client.post(url, json={"text": "yana"}, headers=bad)).status_code == 401
    login = await client.post(f"{API}/auth/login/", json={"email": "bad@test.uz", "password": "password1"})
    assert login.status_code == 403

    await client.post(f"{API}/admin/users/{bad_id}/unban/", headers=admin_headers)
    login = await client.post(f"{API}/auth/login/", json={"email": "bad@test.uz", "password": "password1"})
    assert login.status_code == 200


async def test_admin_endpoints_are_protected(client, make_user):
    assert (await client.get(f"{API}/admin/users/")).status_code == 401
    user = await make_user("ali@test.uz")
    assert (await client.get(f"{API}/admin/users/", headers=user)).status_code == 403


async def test_bookmarks(client, make_post, make_user):
    post = await make_post("Saqlash")
    user = await make_user("ali@test.uz")
    url = f"{API}/blog_posts/{post['slug']}/bookmark/"
    assert (await client.post(url, headers=user)).json()["bookmarked"] is True
    assert (await client.get(f"{API}/blog_posts/{post['slug']}/", headers=user)).json()["is_bookmarked"] is True
    assert (await client.get(f"{API}/users/me/bookmarks/", headers=user)).json()["total"] == 1
    assert (await client.post(url, headers=user)).json()["bookmarked"] is False


async def test_tags_are_normalized(client, admin_headers, make_post):
    post = await make_post("Teglar", tags=["#Python", " python ", "PYTHON", "#qa"])
    assert sorted(tag["name"] for tag in post["tags"]) == ["python", "qa"]
    created = await client.post(f"{API}/admin/tags/", json={"name": "##FastAPI"}, headers=admin_headers)
    assert created.json()["name"] == "fastapi"
    empty = await client.post(f"{API}/admin/tags/", json={"name": "#"}, headers=admin_headers)
    assert empty.status_code == 422


async def test_admin_search_users_and_comments(client, admin_headers, make_user, make_post):
    user = await make_user("findme@test.uz", name="Findable Person")
    await make_user("other@test.uz", name="Someone Else")
    post = await make_post("Qidiruv")
    await client.post(f"{API}/blog_posts/{post['slug']}/comments/", json={"text": "unique-needle text"}, headers=user)

    users = (await client.get(f"{API}/admin/users/?search=findable", headers=admin_headers)).json()
    assert [item["email"] for item in users["items"]] == ["findme@test.uz"]
    by_email = (await client.get(f"{API}/admin/users/?search=other@", headers=admin_headers)).json()
    assert by_email["total"] == 1

    comments = (await client.get(f"{API}/admin/comments/?search=needle", headers=admin_headers)).json()
    assert comments["total"] == 1
    nothing = (await client.get(f"{API}/admin/comments/?search=zzz-nothing", headers=admin_headers)).json()
    assert nothing["total"] == 0


async def _upload_any(client, headers, post_id, name, data, content_type="application/octet-stream"):
    response = await client.post(
        f"{API}/admin/blog_posts/{post_id}/media/", files={"file": (name, data, content_type)}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_post_can_hold_video_audio_and_any_file(client, admin_headers, make_post):
    post = await make_post("Media post")
    mp4 = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2" + b"\x00" * 2000
    mp3 = b"ID3\x04\x00\x00\x00\x00\x00\x00" + b"\xff\xfb\x90\x00" * 500
    pdf = b"%PDF-1.4\n%test\n" + b"0" * 500
    page = b"<html><script>alert(1)</script></html>"

    video = await _upload_any(client, admin_headers, post["id"], "klip.mp4", mp4, "video/mp4")
    audio = await _upload_any(client, admin_headers, post["id"], "qo'shiq.mp3", mp3, "audio/mpeg")
    doc = await _upload_any(client, admin_headers, post["id"], "rezyume.pdf", pdf, "application/pdf")
    html = await _upload_any(client, admin_headers, post["id"], "sahifa.html", page, "text/html")
    image = await _upload_media(client, admin_headers, post["id"])

    assert (video["kind"], video["mime"], video["url"].endswith(".mp4")) == ("video", "video/mp4", True)
    assert (audio["kind"], audio["mime"], audio["name"]) == ("audio", "audio/mpeg", "qo'shiq.mp3")
    assert (doc["kind"], doc["url"].endswith(".pdf"), doc["size"]) == ("file", True, len(pdf))
    # HTML saytimiz nomidan sahifa bo'lib ochilmasligi uchun .bin bo'lib saqlanadi
    assert (html["kind"], html["url"].endswith(".bin"), html["name"]) == ("file", True, "sahifa.html")
    assert image["kind"] == "image"

    content = [{"type": kind, "media_id": item["id"]} for kind, item in
               [("video", video), ("audio", audio), ("file", doc), ("image", image)]]
    response = await client.patch(
        f"{API}/admin/blog_posts/{post['id']}/", json={"content": content}, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    detail = (await client.get(f"{API}/blog_posts/{post['slug']}/")).json()
    assert [(b["type"], b["name"]) for b in detail["content"]] == [
        ("video", "klip.mp4"), ("audio", "qo'shiq.mp3"), ("file", "rezyume.pdf"), ("image", "a.png")
    ]

    # Oddiy fayl yuklab olish sifatida beriladi, video esa o'z turida (Range bilan)
    file_path = "/media/" + doc["url"].split("/media/", 1)[1]
    got = await client.get(file_path)
    assert got.headers["content-disposition"] == "attachment" and got.headers["x-content-type-options"] == "nosniff"
    video_path = "/media/" + video["url"].split("/media/", 1)[1]
    part = await client.get(video_path, headers={"Range": "bytes=0-99"})
    assert part.status_code == 206 and len(part.content) == 100 and "content-disposition" not in part.headers


async def test_media_upload_size_limit(client, admin_headers, make_post, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_media_mb", 1)
    post = await make_post("Katta")
    response = await client.post(
        f"{API}/admin/blog_posts/{post['id']}/media/",
        files={"file": ("big.zip", b"PK\x03\x04" + b"0" * (1024 * 1024 + 10), "application/zip")},
        headers=admin_headers,
    )
    assert response.status_code == 413

