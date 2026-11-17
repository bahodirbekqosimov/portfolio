import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://bahodirbek.uz"),
  title: {
    default: "bahodirbek.uz — Developer Platform & Tech Blog",
    template: "%s | bahodirbek.uz",
  },
  description:
    "Modern personal developer platform showcasing software engineering projects, work experience, technical articles, and insights by Bahodirbek.",
  keywords: [
    "Bahodirbek",
    "Software Engineer",
    "Backend Developer",
    "Python",
    "FastAPI",
    "Django",
    "Portfolio",
    "Tech Blog",
  ],
  authors: [{ name: "Bahodirbek", url: "https://bahodirbek.uz" }],
  creator: "Bahodirbek",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bahodirbek.uz",
    siteName: "bahodirbek.uz",
    title: "bahodirbek.uz — Developer Platform & Tech Blog",
    description:
      "Modern personal developer platform showcasing software engineering projects, work experience, technical articles, and insights by Bahodirbek.",
  },
  twitter: {
    card: "summary_large_image",
    title: "bahodirbek.uz — Developer Platform & Tech Blog",
    description:
      "Modern personal developer platform showcasing software engineering projects, work experience, technical articles, and insights by Bahodirbek.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 w-full">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
