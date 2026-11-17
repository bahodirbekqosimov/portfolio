"""Admin yaratish: python -m app.cli create-admin --email siz@mail.com --name "Ism" """

import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import User


async def create_admin(email: str, name: str, password: str) -> None:
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, name=name, password_hash=hash_password(password))
            session.add(user)
        else:
            user.name = name
            user.password_hash = hash_password(password)
        user.is_admin = True
        user.is_verified = True
        user.is_active = True
        await session.commit()
        print(f"Admin tayyor: {email} (id={user.id})")
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    admin = commands.add_parser("create-admin")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", required=True)
    args = parser.parse_args()

    password = getpass.getpass("Parol: ")
    if len(password) < 8:
        sys.exit("Parol kamida 8 belgi bo'lishi kerak.")
    if password != getpass.getpass("Parolni takrorlang: "):
        sys.exit("Parollar mos kelmadi.")
    asyncio.run(create_admin(args.email.lower(), args.name, password))


if __name__ == "__main__":
    main()
