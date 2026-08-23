/**
 * Канонический резолвер ниши — ЕДИНСТВЕННЫЙ источник niche identity (этап 7, Wave 1; расширен Wave 3).
 *
 * До этого нишу определяли ДВА независимых классификатора: `hero-analysis.detectBusiness` (для
 * карточки анализа) и `business-knowledge.businessKnowledgeFor` (для генерации сайта). Разные
 * словари, разные алгоритмы, разный порядок — они расходились (QA-2), а у analysis была подстрочная
 * ловушка: `"ресторан".includes("сто")` → авто (QA-1). Теперь оба потребителя читают ОДИН резолвер,
 * поэтому analysis и concept не могут разойтись по identity.
 *
 * Резолвер владеет ТОЛЬКО detection truth (какая ниша и, если ясно, подтип). Контент ниши (услуги,
 * тексты, палитра) — в `business-knowledge`: там знания, здесь распознавание.
 *
 * Матчинг — токенный, не подстрочный:
 *   - фраза (с пробелом)      → вхождение фразы (она достаточно специфична: «ремонт квартир»);
 *   - длинный сигнал (≥4)     → префикс токена (ловит падежи: «стриж» → «стрижка»);
 *   - короткий сигнал (≤3)    → ТОЧНЫЙ токен целиком («бар», «spa», «зал») — не внутри слова;
 *   - аббревиатура (cs)       → точный токен В ИСХОДНОМ регистре («СТО»), чтобы число «сто» и
 *                               «ре-сто-ран», «сто столиков», «стоимость» не срабатывали как авто.
 *   - негатив (neg)           → присутствие вычитает очки: «салон автомобилей» не должен стать beauty
 *                               из-за слова «салон» (§13 — ограниченное negative evidence).
 *
 * Побеждает не первый в списке, а лучший по сумме сигналов (strong=2, weak=1). При равенстве
 * остаётся более конкретная ниша (раньше в реестре). Ноль → generic.
 *
 * ПОДТИП (Wave 3): base niche + optional subtype. Base — где различаются product semantics
 * (структура/каталог/CTA/knowledge). Subtype — более тонкая identity ВНУТРИ базы, если downstream
 * может её использовать (юр.услуги: law/accounting/consulting делят один knowledge-профиль, но разный
 * словарь). Не плодить NicheId ради красоты: subtype есть только там, где он на что-то влияет.
 */

export type NicheId =
  | "coffee"
  | "restaurant"
  | "bakery"
  | "barbershop"
  | "beauty"
  | "dental"
  | "medical"
  | "pet"
  | "fitness"
  | "hotel"
  | "flowers"
  | "perfume"
  | "legal"
  | "education"
  | "photo"
  | "cleaning"
  | "auto"
  | "realestate"
  | "construction"
  | "shop"
  | "generic";

/** Сигнал: текст + вес (weak) + регистрозависимость (cs, для аббревиатур) + негатив (neg) +
 *  метка подтипа (sub), которую сигнал зажигает, если попал в победившую нишу. */
type Signal = { t: string; w?: boolean; cs?: boolean; neg?: boolean; sub?: string };
const s = (t: string, sub?: string): Signal => ({ t, sub });
const weak = (t: string, sub?: string): Signal => ({ t, w: true, sub });
const acronym = (t: string, sub?: string): Signal => ({ t, cs: true, sub });
const neg = (t: string): Signal => ({ t, neg: true });

/**
 * Реестр ниш. Порядок используется для tie-break при равном счёте (более конкретные и те, что
 * должны выигрывать коллизии, — выше). Ключевые порядки:
 *   - dental и pet РАНЬШЕ medical: «зубная клиника» → dental, «ветеринарная клиника» → pet,
 *     а «медицинская клиника» → medical (слово «клиник» живёт у medical, не у dental);
 *   - flowers и perfume РАНЬШЕ shop: «магазин цветов» → flowers, «парфюмерный магазин» → perfume.
 */
