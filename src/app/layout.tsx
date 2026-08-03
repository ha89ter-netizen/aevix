import type { Metadata } from "next";
import { Geist, Manrope } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth-context";
import { BusinessProvider } from "@/lib/business-context";
import { ProjectsProvider } from "@/lib/projects";
import "./globals.css";
import { ProductShell } from "@/components/shell/product-shell";

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
        <div className="aevix-atmosphere" aria-hidden="true">
          <span className="aevix-orb aevix-orb-1" />
          <span className="aevix-orb aevix-orb-2" />
          <span className="aevix-orb aevix-orb-3" />
          <span className="aevix-atmosphere-grain" />
        </div>
        {/* Shared across the landing page and the Workspace, mounted once here so a business
            described on either side carries over when the visitor navigates between them —
            client-side navigation keeps this provider mounted, only the route content swaps. */}
        {/* AuthProvider — выше ProjectsProvider: последний обязан знать, вошёл ли человек,
            прежде чем решать, у какого хранилища спрашивать проекты. */}
        <AuthProvider>
          <BusinessProvider>
            <ProjectsProvider>
              <MotionConfig reducedMotion="user">
                <ProductShell>{children}</ProductShell>
              </MotionConfig>
            </ProjectsProvider>
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
