import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEVIX - AI operating layer for modern businesses",
  description:
    "AEVIX designs AI systems, client automation and executive dashboards that turn daily operations into measurable business leverage.",
  keywords: [
    "AEVIX",
    "AI automation",
    "digital product",
    "business operating system",
    "AI dashboard",
  ],
  openGraph: {
    title: "AEVIX - AI operating layer",
    description:
      "A premium digital product experience for business owners who want AI to handle real operational work.",
    type: "website",
  },
  metadataBase: new URL("https://aevix.ai"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
