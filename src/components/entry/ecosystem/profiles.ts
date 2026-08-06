import type { CapabilityId } from "./capabilities";

/**
 * Как система будет узнавать конкретный бизнес.
 *
 * Профиль — это веса, а не список. Разница принципиальная: список означал бы, что у кофейни нет
 * склада и юриста не существует, а вес означает, что склад у кофейни тише прочего, но он есть.
 * Возможности не исчезают ни при каком профиле — это прямое требование к поведению системы:
 * то, чем бизнес пока не пользуется, обязано остаться видимым, иначе продукт выглядит урезанным
 * под клиента, а не полным.
 *
 * Вес управляет ТОЛЬКО заметностью: порядком отбора при нехватке места, яркостью, размером и
 * тем, какие связи система считает основными. Отрисовка о профилях ничего не знает и получает
 * уже посчитанные числа — поэтому появление настоящего разбора бизнеса не потребует ни строчки
 * в слое отрисовки.
 *
 * Значения: 1 — опора этого бизнеса, 0.6 — обычная возможность, 0.3 — тише фона.
 */

export type Emphasis = Partial<Record<CapabilityId, number>>;

export type BusinessProfile = {
  id: string;
  emphasis: Emphasis;
};

/** Вес по умолчанию для всего, чего профиль не назвал. */
export const BASE_WEIGHT = 0.55;

/**
 * Нейтральный профиль — то, что видит человек, ещё не рассказавший о своём бизнесе.
 *
 * Не «всё поровну»: ровный вес превратил бы систему в таблицу. Здесь подняты те возможности,
 * с которых начинается любой бизнес, — разговор с клиентом, сайт, запись, оплата.
 */
export const NEUTRAL_PROFILE: BusinessProfile = {
  id: "neutral",
  emphasis: {
    ai: 1,
    website: 0.9,
    crm: 0.85,
    whatsapp: 0.85,
    bookings: 0.75,
    payments: 0.75,
    analytics: 0.7,
    reviews: 0.65,
    telegram: 0.6,
    automation: 0.6,
  },
};

/**
 * Готовые профили ниш.
 *
 * Пока их не выбирает никто: на входном экране бизнес ещё не назван. Они существуют, чтобы
 * архитектура была проверяема уже сейчас — профиль подставляется одним параметром, и видно, что
 * система действительно перестраивается, а не притворяется.
 */
export const PROFILES: Record<string, BusinessProfile> = {
  restaurant: {
    id: "restaurant",
    emphasis: {
      bookings: 1,
      reviews: 0.95,
      payments: 0.9,
      whatsapp: 0.9,
      inventory: 0.8,
      website: 0.75,
      calendar: 0.7,
      marketing: 0.65,
      ai: 0.6,
      api: 0.3,
      knowledge: 0.3,
    },
  },
  salon: {
    id: "salon",
    emphasis: {
      crm: 1,
      calendar: 0.95,
      whatsapp: 0.95,
      ai: 0.9,
      reviews: 0.85,
      telegram: 0.8,
      bookings: 0.8,
      payments: 0.7,
      inventory: 0.35,
      api: 0.3,
    },
  },
  law: {
    id: "law",
    emphasis: {
      knowledge: 1,
      crm: 0.95,
      calendar: 0.9,
      email: 0.9,
      support: 0.8,
      ai: 0.8,
      website: 0.7,
      payments: 0.6,
      inventory: 0.3,
      nfc: 0.3,
      bookings: 0.4,
    },
  },
};

/** Вес возможности в профиле: названное профилем либо общий фон. */
export function weightOf(profile: BusinessProfile, id: CapabilityId): number {
  return profile.emphasis[id] ?? BASE_WEIGHT;
}
