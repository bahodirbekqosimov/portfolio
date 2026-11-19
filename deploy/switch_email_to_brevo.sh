#!/usr/bin/env bash
# Saytning tasdiqlash kodlarini Gmail o'rniga Brevo orqali noreply@bahodirbek.uz dan yuborish.
#
#   ~/portfolio/deploy/switch_email_to_brevo.sh            # Brevo'ga o'tish
#   ~/portfolio/deploy/switch_email_to_brevo.sh --rollback # avvalgi (Gmail) sozlamaga qaytish
#
# Xavfsiz: avval sinov xati yuboriladi; xato bo'lsa backend.env o'zgarmaydi.
# Faqat portfolio-api konteyneri qayta yaratiladi. sudo kerak emas, server qayta yoqilmaydi.
set -euo pipefail
cd "$HOME/portfolio"

ENV_FILE=backend.env
BACKUP=backend.env.before-brevo
FROM_ADDRESS="${EMAIL_FROM:-noreply@bahodirbek.uz}"

restart_api() {
    docker rm -f portfolio-api >/dev/null
    docker run -d --name portfolio-api --restart unless-stopped --network host --user 1001:1001 \
        --env-file "$ENV_FILE" -v "$HOME/portfolio/data/media:/app/media" portfolio-api:latest >/dev/null
    for _ in $(seq 30); do
        if curl -fs -o /dev/null http://127.0.0.1:8100/health; then
            echo "   portfolio-api ishga tushdi"
            return 0
        fi
        sleep 1
    done
    echo "   XATO: portfolio-api javob bermayapti: docker logs portfolio-api"
    return 1
}

if [[ "${1:-}" == "--rollback" ]]; then
    [[ -f "$BACKUP" ]] || { echo "Zaxira ($BACKUP) topilmadi"; exit 1; }
    cp -p "$BACKUP" "$ENV_FILE"
    echo "== Avvalgi sozlama qaytarildi"
    restart_api
    exit 0
fi

echo "Brevo: Settings -> SMTP & API -> SMTP tabidagi ma'lumotlar kerak."
read -r -p "SMTP login (masalan 9a1b2c001@smtp-brevo.com): " SMTP_LOGIN
read -r -s -p "SMTP key (ekranda ko'rinmaydi): " SMTP_KEY
echo
read -r -p "Sinov xati qaysi manzilga yuborilsin: " TEST_TO
[[ -n "$SMTP_LOGIN" && -n "$SMTP_KEY" && -n "$TEST_TO" ]] || { echo "Hamma maydon to'ldirilishi kerak"; exit 1; }
if [[ "$SMTP_LOGIN" == xsmtpsib-* ]]; then
    echo "XATO: login maydoniga KALIT kiritildi. Login '...@smtp-brevo.com' ko'rinishida bo'ladi."
    echo "Kalit ekranda ko'rinib qoldi: Brevo'da uni o'chirib, yangisini yarating."
    exit 1
fi
if [[ "$SMTP_LOGIN" != *@* ]]; then
    echo "XATO: login '...@smtp-brevo.com' ko'rinishida bo'lishi kerak (Brevo SMTP sahifasidagi 'Login')."
    exit 1
fi
if [[ "$SMTP_KEY" != xsmtpsib-* ]]; then
    echo "XATO: kalit 'xsmtpsib-' bilan boshlanishi kerak (SMTP key, API key emas)."
    exit 1
fi

NEW_ENV=$(mktemp "$HOME/portfolio/.backend.env.XXXXXX")
chmod 600 "$NEW_ENV"
trap 'rm -f "$NEW_ENV"' EXIT

# backend.env nusxasida faqat SMTP qatorlarini almashtiramiz (qolganlari o'zgarmaydi).
SMTP_LOGIN="$SMTP_LOGIN" SMTP_KEY="$SMTP_KEY" FROM_ADDRESS="$FROM_ADDRESS" \
python3 -I - "$ENV_FILE" "$NEW_ENV" <<'PY'
import os, sys
src, dst = sys.argv[1], sys.argv[2]
new = {
    "SMTP_HOST": "smtp-relay.brevo.com",
    "SMTP_PORT": "587",
    "SMTP_USER": os.environ["SMTP_LOGIN"],
    "SMTP_PASSWORD": os.environ["SMTP_KEY"],
    "EMAIL_FROM": os.environ["FROM_ADDRESS"],
}
lines = []
for line in open(src).read().splitlines():
    key = line.split("=", 1)[0].strip()
    if key in new:
        continue
    lines.append(line)
lines += [f"{k}={v}" for k, v in new.items()]
open(dst, "w").write("\n".join(lines) + "\n")
PY

echo "== 1/2 Sinov xati yuborilmoqda ($FROM_ADDRESS -> $TEST_TO)"
if ! docker run --rm --network host --user 1001:1001 --env-file "$NEW_ENV" -e TEST_TO="$TEST_TO" \
    portfolio-api:latest python -c '
import asyncio, os
from app.core.email import send_verification_code
asyncio.run(send_verification_code(os.environ["TEST_TO"], "000000"))
print("   sinov xati yuborildi")
'; then
    echo "XATO: Brevo xatni qabul qilmadi. backend.env o'zgartirilmadi, sayt avvalgidek ishlayapti."
    echo "Tekshiring: login/kalit to'g'rimi, Brevo'da $FROM_ADDRESS (yoki domen) tasdiqlanganmi."
    exit 1
fi

echo "== 2/2 Sozlama almashtirilmoqda"
[[ -f "$BACKUP" ]] || cp -p "$ENV_FILE" "$BACKUP"
chmod 600 "$BACKUP"
cp "$NEW_ENV" "$ENV_FILE"
chmod 600 "$ENV_FILE"
restart_api
echo "== Tayyor. Tasdiqlash kodlari endi $FROM_ADDRESS dan ketadi."
echo "   Qaytarish kerak bo'lsa: ~/portfolio/deploy/switch_email_to_brevo.sh --rollback"
