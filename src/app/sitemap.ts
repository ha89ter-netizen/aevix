import type { MetadataRoute } from "next";

const SITE = "https://aevix.vercel.app";

/**
 * Обе публичные страницы, а не одна.
 *
 * После разделения публичного слоя содержание живёт на `/platform`, а `/` — короткий входной
 * экран. Оставить в карте только корень значило бы отдать поиску страницу без текста и спрятать
 * ту, ради которой из поиска приходят.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/platform`, lastModified, changeFrequency: "weekly", priority: 1 },
  ];
}
