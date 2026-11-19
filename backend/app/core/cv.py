"""Portfolio ma'lumotlaridan CV (PDF) yasaydi.

CV alohida saqlanmaydi: har so'rovda bazadan yig'iladi, shuning uchun yangi project, skill,
ish joyi yoki bio qo'shilsa CV o'zi yangilanadi. Dizayn foydalanuvchi bergan shablonga mos:
ism + lavozim, kontaktlar, Profile, Experience, Projects, Education, Technical Skills.
"""

import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
FONT = "NotoSans"

# Shablon ranglari
BACKGROUND = (224, 245, 243)
TEXT = (17, 17, 17)
MUTED = (75, 85, 99)
ACCENT = (247, 125, 47)
RULE = (120, 120, 120)

PAGE_MARGIN = 16
SKILL_COLUMNS = 7


@dataclass
class CvContact:
    label: str
    text: str
    href: str | None = None


@dataclass
class CvExperience:
    job_title: str
    company: str
    description: str | None
    start_date: date | None
    end_date: date | None


@dataclass
class CvProject:
    title: str
    description: str
    link: str | None
    skills: list[str] = field(default_factory=list)


@dataclass
class CvData:
    name: str
    headline: str | None
    contacts: list[CvContact]
    bio: str | None
    experience: list[CvExperience]
    projects: list[CvProject]
    skills: list[str]
    # Ta'lim ish tajribasi bilan bir xil ko'rinishda: daraja (qalin), muassasa (rangli), davr.
    education: list[CvExperience] = field(default_factory=list)


def parse_contact(label: str, raw: str) -> CvContact:
    """Frontend'dagi parseContactData bilan bir xil: tel:, mailto:, t.me, oddiy URL."""
    value = raw.strip()
    lower = value.lower()
    if lower.startswith("mailto:"):
        email = value[7:].split("?")[0].strip()
        return CvContact(label, email, value)
    if lower.startswith(("tel:", "sms:")):
        return CvContact(label, format_phone(value[4:].strip()), value)
    if match := re.match(r"^tg://resolve\?domain=([^&]+)", value, re.I):
        return CvContact(label, f"@{match.group(1)}", f"https://t.me/{match.group(1)}")
    if match := re.match(r"^(?:https?://)?(?:www\.)?t\.me/([A-Za-z0-9_+\-]+)", value, re.I):
        return CvContact(label, f"@{match.group(1)}", f"https://t.me/{match.group(1)}")
    if re.match(r"^https?://", value, re.I):
        return CvContact(label, short_url(value), value)
    if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
        return CvContact(label, value, f"mailto:{value}")
    if re.match(r"^\+?[\d\s()\-]{7,}$", value):
        return CvContact(label, format_phone(value), f"tel:{re.sub(r'[^\d+]', '', value)}")
    if re.match(r"^[\w.-]+\.[a-z]{2,}(/\S*)?$", value, re.I):
        return CvContact(label, value.rstrip("/"), f"https://{value}")
    return CvContact(label, value)


