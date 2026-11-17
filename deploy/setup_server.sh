#!/usr/bin/env bash
# Portfolio uchun bir martalik server sozlamasi. Faqat YANGI narsa qo'shadi:
#   1) PostgreSQL'da "portfolio" foydalanuvchisi va "portfolio" bazasi
#   2) nginx'da bahodirbek.uz uchun alohida sayt fayli
# Serverdagi boshqa loyihalarga tegmaydi. Server ham, nginx ham qayta
# ishga tushirilmaydi: nginx faqat "reload" qilinadi (ishlayotgan ulanishlar uzilmaydi).
set -euo pipefail

cd "$HOME/portfolio"
DB_PASSWORD=$(grep '^DATABASE_URL=' backend.env | sed -E 's#^.*://portfolio:([^@]+)@.*$#\1#')

echo "== 1/2 PostgreSQL: portfolio foydalanuvchisi va bazasi"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='portfolio'" | grep -q 1; then
    echo "   'portfolio' foydalanuvchisi allaqachon bor, o'tkazib yuborildi"
else
    sudo -u postgres psql -v ON_ERROR_STOP=1 -q -v pw="$DB_PASSWORD" <<'SQL'
CREATE ROLE portfolio LOGIN PASSWORD :'pw';
SQL
    echo "   foydalanuvchi yaratildi"
fi
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='portfolio'" | grep -q 1; then
    echo "   'portfolio' bazasi allaqachon bor, o'tkazib yuborildi"
else
    sudo -u postgres createdb -O portfolio portfolio
    echo "   baza yaratildi"
fi

echo "== 2/2 nginx: bahodirbek.uz sayti"
sudo cp deploy/nginx-bahodirbek.uz.conf /etc/nginx/sites-available/bahodirbek.uz
sudo ln -sfn /etc/nginx/sites-available/bahodirbek.uz /etc/nginx/sites-enabled/bahodirbek.uz
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "   nginx reload qilindi (restart emas)"
else
    echo "   XATO: nginx sozlamasi noto'g'ri, yangi fayl olib tashlanmoqda"
    sudo rm -f /etc/nginx/sites-enabled/bahodirbek.uz
    exit 1
fi

echo "== Tayyor"
