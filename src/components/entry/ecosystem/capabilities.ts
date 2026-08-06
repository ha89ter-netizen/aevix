import type { TranslationKey } from "@/lib/i18n/dictionaries/ru";

/**
 * Что умеет система — данные, и только данные.
 *
 * Здесь нет ни координат, ни связей, ни анимации: каталог возможностей отделён от всего
 * остального намеренно. Когда сюда придёт разобранный бизнес, поменяются веса в профиле
 * (`profiles.ts`), а этот список останется прежним — возможности бизнеса не зависят от того,
 * какой именно бизнес их сейчас использует.
 *
 * Названия, которые переводятся, живут ключами: у продукта три языка. Имена собственные
 * (WhatsApp, Telegram, CRM, NFC, API) не переводятся ни на один и хранятся строкой — заводить
 * для них ключ значило бы предложить переводчику перевести непереводимое.
 *
 * Иконок здесь нет намеренно: они относятся к отрисовке и живут в `icons.ts`. Из-за этого весь
 * слой логики не тянет за собой React и проверяется обычным тестом, а не только глазами.
 */

export type CapabilityId =
  | "ai"
  | "website"
  | "crm"
  | "whatsapp"
  | "telegram"
  | "analytics"
  | "payments"
  | "bookings"
  | "reviews"
  | "automation"
  | "calendar"
  | "support"
  | "email"
  | "knowledge"
  | "nfc"
  | "api"
  | "inventory"
  | "marketing";

export type Capability = {
  id: CapabilityId;
  /** Либо ключ перевода, либо имя собственное — переводить второе не нужно и нельзя. */
  label: { key: TranslationKey } | { literal: string };
};

export const CAPABILITIES: Capability[] = [
  { id: "ai", label: { key: "eco.cap.ai" } },
  { id: "website", label: { key: "eco.cap.website" } },
  { id: "crm", label: { literal: "CRM" } },
  { id: "whatsapp", label: { literal: "WhatsApp" } },
  { id: "telegram", label: { literal: "Telegram" } },
  { id: "analytics", label: { key: "eco.cap.analytics" } },
  { id: "payments", label: { key: "eco.cap.payments" } },
  { id: "bookings", label: { key: "eco.cap.bookings" } },
  { id: "reviews", label: { key: "eco.cap.reviews" } },
  { id: "automation", label: { key: "eco.cap.automation" } },
  { id: "calendar", label: { key: "eco.cap.calendar" } },
  { id: "support", label: { key: "eco.cap.support" } },
  { id: "email", label: { key: "eco.cap.email" } },
  { id: "knowledge", label: { key: "eco.cap.knowledge" } },
  { id: "nfc", label: { literal: "NFC" } },
  { id: "api", label: { literal: "API" } },
  { id: "inventory", label: { key: "eco.cap.inventory" } },
  { id: "marketing", label: { key: "eco.cap.marketing" } },
];

export const CAPABILITY_BY_ID = new Map(CAPABILITIES.map((item) => [item.id, item]));

/**
 * Связи, которые в этом бизнесе осмысленны.
 *
 * Не «все со всеми» и не случайный набор: каждая пара — путь, по которому действительно ходят
 * данные. Запись создаёт событие в календаре, оплата попадает в CRM, отзыв приходит после
 * визита. Именно поэтому связи можно перекладывать, не теряя смысла: система выбирает путь из
 * осмысленных, а не рисует линии.
 *
 * Ядро (AEVIX) связано со всем — оно и есть то, что держит остальное вместе, — поэтому пары с
 * ядром здесь не перечисляются, а выводятся при сборке графа.
 */
export const CAPABILITY_LINKS: Array<[CapabilityId, CapabilityId]> = [
  ["whatsapp", "crm"],
  ["telegram", "crm"],
  ["bookings", "calendar"],
  ["bookings", "whatsapp"],
  ["payments", "crm"],
  ["payments", "website"],
  ["website", "reviews"],
  ["reviews", "marketing"],
  ["ai", "support"],
  ["ai", "knowledge"],
  ["support", "email"],
  ["automation", "crm"],
  ["automation", "calendar"],
  ["analytics", "payments"],
  ["analytics", "marketing"],
  ["inventory", "payments"],
  ["api", "crm"],
  ["nfc", "payments"],
  ["email", "marketing"],
  ["knowledge", "website"],
];
