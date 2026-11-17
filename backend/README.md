# Portfolio API

FastAPI backend: portfolio (home page) va blog. Hozircha SQLite, keyin Postgres'ga o'tiladi.

## Ishga tushirish

```bash
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.cli create-admin --email siz@mail.com --name "Ismingiz"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Hujjat va sinash uchun: http://localhost:8000/docs

Testlar: `pytest`

## Sozlamalar (`.env`)

| Nom | Izoh |
| --- | --- |
| `SMTP_PASSWORD` | Gmail **App password** (oddiy parol emas). Bo'sh bo'lsa, kod faqat server konsoliga chiqadi. |
| `PUBLIC_BASE_URL` | Bo'sh bo'lsa rasm URL'lari nisbiy (`/media/...`) qaytadi va frontend orqali istalgan qurilmada ochiladi. Rasmlar alohida domendan berilsa, shu domenni yozing. |
| `CORS_ORIGINS` | Frontend manzillari. |
| `DEBUG` | Production'da `false`. Bunda `SMTP_PASSWORD` majburiy. |

Gmail App password: Google Account → Security → 2-Step Verification → App passwords.

## Public API (`/api/v1`)

| Metod | Yo'l | Izoh |
| --- | --- | --- |
| GET | `/home/` | Admin rasmi, `profile_image`, `bio`, work experience, `show_home` projectlar, skills, contacts, education |
| GET | `/profile/image/` | Profil rasmi (`url`, `updated_at`). Yo'q bo'lsa 404 |
| GET | `/bio/` | Bio (`content`, `headline`, `created_at`, `updated_at`). Yo'q bo'lsa 404 |
| GET | `/cv/` | CV (PDF). Portfolio'dan avtomatik yig'iladi. `?download=false` brauzerda ochadi |
| GET | `/projects/` | Barcha faol projectlar |
| GET | `/blog_posts/` | `page`, `size` (10), `search`, `tag` (bir nechta), `date_from`, `date_to` |
| GET | `/blog_posts/{slug}/` | Post to'liq: content bloklari, reaksiyalar, comment soni |
| GET | `/tags/` | Filter uchun taglar |
| GET | `/emojis/` | Tanlash mumkin bo'lgan reaksiyalar |
| GET | `/blog_posts/{slug}/comments/` | Commentlar va javoblar (sahifalangan) |

## Login kerak bo'lganlar

| Metod | Yo'l | Izoh |
| --- | --- | --- |
| POST | `/blog_posts/{slug}/reactions/` | `{"emoji_id": 1}`. Qayta bosilsa olib tashlanadi |
| POST | `/blog_posts/{slug}/comments/` | `{"text": "...", "parent_id": null}` |
| PATCH, DELETE | `/comments/{id}/` | O'z commenti (admin istalganini o'chiradi) |
| POST | `/comments/{id}/complaints/` | 3 ta shikoyatda comment avtomatik o'chadi |
| POST | `/blog_posts/{slug}/bookmark/` | Saqlash / olib tashlash |
| GET, PATCH | `/users/me/` | Profil |
| PUT | `/users/me/avatar/` | Rasm yuklash. Adminniki home page'da chiqadi |
| GET | `/users/me/bookmarks/` | Saqlanganlar |

## Auth

`POST /auth/register/` → emailga 6 xonali kod → `POST /auth/verify-email/` (email, parol, kod) → tokenlar.

Keyin: `/auth/login/`, `/auth/refresh/`, `/auth/logout/`, `/auth/resend-code/`.
So'rovlarda: `Authorization: Bearer <access_token>`.

Parolni unutganda: `POST /auth/forgot-password/` (`email`) → emailga 6 xonali kod → `POST /auth/reset-password/` (`email`, `code`, `new_password`) → yangi parol bilan login. Barcha eski tokenlar bekor bo'ladi.

## Profil rasmi va bio (admin)

Ikkalasi ham bitta yozuvli: bir vaqtda faqat bittasi bo'ladi (bazada `CHECK (id = 1)`).

| Metod | Yo'l | Izoh |
| --- | --- | --- |
| GET | `/admin/profile/image/` | Joriy rasm yoki 404 |
| POST | `/admin/profile/image/` | multipart `file`. Rasm bor bo'lsa 409 |
| PUT | `/admin/profile/image/` | multipart `file`. Almashtiradi, eski fayl o'chadi. Yo'q bo'lsa 404 |
| DELETE | `/admin/profile/image/` | Rasm va fayl o'chadi (204) |
| GET | `/admin/bio/` | Joriy bio yoki 404 |
| POST | `/admin/bio/` | `{"content": "...", "headline": "Python Backend Engineer"}` (content 1–5000 belgi, headline ixtiyoriy). Bor bo'lsa 409 |
| PATCH | `/admin/bio/` | `{"content": "..."}`. Yo'q bo'lsa 404 |
| DELETE | `/admin/bio/` | O'chiradi (204). Keyin yana POST qilish mumkin |

## CV

CV alohida yuklanmaydi: `GET /cv/` har safar portfolio'dan PDF yasaydi, shuning uchun yangi project,
skill, ish joyi yoki bio qo'shilsa CV o'zi yangilanadi.

| CV bo'limi | Manba |
| --- | --- |
| Ism | Birinchi admin akkauntining ismi (`/users/me/` orqali o'zgartiriladi) |
| Lavozim | Bio `headline` |
| Kontaktlar | Contacts |
| Profile | Bio `content` |
| Experience | Work experience |
| Projects | Faqat `show_home=true` va faol projectlar (skilllari bilan) |
| Technical Skills | Faqat `show_home=true` skilllar |

## Post yozish (admin)

Matn va rasm istalgan tartibda joylanadi:

```text
1. POST  /admin/blog_posts/               {"title": "Sarlavha", "tags": ["python"]}          → id
2. POST  /admin/blog_posts/{id}/media/    (multipart: file, alt_text)                        → media id
3. PATCH /admin/blog_posts/{id}/          {"status": "published", "content": [
       {"type": "text", "text": "Boshi"},
       {"type": "image", "media_id": 1},
       {"type": "text", "text": "Davomi"},
       {"type": "image", "media_id": 2},
       {"type": "image", "media_id": 3},
       {"type": "text", "text": "Oxiri"}
   ]}
```

Frontend ketma-ket kelgan `image` bloklarni bir qatorga qo'yadi ("rasm rasm").

## Admin (`/admin`)

- **Reaksiya:** `POST /admin/uploads/` bilan rasm yuklang, qaytgan `path`ni `POST /admin/emojis/` ga `image` qilib bering. `is_active=false` emojini yashiradi.
- **Moderatsiya:** `GET /admin/comments/?complained=true`, `DELETE /comments/{id}/`, `POST /admin/comments/{id}/restore/`.
- **Ban:** `POST /admin/users/{id}/ban/` `{"reason": "...", "delete_comments": true}`, `POST /admin/users/{id}/unban/`.
- **Portfolio:** `/admin/work_experience/`, `/admin/education/`, `/admin/contacts/`, `/admin/skills/`, `/admin/projects/` (GET, POST, PATCH, DELETE).

## Postgres'ga o'tish

```bash
pip install asyncpg
psql -U postgres -c "CREATE DATABASE portfolio;"
```

`.env` faylida:

```text
DATABASE_URL=postgresql+asyncpg://postgres:PAROL@localhost:5432/portfolio
```

```bash
alembic upgrade head
```

Bu faqat bo'sh jadvallarni yaratadi. SQLite'dagi ma'lumotlarni ko'chirish alohida qilinadi.
