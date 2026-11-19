import io
import ipaddress
import mimetypes
import re
import unicodedata
import uuid
import warnings
from dataclasses import dataclass
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


# ---------- Blog fayllari: rasm, video, audio yoki istalgan fayl ----------
@dataclass(frozen=True, slots=True)
class SavedMedia:
    path: str
    kind: str  # image | video | audio | file
    mime: str
    size: int
    original_name: str | None


# MP4 konteyneri (ftyp) ichidagi faqat-ovoz brendlari; qolganlari video deb olinadi.
_AUDIO_BRANDS = {b"M4A ", b"M4B ", b"M4P ", b"F4A "}
_AUDIO_EXTENSIONS = {"m4a", "aac", "mp3", "ogg", "oga", "opus", "wav", "flac"}
# Brauzerda ochilsa ham xavfsiz turlar: nomdagi kengaytma saqlanadi. Qolganlari (.html, .svg, .js, .exe ...)
# `.bin` bo'lib saqlanadi va faqat yuklab olinadi — saytimiz nomidan sahifa sifatida ochila olmaydi.
SAFE_FILE_EXTENSIONS = {
    "pdf", "txt", "csv", "md", "json", "rtf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
    "zip", "rar", "7z", "tar", "gz", "epub", "apk", "py", "ipynb", "sql",
}
_EXTRA_TYPES = {"md": "text/markdown", "apk": "application/vnd.android.package-archive", "7z": "application/x-7z-compressed",
                "rar": "application/vnd.rar", "ipynb": "application/x-ipynb+json", "bin": "application/octet-stream",
                "webm": "video/webm", "mkv": "video/x-matroska", "m4a": "audio/mp4", "opus": "audio/ogg", "flac": "audio/flac"}
_CHUNK = 1024 * 1024


def _name_extension(name: str | None) -> str:
    stem, dot, extension = (name or "").rpartition(".")
    extension = extension.lower()
    return extension if dot and stem and re.fullmatch(r"[a-z0-9]{1,8}", extension) else ""


def _looks_like_image(head: bytes) -> bool:
    return (
        head.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a"))
        or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")
    )


def _detect_media(head: bytes, name: str | None) -> tuple[str, str]:
    """Video/audio turini birinchi baytlardan aniqlaydi: (kind, kengaytma). Tanilmasa ("file", ...)."""
    hint = _name_extension(name)
    if len(head) >= 12 and head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in _AUDIO_BRANDS or hint in _AUDIO_EXTENSIONS:
            return "audio", "m4a"
        return "video", "mov" if brand == b"qt  " else "mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):  # Matroska / WebM
        if hint in {"weba"} | _AUDIO_EXTENSIONS:
            return "audio", "webm"
        return "video", "mkv" if hint == "mkv" else "webm"
    if head.startswith(b"OggS"):
        return ("video", "ogv") if hint == "ogv" else ("audio", "ogg")
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "audio", "wav"
    if head.startswith(b"fLaC"):
        return "audio", "flac"
    if head.startswith(b"ID3") or (len(head) > 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0 and (head[1] & 0x06) != 0):
        return "audio", "mp3"  # MPEG layer I–III kadri
    if len(head) > 2 and head[0] == 0xFF and (head[1] & 0xF6) == 0xF0:
        return "audio", "aac"  # ADTS
    extension = hint if hint in SAFE_FILE_EXTENSIONS else "bin"
    return "file", extension


def _mime(extension: str) -> str:
    return _EXTRA_TYPES.get(extension) or mimetypes.guess_type(f"x.{extension}")[0] or "application/octet-stream"


def _clean_name(name: str | None) -> str | None:
    if not name:
        return None
    name = unicodedata.normalize("NFC", name).replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(char for char in name if unicodedata.category(char)[0] != "C").strip(" .")
    return name[:255] or None


async def save_media(file: UploadFile, folder: str) -> SavedMedia:
    """Blog uchun istalgan faylni saqlaydi. Rasm Pillow bilan tekshiriladi (max_upload_mb), video, audio va
    boshqa fayllar bo'laklab diskka yoziladi (max_media_mb). Tur nomidan emas, mazmunidan aniqlanadi."""
    name = _clean_name(file.filename)
    head = await file.read(64 * 1024)
    if not head:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.")
    if _looks_like_image(head):
        await file.seek(0)
        path = await save_image(file, folder)
        extension = path.rsplit(".", 1)[-1]
        size = (settings.media_dir / path).stat().st_size
        return SavedMedia(path, "image", _mime(extension), size, name)

    kind, extension = _detect_media(head, name)
    limit = settings.max_media_mb * 1024 * 1024
    sub = "files" if kind == "file" else kind
    relative = f"{folder}/{sub}/{uuid.uuid4().hex}.{extension}"
    target = settings.media_dir / relative
    await run_in_threadpool(target.parent.mkdir, parents=True, exist_ok=True)
    size = 0
    try:
        with open(target, "wb") as out:
            chunk = head
            while chunk:
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        status.HTTP_413_CONTENT_TOO_LARGE, f"The file must be smaller than {settings.max_media_mb} MB."
                    )
                await run_in_threadpool(out.write, chunk)
                chunk = await file.read(_CHUNK)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return SavedMedia(relative, kind, _mime(extension), size, name)


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