const REGISTRY: Array<{ id: NicheId; signals: Signal[] }> = [
  { id: "coffee", signals: [s("кофейн"), s("кофе"), s("kofe"), s("бариста"), s("эспрессо"), s("капучино"), s("латте"), s("coffee"), s("roast")] },
  { id: "bakery", signals: [s("пекарн"), s("кондитер"), s("выпечк"), s("bakery"), s("pastry"), weak("торт"), weak("десерт"), weak("хлеб")] },
  { id: "restaurant", signals: [s("ресторан"), s("restoran"), s("кафе", "cafe"), s("cafe", "cafe"), s("пицц", "pizzeria"), s("суши", "sushi"), s("кухн"), s("гастро"), s("бистро", "bistro"), s("столов"), s("restaurant"), s("food"), weak("бар", "bar"), weak("еда"), weak("еды"), weak("обед")] },
  { id: "barbershop", signals: [s("барбер"), s("barber"), s("стриж"), s("бород"), s("брадобрей")] },
  { id: "beauty", signals: [s("красот"), s("krasot"), s("парикмахер", "hair"), s("маникюр", "nails"), s("ногт", "nails"), s("nail", "nails"), s("бров", "brows"), s("ресниц", "lashes"), s("космет", "cosmetology"), s("визаж", "makeup"), s("макияж", "makeup"), s("массаж", "spa"), s("beauty"), weak("салон"), weak("spa", "spa"), weak("спа", "spa"), neg("автомобил"), neg("машин"), neg("запчаст")] },
  { id: "dental", signals: [s("стоматолог"), s("stomatolog"), s("зубн"), s("зуб"), s("дент"), s("dental"), s("ортодонт"), s("имплант"), s("брекет")] },
  { id: "medical", signals: [s("медицин"), s("клиник"), s("clinic"), s("поликлиник"), s("диагност", "diagnostics"), s("терапевт"), s("педиатр"), s("узи"), s("анализ"), weak("врач"), weak("доктор"), weak("приём"), neg("зубн"), neg("стоматолог"), neg("ветеринар"), neg("автомобил")] },
  { id: "pet", signals: [s("груминг", "grooming"), s("grooming", "grooming"), s("зоосалон", "grooming"), s("зоомагазин"), s("грумер", "grooming"), s("ветеринар", "vet"), s("ветклиник", "vet"), weak("питомц"), weak("собак"), weak("кошк"), weak("pet")] },
  { id: "fitness", signals: [s("фитнес"), s("fitness"), s("спорт"), s("трен"), s("gym"), s("йога", "yoga"), s("yoga", "yoga"), s("кроссфит", "crossfit"), s("crossfit", "crossfit"), s("пилатес", "pilates"), weak("зал")] },
  { id: "hotel", signals: [s("отель"), s("гостиниц"), s("hotel"), s("хостел"), s("апарт"), s("resort"), weak("номер")] },
  { id: "flowers", signals: [s("цветоч"), s("цветы"), s("цветов"), s("cvety"), s("tsvety"), s("букет"), s("флор"), s("flower"), s("розы"), s("пион"), s("тюльпан")] },
  { id: "perfume", signals: [s("парфюм"), s("аромат"), s("sillage"), s("духи"), s("perfume"), s("селектив"), weak("ниша")] },
  { id: "legal", signals: [s("юрист", "law"), s("yurist", "law"), s("юридическ", "law"), s("адвокат", "law"), s("нотариус", "law"), s("бухгалтер", "accounting"), s("бухучёт", "accounting"), s("аудит", "accounting"), s("консалтинг", "consulting"), s("консалт", "consulting"), s("law", "law"), s("legal", "law"), s("accounting", "accounting"), s("consulting", "consulting")] },
  { id: "education", signals: [s("образовательн"), s("курс"), s("репетитор", "tutoring"), s("языков", "language"), s("language", "language"), s("english"), s("обучени"), s("лицей"), s("гимнази"), s("подготовк"), weak("школ")] },
  { id: "photo", signals: [s("фотограф", "photo"), s("фотостуди", "photo"), s("фотосъ", "photo"), s("фотосесс", "photo"), s("фото", "photo"), s("photo"), s("photograph"), s("дизайн-студи", "design"), s("видеосъ", "video"), s("видеограф", "video")] },
  { id: "cleaning", signals: [s("клининг", "cleaning"), s("cleaning", "cleaning"), s("уборк", "cleaning"), s("сантехник", "plumber"), s("plumb", "plumber"), s("электрик", "electrician"), s("электромонтаж", "electrician"), weak("мойк")] },
  { id: "auto", signals: [s("автосервис"), s("автосалон"), s("автомобил"), s("avtoservis"), s("avtomobil"), s("шином", "tire"), s("детейлинг", "detailing"), s("детейл", "detailing"), s("detailing", "detailing"), s("мотор"), s("ремонт авто"), s("ремонт машин"), s("car service"), s("auto service"), s("auto repair"), s("car repair"), s("автомойк", "wash"), acronym("СТО")] },
  { id: "realestate", signals: [s("недвижим"), s("риелтор"), s("риэлтор"), s("квартир"), s("ипотек"), s("real estate"), s("новостро"), weak("аренда"), weak("жк")] },
  { id: "construction", signals: [s("строит"), s("монолит"), s("прораб"), s("отделк"), s("construct"), s("стройк"), s("ремонт квартир"), s("ремонт помещ"), s("ремонт под ключ"), weak("ремонт")] },
  { id: "shop", signals: [s("магазин"), s("одежд", "clothing"), s("clothing", "clothing"), s("бутик", "clothing"), s("shop"), s("store"), s("маркет"), s("обув", "shoes"), s("мебел", "furniture"), s("запчаст", "parts"), s("магазин космет", "cosmetics"), s("магазин обув", "shoes"), weak("товар")] },
];