def format_phone(phone: str) -> str:
    """O'zbekiston raqami: +998901234567 -> +998 90 123 45 67. Boshqalari o'zgarmaydi."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 12 and digits.startswith("998"):
        return f"+998 {digits[3:5]} {digits[5:8]} {digits[8:10]} {digits[10:]}"
    return phone


def short_url(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url.strip(), flags=re.I).rstrip("/")


def _period(start: date | None, end: date | None) -> str:
    def fmt(value: date) -> str:
        return value.strftime("%b %Y")

    if start and end:
        return f"{fmt(start)} – {fmt(end)}"
    if start:
        return f"{fmt(start)} – Present"
    if end:
        return f"Until {fmt(end)}"
    return ""


class _CvPdf(FPDF):
    def header(self) -> None:  # fpdf har sahifa boshida chaqiradi
        self.set_fill_color(*BACKGROUND)
        self.rect(0, 0, self.w, self.h, style="F")


class CvRenderer:
    def __init__(self, data: CvData) -> None:
        self.data = data
        pdf = _CvPdf(format="A4")
        pdf.set_title(f"{data.name} — CV")
        pdf.set_author(data.name)
        pdf.set_creator("bahodirbek.uz")
        pdf.set_margins(PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN)
        pdf.set_auto_page_break(auto=True, margin=PAGE_MARGIN)
        pdf.add_font(FONT, "", str(FONT_DIR / "NotoSans-Regular.ttf"))
        pdf.add_font(FONT, "B", str(FONT_DIR / "NotoSans-Bold.ttf"))
        pdf.add_page()
        self.pdf = pdf

    @property
    def width(self) -> float:
        return self.pdf.w - self.pdf.l_margin - self.pdf.r_margin

    def render(self) -> bytes:
        self._header()
        if self.data.bio:
            self._section("Profile")
            self._paragraph(self.data.bio, indent=1)
        if self.data.experience:
            self._section("Experience")
            for item in self.data.experience:
                self._experience(item)
        if self.data.projects:
            self._section("Projects")
            for project in self.data.projects:
                self._project(project)
        if self.data.education:
            self._section("Education")
            for item in self.data.education:
                self._experience(item)
        if self.data.skills:
            # Sarlavha bir sahifada, ro'yxat keyingisida qolmasin: bo'lim bir butun joylashadi.
            self._keep_together(15 + self._skills_rows(self.data.skills) * 8)
            self._section("Technical Skills")
            self._skills_grid(self.data.skills)
        return bytes(self.pdf.output())

    # ---------- bloklar ----------
    def _header(self) -> None:
        pdf = self.pdf
        pdf.set_text_color(*TEXT)
        pdf.set_font(FONT, "B", 24)
        pdf.cell(0, 11, self.data.name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if self.data.headline:
            pdf.set_text_color(*ACCENT)
            pdf.set_font(FONT, "", 14)
            pdf.cell(0, 8, self.data.headline, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if self.data.contacts:
            pdf.ln(2)
            self._contacts()
        pdf.ln(2)
        pdf.set_draw_color(*TEXT)
        pdf.set_line_width(1.0)
        y = pdf.get_y()
        pdf.line(pdf.l_margin, y, pdf.l_margin + self.width, y)
        pdf.ln(4)

    def _contacts(self) -> None:
        pdf = self.pdf
        pdf.set_font(FONT, "", 9.5)
        separator = "   |   "
        for index, contact in enumerate(self.data.contacts):
            text = contact.text
            needed = pdf.get_string_width(text) + (pdf.get_string_width(separator) if index else 0)
            if index and pdf.get_x() + needed > pdf.l_margin + self.width:
                pdf.ln(5.5)
            elif index:
                pdf.set_text_color(*RULE)
                pdf.cell(pdf.get_string_width(separator), 5.5, separator)
            pdf.set_text_color(*MUTED)
            pdf.cell(pdf.get_string_width(text), 5.5, text, link=contact.href or "")
        pdf.ln(5.5)

    def _section(self, title: str) -> None:
        pdf = self.pdf
        if pdf.get_y() > pdf.h - PAGE_MARGIN - 30:
            pdf.add_page()
        pdf.ln(3)
        pdf.set_text_color(*TEXT)
        pdf.set_font(FONT, "", 13)
        pdf.cell(0, 7, title.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(*RULE)
        pdf.set_line_width(0.4)
        y = pdf.get_y() + 0.5
        pdf.line(pdf.l_margin, y, pdf.l_margin + self.width, y)
        pdf.ln(3)

    LINE = 5

    def _paragraph_height(self, text: str, indent: float = 0, size: float = 10) -> float:
        """Matn qancha joy olishini oldindan o'lchaydi (yozuv sahifalar orasida bo'linmasligi uchun)."""
        pdf = self.pdf
        pdf.set_font(FONT, "", size)
        height = 0.0
        for block in text.strip().splitlines():
            if not block.strip():
                height += 2
                continue
            lines = pdf.multi_cell(self.width - indent, self.LINE, block.strip(), dry_run=True, output="LINES")
            height += len(lines) * self.LINE
        return height

    def _paragraph(self, text: str, indent: float = 0, size: float = 10) -> None:
        pdf = self.pdf
        pdf.set_text_color(*TEXT)
        pdf.set_font(FONT, "", size)
        for block in text.strip().splitlines():
            pdf.set_x(pdf.l_margin + indent)
            if not block.strip():
                pdf.ln(2)
                continue
            pdf.multi_cell(self.width - indent, self.LINE, block.strip(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def _keep_together(self, height: float) -> None:
        if self.pdf.get_y() + height > self.pdf.h - PAGE_MARGIN:
            self.pdf.add_page()

    def _experience(self, item: CvExperience) -> None:
        pdf = self.pdf
        indent = 4
        body = self._paragraph_height(item.description, indent + 4) if item.description else 0
        self._keep_together(6.5 + body + 2.5)
        pdf.set_x(pdf.l_margin + indent)
        period = _period(item.start_date, item.end_date)
        pdf.set_font(FONT, "", 9)
        period_width = pdf.get_string_width(period) + 1 if period else 0
        pdf.set_font(FONT, "B", 11)
        pdf.set_text_color(*TEXT)
        title = f"{item.job_title} " if item.job_title else ""
        pdf.cell(pdf.get_string_width(title), 6, title)
        pdf.set_text_color(*ACCENT)
        pdf.cell(pdf.get_string_width(item.company), 6, item.company)
        if period:
            pdf.set_font(FONT, "", 9)
            pdf.set_text_color(*MUTED)
            pdf.set_x(pdf.l_margin + self.width - period_width)
            pdf.cell(period_width, 6, period, align="R")
        pdf.ln(6.5)
        if item.description:
            self._paragraph(item.description, indent=indent + 4)
        pdf.ln(2.5)

    def _project(self, project: CvProject) -> None:
        pdf = self.pdf
        self._keep_together(20)
        indent = 4
        pdf.set_x(pdf.l_margin + indent)
        pdf.set_font(FONT, "B", 11)
        pdf.set_text_color(*TEXT)
        pdf.cell(pdf.get_string_width(project.title), 6, project.title)
        if project.link:
            pdf.cell(6, 6, "")
            pdf.set_font(FONT, "B", 9.5)
            pdf.set_text_color(*ACCENT)
            label = short_url(project.link)
            available = pdf.l_margin + self.width - pdf.get_x()
            while label and pdf.get_string_width(label) > available:
                label = label[:-2]
            pdf.cell(pdf.get_string_width(label), 6, label, link=project.link)
        pdf.ln(6.5)
        if project.description:
            self._paragraph(project.description, indent=indent + 4)
        if project.skills:
            pdf.ln(1)
            self._skill_chips(project.skills, indent=indent + 2)
        pdf.ln(3)

    def _skill_chips(self, skills: list[str], indent: float) -> None:
        pdf = self.pdf
        pdf.set_font(FONT, "B", 8.5)
        pdf.set_text_color(*TEXT)
        gap = 7
        left = pdf.l_margin + indent
        pdf.set_x(left)
        for skill in skills:
            width = pdf.get_string_width(skill)
            if pdf.get_x() > left and pdf.get_x() + width > pdf.l_margin + self.width:
                pdf.ln(5)
                pdf.set_x(left)
            pdf.cell(width + gap, 5, skill)
        pdf.ln(5)

    def _skill_columns(self, skills: list[str]) -> int:
        # Uzun skill nomlari sig'ishi uchun kerak bo'lsa ustun sonini kamaytiramiz.
        self.pdf.set_font(FONT, "", 12)
        columns = SKILL_COLUMNS
        while columns > 2 and max(self.pdf.get_string_width(s) for s in skills) > self.width / columns - 2:
            columns -= 1
        return columns

    def _skills_rows(self, skills: list[str]) -> int:
        columns = self._skill_columns(skills)
        return -(-len(skills) // columns)

    def _skills_grid(self, skills: list[str]) -> None:
        pdf = self.pdf
        pdf.set_text_color(*TEXT)
        size = 12
        row = 8
        columns = self._skill_columns(skills)
        pdf.set_font(FONT, "", size)
        column_width = self.width / columns
        for start in range(0, len(skills), columns):
            self._keep_together(row)
            pdf.set_x(pdf.l_margin)
            for skill in skills[start : start + columns]:
                text = skill
                while pdf.get_string_width(text) > column_width - 2 and len(text) > 3:
                    text = text[:-2] + "…"
                pdf.cell(column_width, row, text, align="C")
            pdf.ln(row)


def render_cv(data: CvData) -> bytes:
    return CvRenderer(data).render()


def cv_filename(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-") or "CV"
    return f"{slug}-CV.pdf"
