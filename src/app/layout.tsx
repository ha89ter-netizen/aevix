import type { Metadata } from "next";
import { Geist, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aevix.vercel.app"),
  title: {
    default: "AEVIX — цифровые системы для малого бизнеса",
    template: "%s — AEVIX",
  },
  description:
    "AEVIX создает AI-консультантов, Telegram и WhatsApp-ботов, сайты, CRM-интеграции, запись, напоминания и сбор отзывов для малого бизнеса.",
  applicationName: "AEVIX",
  creator: "Kossybayev Alan",
  keywords: [
    "AEVIX",
    "AI-консультант",
    "автоматизация заявок",
    "Telegram бот для бизнеса",
    "WhatsApp бот для бизнеса",
    "CRM интеграция",
    "сайт для малого бизнеса",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AEVIX — цифровые системы для малого бизнеса",
    description:
      "AI-консультанты, боты, сайты, CRM-интеграции, запись, напоминания и сбор отзывов для малого бизнеса.",
    url: "https://aevix.vercel.app",
    siteName: "AEVIX",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AEVIX — цифровые системы для малого бизнеса",
    description:
      "AEVIX помогает убрать повторяющуюся работу: заявки, ответы, запись, напоминания и CRM-сценарии.",
  },
  icons: {
    icon: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${manrope.variable}`}>
        {children}
      </body>
    </html>
  );
}