export type NicheResolution = {
  id: NicheId;
  /** Более тонкая identity внутри базы, если она явно определена; иначе null. */
  subtype: string | null;
  /** Внутренний счёт совпадений (не калиброванная вероятность). UI не показывает как %. */
  score: number;
  matchedSignals: string[];
  fallbackReason?: string;
};

const wordSplit = (text: string, re: RegExp) => text.split(re).filter(Boolean);

function matchesToken(signal: Signal, lowTokens: string[], rawTokens: string[], low: string): boolean {
  if (signal.cs) return rawTokens.includes(signal.t); // аббревиатура в исходном регистре: «СТО»
  if (signal.t.includes(" ") || signal.t.includes("-")) return low.includes(signal.t); // фраза / дефис («дизайн-студи»): токенайзер режет по дефису, ищем по строке
  if (signal.t.length <= 3) return lowTokens.includes(signal.t); // короткий — только целый токен
  return lowTokens.some((token) => token.startsWith(signal.t)); // длинный — префикс (падежи)
}

/** Определить нишу по свободному тексту. Детерминированно; один и тот же вход → один и тот же результат. */
export function resolveNiche(input: string): NicheResolution {
  const raw = (input ?? "").trim();
  const low = raw.toLowerCase();
  const lowTokens = wordSplit(low, /[^a-zа-яё0-9]+/i);
  const rawTokens = wordSplit(raw, /[^a-zA-Zа-яёА-ЯЁ0-9]+/);

  let best: { id: NicheId; score: number; matched: Signal[] } | null = null;
  for (const niche of REGISTRY) {
    let score = 0;
    const matched: Signal[] = [];
    for (const signal of niche.signals) {
      if (!matchesToken(signal, lowTokens, rawTokens, low)) continue;
      if (signal.neg) {
        score -= 3; // негатив дисквалифицирует: «салон автомобилей» не beauty
        continue;
      }
      score += signal.w ? 1 : 2;
      matched.push(signal);
    }
    // Строго больше — при равенстве остаётся более конкретная ниша (раньше в реестре).
    if (score > 0 && (!best || score > best.score)) best = { id: niche.id, score, matched };
  }

  if (!best) {
    return { id: "generic", subtype: null, score: 0, matchedSignals: [], fallbackReason: raw ? "no-signals" : "empty-input" };
  }
  // Подтип — первый (в порядке сигналов ниши) попавший сигнал с меткой sub. Детерминированно.
  const subtype = best.matched.find((sig) => sig.sub)?.sub ?? null;
  return { id: best.id, subtype, score: best.score, matchedSignals: best.matched.map((sig) => sig.t) };
}

/** Уверенность из счёта — НЕ калиброванная вероятность. Для совместимости UI; редизайн карточки
 *  анализа (убрать псевдо-проценты) — отдельная волна. */
export function nicheConfidence(res: NicheResolution): number {
  if (res.score <= 0) return 55;
  return Math.min(96, 78 + res.score * 4);
}
