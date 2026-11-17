import logging
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from html import escape

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


class EmailSendError(Exception):
    """SMTP server xatni qabul qilmadi (login, tarmoq yoki manzil xatosi)."""


@dataclass(frozen=True)
class CodeEmail:
    subject: str
    preheader: str  # Pochta ro'yxatida mavzudan keyin ko'rinadigan qisqa matn
    heading: str
    intro: str
    steps: tuple[str, ...]
    not_you: str


VERIFICATION_EMAIL = CodeEmail(
    subject="Confirm your email address",
    preheader="Use this one-time code to finish creating your account.",
    heading="Confirm your email address",
    intro=(
        "Thanks for signing up! To finish creating your account, we need to make sure this "
        "email address belongs to you. Enter the verification code below on the sign-up page."
    ),
    steps=(
        "Go back to the verification page where you signed up.",
        "Enter the 6-digit code exactly as shown above.",
        "Your account will be activated and you will be signed in automatically.",
    ),
    not_you=(
        "If you did not create an account, someone may have entered your email address by mistake. "
        "You can safely ignore this message: no account will be activated without this code."
    ),
)

PASSWORD_RESET_EMAIL = CodeEmail(
    subject="Reset your password",
    preheader="Use this one-time code to choose a new password.",
    heading="Reset your password",
    intro=(
        "We received a request to reset the password for your account. "
        "Enter the code below on the password reset page to choose a new password."
    ),
    steps=(
        "Go back to the password reset page.",
        "Enter the 6-digit code exactly as shown above, then choose a new password.",
        "For your security, you will be signed out on all other devices.",
    ),
    not_you=(
        "If you did not request a password reset, you can safely ignore this message. "
        "Your password will stay the same and nobody can change it without this code."
    ),
)


def _render_text(template: CodeEmail, code: str, ttl: int, brand: str) -> str:
    steps = "\n".join(f"  {number}. {step}" for number, step in enumerate(template.steps, 1))
    return (
        f"{template.heading}\n"
        f"{'=' * len(template.heading)}\n\n"
        f"Hello,\n\n{template.intro}\n\n"
        f"Your verification code:  {code}\n"
        f"This code expires in {ttl} minutes and can only be used once.\n\n"
        f"What to do next:\n{steps}\n\n"
        "Keep this code private. We will never ask you for it by email, phone or chat.\n\n"
        f"Didn't request this?\n{template.not_you}\n\n"
        f"Best regards,\n{brand}\n\n"
        "This is an automated message, please do not reply.\n"
    )


def _render_html(template: CodeEmail, code: str, ttl: int, brand: str) -> str:
    e = escape
    steps = "".join(
        f"""<tr><td valign="top" style="padding:0 12px 10px 0">
<div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:#fff1e6;color:#ea580c;font-size:12px;font-weight:bold;text-align:center">{number}</div>
</td><td style="padding:2px 0 10px;font-size:14px;line-height:21px;color:#3f3f46">{e(step)}</td></tr>"""
        for number, step in enumerate(template.steps, 1)
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{e(template.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{e(template.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<tr><td style="padding:0 4px 16px;font-size:18px;font-weight:800;color:#18181b">
<span style="color:#ea580c">&#9679;</span>&nbsp;{e(brand)}</td></tr>

<tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden">
<div style="height:4px;background:#ea580c;border-radius:16px 16px 0 0"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 32px 8px">

<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:800;color:#18181b">{e(template.heading)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:23px;color:#3f3f46">Hello,</p>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:#3f3f46">{e(template.intro)}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px dashed #fdba74;border-radius:12px">
<tr><td align="center" style="padding:22px 16px">
<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9a3412;margin-bottom:10px">Your verification code</div>
<div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;line-height:40px;font-weight:800;letter-spacing:10px;padding-left:10px;color:#ea580c">{e(code)}</div>
<div style="font-size:13px;color:#9a3412;margin-top:10px">Expires in <strong>{ttl} minutes</strong> &middot; single use only</div>
</td></tr></table>

<h2 style="margin:28px 0 12px;font-size:15px;font-weight:700;color:#18181b">What to do next</h2>
<table role="presentation" cellpadding="0" cellspacing="0">{steps}</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f4f4f5;border-radius:10px">
<tr><td style="padding:14px 16px;font-size:13px;line-height:20px;color:#52525b">
<strong style="color:#18181b">&#128274; Keep this code private.</strong>
Never share it with anyone. We will never ask you for this code by email, phone or chat.
</td></tr></table>

<h2 style="margin:24px 0 8px;font-size:15px;font-weight:700;color:#18181b">Didn&#39;t request this?</h2>
<p style="margin:0 0 24px;font-size:14px;line-height:21px;color:#52525b">{e(template.not_you)}</p>

<p style="margin:0 0 28px;font-size:14px;line-height:21px;color:#3f3f46">Best regards,<br><strong>{e(brand)}</strong></p>
</td></tr></table>
</td></tr>

<tr><td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:18px;color:#a1a1aa">
This is an automated message sent to you because this email address was used on {e(brand)}.<br>
Please do not reply to this email.
</td></tr>
</table>
</td></tr></table>
</body></html>"""


async def _send_code(to: str, template: CodeEmail, code: str) -> None:
    subject = template.subject
    if not settings.smtp_password:
        # Faqat DEBUG=true holatida bu yerga kelinadi (config tekshiradi).
        logger.warning("SMTP sozlanmagan. %s uchun kod (%s): %s", to, subject, code)
        return

    # Spam filtrlari Date/Message-ID yo'q, nomsiz va faqat matnli xatlarni shubhali deb biladi.
    sender_domain = settings.smtp_user.rpartition("@")[2] or None
    ttl = settings.email_code_ttl_minutes
    brand = settings.email_from_name
    message = EmailMessage()
    message["From"] = formataddr((brand, settings.smtp_user))
    message["To"] = to
    message["Subject"] = subject
    message["Date"] = formatdate(localtime=False, usegmt=True)
    message["Message-ID"] = make_msgid(domain=sender_domain)
    message.set_content(_render_text(template, code, ttl, brand))
    message.add_alternative(_render_html(template, code, ttl, brand), subtype="html")
    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
            timeout=20,
        )
    except (aiosmtplib.SMTPException, OSError) as error:
        logger.exception("%s xatini %s ga yuborib bo'lmadi", subject, to)
        raise EmailSendError(str(error)) from error


async def send_verification_code(to: str, code: str) -> None:
    await _send_code(to, VERIFICATION_EMAIL, code)


async def send_password_reset_code(to: str, code: str) -> None:
    await _send_code(to, PASSWORD_RESET_EMAIL, code)
