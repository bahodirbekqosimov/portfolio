"""SQLite bazadagi barcha ma'lumotni PostgreSQL'ga ko'chiradi (bir martalik).

Ishlatish (PostgreSQL'da avval `alembic upgrade head` bajarilgan bo'lishi kerak):
    python -m scripts.copy_sqlite_to_postgres sqlite+aiosqlite:////data/portfolio.db

Maqsad baza `DATABASE_URL` dan olinadi. Xavfsizlik uchun maqsad jadvallarda
ma'lumot bo'lsa, skript hech narsa yozmasdan to'xtaydi.
"""

import asyncio
import sys

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models import Base


async def main(source_url: str) -> None:
    if not settings.database_url.startswith("postgresql"):
        sys.exit("DATABASE_URL PostgreSQL bo'lishi kerak.")
    source = create_async_engine(source_url)
    target = create_async_engine(settings.database_url)
    tables = Base.metadata.sorted_tables  # FK tartibida: avval ota jadvallar

    async with target.connect() as conn:
        for table in tables:
            if await conn.scalar(select(func.count()).select_from(table)):
                sys.exit(f"To'xtatildi: '{table.name}' jadvalida allaqachon ma'lumot bor.")

    copied: dict[str, int] = {}
    async with source.connect() as src, target.begin() as dst:
        for table in tables:
            rows = [dict(row._mapping) for row in await src.execute(select(table))]
            if rows:
                await dst.execute(table.insert(), rows)
            copied[table.name] = len(rows)
        # Avtomatik id sequence'larini ko'chirilgan eng katta id'dan davom ettiramiz.
        for table in tables:
            if "id" not in table.c:
                continue
            sequence = await dst.scalar(text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table.name})
            if sequence:
                await dst.execute(
                    text(f"SELECT setval('{sequence}', COALESCE((SELECT MAX(id) FROM \"{table.name}\"), 0) + 1, false)")
                )

    await source.dispose()
    await target.dispose()
    for name, count in copied.items():
        print(f"{name}: {count}")
    print("Tayyor.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1]))
