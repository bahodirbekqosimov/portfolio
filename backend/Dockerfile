FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Serverda IPv6 yo'nalishi bor, lekin IPv6 internet ishlamaydi. Konteyner host tarmog'ida
# ishlagani uchun glibc'ga IPv4 manzillarni birinchi sinashni aytamiz (SMTP uchun muhim).
RUN echo "precedence ::ffff:0:0/96  100" > /etc/gai.conf

COPY alembic.ini .
COPY migrations ./migrations
COPY scripts ./scripts
COPY app ./app

RUN useradd --system --uid 10100 --no-create-home portfolio \
    && mkdir -p /app/media \
    && chown portfolio /app/media
USER portfolio

EXPOSE 8100
CMD ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8100", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "127.0.0.1"]
