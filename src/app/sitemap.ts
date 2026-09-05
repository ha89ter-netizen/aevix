import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Только те страницы, которым есть место в поиске.
 *
 * Обе публичные страницы, а не одна: после разделения публичного слоя содержание живёт на
 * `/platform`, а `/` — короткий входной экран. Оставить в карте только корень значило бы отдать
 * поиску страницу без текста и спрятать ту, ради которой из поиска приходят.
 *
 * Правовые страницы тоже здесь: это настоящие публичные документы по прямым адресам, и человек
 * вправе найти их поиском, а не только через подвал.
 *
 * Чего здесь нет и быть не может: `/app/**` (вход, проекты, профиль, настройки), `/api/**` и
 * проекты конкретных людей. Их содержание принадлежит владельцу, а не выдаче. Якорей лендинга
 * тоже нет — `#цены` не отдельный URL, и запись о нём была бы дублем `/platform`.
 */
const PUBLIC_PAGES = [
  { path: "/", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/platform", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
