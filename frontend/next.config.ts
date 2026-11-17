import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Docker uchun: build natijasi node_modules'siz mustaqil server bo'ladi (.next/standalone).
  output: "standalone",
  skipTrailingSlashRedirect: true,
  // Faqat hostname tekshiriladi (port yozilmaydi). Lokal tarmoqdagi boshqa qurilmalar
  // (telefon, noutbuk: http://192.168.x.x:3000) ham JS yuklay olishi uchun IP diapazonlari qo'shilgan.
  // Aks holda sahifa "jonlanmaydi": tugmalar (Send code, Sign in) ishlamaydi.
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    ...(process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*/",
        destination: `${BACKEND_URL}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*/`,
      },
      {
        source: "/media/:path*",
        destination: `${BACKEND_URL}/media/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
