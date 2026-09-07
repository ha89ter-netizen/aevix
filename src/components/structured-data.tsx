import { OG_IMAGE, PUBLIC_CONTACT_EMAIL, SITE_NAME, SITE_ORIGIN, absoluteUrl } from "@/lib/site";

/**
 * Structured data об организации — один источник на обе публичные страницы.
 *
 * Раньше разметка жила внутри `site-experience.tsx`, то есть существовала только на `/platform`.
 * Корень при этом оставался без неё — хотя именно на него указывает `url` внутри самой разметки:
 * поисковику сообщали адрес главной страницы со страницы, которая главной не является.
 *
 * Серверный компонент без состояния: данные полностью константны, ничего не вычисляется на
 * клиенте, и в браузерный бандл это не попадает.
 *
 * Здесь только то, что можно подтвердить: имя, адрес, знак, публичный контакт, каналы связи,
 * регион и состав услуг. Ни отзывов, ни рейтинга, ни адреса офиса, ни даты основания — их нечем
 * подтвердить, а `aggregateRating` без настоящих отзывов это не украшение, а ложь в разметке.
 *
 * `founder` и `areaServed` — данные владельца, а не кода: если они изменятся, менять здесь.
 */
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: absoluteUrl("/icon.svg"),
  image: absoluteUrl(OG_IMAGE.path),
  founder: {
    "@type": "Person",
    name: "Kossybayev Alan",
    jobTitle: "Founder & CEO",
  },
  email: PUBLIC_CONTACT_EMAIL,
  sameAs: ["https://t.me/ksalnww47", "https://wa.me/77075006022"],
  areaServed: "Kazakhstan",
  description:
    "AEVIX создает цифровые системы для малого бизнеса: AI-консультанты, боты, сайты, CRM-интеграции, запись, напоминания и сбор отзывов.",
  serviceType: [
    "AI-консультанты",
    "Telegram и WhatsApp-боты",
    "Автоматизация записи и заявок",
    "Сайты",
    "CRM-интеграции",
  ],
} as const;

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
    />
  );
}
