import io
import ipaddress
import uuid
import warnings
from urllib.parse import urlsplit
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from app.core.config import settings

ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}
Image.MAX_IMAGE_PIXELS = 50_000_000


def _detect_extension(data: bytes) -> str:
    """Fayl nomi yoki Content-Type'ga ishonmaymiz: haqiqiy rasm ekanini Pillow tekshiradi."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
                extension = ALLOWED_FORMATS.get(image.format or "")
    except Exception:
        extension = None
    if extension is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "The file is not an image. Allowed formats: JPEG, PNG, WEBP, GIF.",
        )
    return extension


def _write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


async def save_image(file: UploadFile, folder: str) -> str:
    """Rasmni saqlaydi va media papkasiga nisbatan yo'lni qaytaradi (masalan: posts/abc.png)."""
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"The image must be smaller than {settings.max_upload_mb} MB.",
        )
    extension = await run_in_threadpool(_detect_extension, data)
    relative = f"{folder}/{uuid.uuid4().hex}.{extension}"
    await run_in_threadpool(_write, settings.media_dir / relative, data)
    return relative


def delete_file(relative: str | None) -> None:
    # Tashqi havola (masalan Emojipedia rasmi) bizning faylimiz emas.
    if not relative or relative.startswith(("http://", "https://")):
        return
    root = settings.media_dir.resolve()
    path = (root / relative).resolve()
    if path.is_relative_to(root):
        path.unlink(missing_ok=True)


_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _is_private_ip(host: str | None) -> bool:
    # Lokal tarmoqdan (http://192.168.x.x:3000/media/...) olingan URL ham o'zimizniki.
    try:
        return host is not None and ipaddress.ip_address(host).is_private
    except ValueError:
        return False


def to_media_path(value: str | None) -> str | None:
    """Admin yuborgan rasm qiymatini bazaga yoziladigan nisbiy yo'lga keltiradi.

    Frontend yuklangan rasmning URL'ini qaytarib yuborishi mumkin (`/media/uploads/a.png`,
    `http://localhost:8000/media/uploads/a.png`). Bazada faqat `uploads/a.png` saqlanadi,
    aks holda har saqlashda `/media/` prefiksi qayta qo'shiladi. Tashqi saytdagi rasm
    havolasi (masalan https://example.com/a.png) o'zgarmaydi.
    """
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    parsed = urlsplit(value)
    own_hosts = _LOCAL_HOSTS | ({urlsplit(settings.public_base_url).hostname} - {None})
    is_own = not parsed.scheme or (parsed.hostname or "") in own_hosts or _is_private_ip(parsed.hostname)
    path = parsed.path if parsed.scheme else value
    if is_own:
        # Eski xato bilan saqlangan /media//media/... qiymatlarni ham tozalaydi.
        path = path.lstrip("/")
        while path.startswith("media/"):
            path = path.removeprefix("media/").lstrip("/")
        return path or None
    return value


def media_url(relative: str | None) -> str | None:
    if not relative:
        return None
    if relative.startswith(("http://", "https://")):
        return relative
    relative = to_media_path(relative)
    # PUBLIC_BASE_URL bo'sh bo'lsa nisbiy yo'l qaytadi (/media/...): rasm sayt qaysi manzildan
    # ochilgan bo'lsa (localhost, 192.168.x.x, domen), o'sha manzil orqali yuklanadi.
    return f"{settings.public_base_url.rstrip('/')}/media/{relative}"
