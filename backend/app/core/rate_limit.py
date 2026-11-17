"""Oddiy in-memory rate limiter. Bitta worker uchun yetarli; bir nechta worker bo'lsa Redis kerak bo'ladi."""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

_hits: dict[str, deque[float]] = defaultdict(deque)


def reset_rate_limits() -> None:
    _hits.clear()


def rate_limit(name: str, limit: int, window_seconds: int = 60):
    async def dependency(request: Request) -> None:
        now = time.monotonic()
        client = request.client.host if request.client else "unknown"
        key = f"{name}:{client}"
        hits = _hits[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many requests. Please try again shortly.",
                headers={"Retry-After": str(window_seconds)},
            )
        hits.append(now)

    return dependency
