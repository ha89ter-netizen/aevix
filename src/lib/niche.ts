/**
 * Канонический резолвер ниши — ЕДИНСТВЕННЫЙ источник niche identity (этап 7, Wave 1).
 *
 * До этого нишу определяли ДВА независимых классификатора: `hero-analysis.detectBusiness` (для
 * карточки анализа) и `business-knowledge.businessKnowledgeFor` (для генерации сайта). Разные
 * словари, разные алгоритмы, разный порядок — они расходились (QA-2), а у analysis была подстрочная
 * ловушка: `"ресторан".includes("сто")` → авто (QA-1). Теперь оба потребителя читают ОДИН резолвер,
 * поэтому analysis и concept не могут разойтись по identity.
 *
 * Резолвер владеет ТОЛЬКО detection truth (какая ниша). Контент ниши (услуги, тексты, палитра)
 * по-прежнему в `business-knowledge` — там знания, здесь распознавание.
 *
 * Матчинг — токенный, не подстрочный:
 *   - фраза (с пробелом)      → вхождение фразы (она достаточно специфична);
 *   - длинный сигнал (≥4)     → префикс токена (ловит падежи: «стриж» → «стрижка»);
 *   - короткий сигнал (≤3)    → ТОЧНЫЙ токен целиком («бар», «spa», «зал») — не внутри слова;
 *   - аббревиатура (cs)       → точный токен В ИСХОДНОМ регистре («СТО»), чтобы число «сто» и
 *                               «ре-сто-ран», «сто столиков», «стоимость» не срабатывали как авто.
 * Побеждает не первый в списке, а лучший по сумме сигналов (strong=2, weak=1). Ноль → generic.
 */

export type NicheId =
  | "coffee"
  | "restaurant"
  | "barbershop"
  | "beauty"
  | "dental"
  | "fitness"
  | "hotel"
  | "flowers"
  | "perfume"
  | "auto"
  | "realestate"
  | "shop"
  | "construction"
  | "generic";

/** Сигнал: текст + вес (weak) + чувствительность к регистру (для аббревиатур). */
type Signal = { t: string; w?: boolean; cs?: boolean };
const s = (t: string): Signal => ({ t });
const weak = (t: string): Signal => ({ t, w: true });
const acronym = (t: string): Signal => ({ t, cs: true });

/**
 * Реестр ниш. Порядок используется только для tie-break при равном счёте (более конкретные выше).
 * Сигналы — объединение прежних словарей обоих детекторов (RU+EN) плюс правки под матрицу QA.
 */
const REGISTRY: Array<{ id: NicheId; signals: Signal[] }> = [
  { id: "coffee", signals: [s("кофейн"), s("кофе"), s("бариста"), s("эспрессо"), s("капучино"), s("латте"), s("coffee"), s("roast")] },
  { id: "restaurant", signals: [s("ресторан"), s("кафе"), s("пицц"), s("суши"), s("кухн"), s("гастро"), s("бистро"), s("restaurant"), s("food"), weak("бар"), weak("еда")] },
  { id: "barbershop", signals: [s("барбер"), s("стриж"), s("бород"), s("barber"), s("брадобрей")] },
  { id: "beauty", signals: [s("красот"), s("парикмахер"), s("маникюр"), s("ногт"), s("бров"), s("ресниц"), s("космет"), s("визаж"), s("макияж"), s("beauty"), weak("салон"), weak("spa"), weak("спа")] },
  { id: "dental", signals: [s("стоматолог"), s("зуб"), s("дент"), s("dental"), s("ортодонт"), s("имплант"), s("клиник")] },
  { id: "fitness", signals: [s("фитнес"), s("спорт"), s("трен"), s("gym"), s("fitness"), s("йога"), s("кроссфит"), s("пилатес"), weak("зал")] },
  { id: "hotel", signals: [s("отель"), s("гостиниц"), s("hotel"), s("хостел"), s("апарт"), s("resort"), weak("номер")] },
  { id: "flowers", signals: [s("цветоч"), s("цветы"), s("букет"), s("флор"), s("flower"), s("розы"), s("пион"), s("тюльпан")] },
  { id: "perfume", signals: [s("парфюм"), s("аромат"), s("sillage"), s("духи"), s("perfume"), s("селектив"), weak("ниша")] },
  { id: "auto", signals: [s("автосервис"), s("авто"), s("шином"), s("детейлинг"), s("мотор"), s("ремонт авто"), s("ремонт машин"), s("car service"), s("auto service"), acronym("СТО")] },
  { id: "realestate", signals: [s("недвижим"), s("риелтор"), s("риэлтор"), s("квартир"), s("ипотек"), s("real estate"), s("новостро"), weak("аренда"), weak("жк")] },
  { id: "shop", signals: [s("магазин"), s("одежд"), s("бутик"), s("shop"), s("store"), s("маркет"), s("обув"), weak("товар")] },
  { id: "construction", signals: [s("строит"), s("монолит"), s("прораб"), s("отделк"), s("construct"), s("стройк"), weak("ремонт")] },
];

export type NicheResolution = {
  id: NicheId;
  /** Внутренний счёт совпадений (не калиброванная вероятность). UI не обязан показывать как %. */
  score: number;
  matchedSignals: string[];
  fallbackReason?: string;
};

const wordSplit = (text: string, re: RegExp) => text.split(re).filter(Boolean);

function matches(signal: Signal, lowTokens: string[], rawTokens: string[], low: string): boolean {
  if (signal.cs) return rawTokens.includes(signal.t); // аббревиатура в исходном регистре: «СТО»
  if (signal.t.includes(" ")) return low.includes(signal.t); // фраза
  if (signal.t.length <= 3) return lowTokens.includes(signal.t); // короткий — только целый токен
  return lowTokens.some((token) => token.startsWith(signal.t)); // длинный — префикс (падежи)
}

/** Определить нишу по свободному тексту. Детерминированно; один и тот же вход → один и тот же id. */
export function resolveNiche(input: string): NicheResolution {
  const raw = (input ?? "").trim();
  const low = raw.toLowerCase();
  const lowTokens = wordSplit(low, /[^a-zа-яё0-9]+/i);
  const rawTokens = wordSplit(raw, /[^a-zA-Zа-яёА-ЯЁ0-9]+/);

  let best: { id: NicheId; score: number; matched: string[] } | null = null;
  for (const niche of REGISTRY) {
    let score = 0;
    const matched: string[] = [];
    for (const signal of niche.signals) {
      if (matches(signal, lowTokens, rawTokens, low)) {
        score += signal.w ? 1 : 2;
        matched.push(signal.t);
      }
    }
    // Строго больше — при равенстве остаётся более конкретная ниша (раньше в реестре).
    if (score > 0 && (!best || score > best.score)) best = { id: niche.id, score, matched };
  }

  if (!best) return { id: "generic", score: 0, matchedSignals: [], fallbackReason: raw ? "no-signals" : "empty-input" };
  return { id: best.id, score: best.score, matchedSignals: best.matched };
}

/** Уверенность из счёта — НЕ калиброванная вероятность. Пока для совместимости UI; редизайн карточки
 *  анализа (убрать псевдо-проценты) — отдельная волна. */
export function nicheConfidence(res: NicheResolution): number {
  if (res.score <= 0) return 55;
  return Math.min(96, 78 + res.score * 4);
}
