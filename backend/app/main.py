from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.api.v1 import admin, auth, blog, comments, home, profile, users
from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


app = FastAPI(title="Portfolio API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def media_headers(request: Request, call_next):
    """Yuklangan fayllar faqat o'z turida ochiladi (nosniff); blogdagi oddiy fayllar (posts/files/) sahifa
    sifatida emas, yuklab olish sifatida beriladi."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/media/"):
        response.headers["X-Content-Type-Options"] = "nosniff"
        if path.startswith("/media/posts/files/"):
            response.headers["Content-Disposition"] = "attachment"
            response.headers["Content-Security-Policy"] = "sandbox"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, __: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "This record already exists or is linked to another record."},
    )


api_v1 = APIRouter(prefix="/api/v1")
for module in (auth, users, home, blog, comments, admin):
    api_v1.include_router(module.router)
api_v1.include_router(profile.public_router)
api_v1.include_router(profile.admin_router)
app.include_router(api_v1)

settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
