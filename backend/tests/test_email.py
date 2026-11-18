import pytest

from app.core import email as email_module
from app.core.config import settings


@pytest.fixture
def captured(monkeypatch):
    sent: list = []

    async def fake_send(message, **kwargs):
        sent.append((message, kwargs))

    monkeypatch.setattr(email_module.aiosmtplib, "send", fake_send)
    monkeypatch.setattr(settings, "smtp_password", "secret")
    return sent


async def test_email_from_overrides_smtp_login(monkeypatch, captured):
    # Brevo kabi relay: login bitta, xat esa domen manzilidan ketadi.
    monkeypatch.setattr(settings, "smtp_user", "12345@smtp-brevo.com")
    monkeypatch.setattr(settings, "email_from", "noreply@bahodirbek.uz")

    await email_module.send_verification_code("user@example.com", "123456")

    message, kwargs = captured[0]
    assert message["From"] == '"bahodirbek.uz" <noreply@bahodirbek.uz>'
    assert message["Message-ID"].endswith("@bahodirbek.uz>")
    assert kwargs["username"] == "12345@smtp-brevo.com"
    assert "123456" in message.get_body(("plain",)).get_content()


async def test_sender_falls_back_to_smtp_user(monkeypatch, captured):
    monkeypatch.setattr(settings, "smtp_user", "someone@gmail.com")
    monkeypatch.setattr(settings, "email_from", "")

    await email_module.send_password_reset_code("user@example.com", "654321")

    message, kwargs = captured[0]
    assert message["From"] == '"bahodirbek.uz" <someone@gmail.com>'
    assert kwargs["username"] == "someone@gmail.com"
