/**
 * Локали продукта.
 *
 * Русский — основная локаль и запасной вариант: если ключа нет в выбранном языке, отдаётся
 * русская строка, а не пустота и не сам ключ. Это не «пока не перевели», а осознанное правило —
 * продукт делается для Казахстана, где русский понимают все, и увидеть русскую строку в
 * английском интерфейсе лучше, чем `entry.headline` на экране у клиента.
 *
 * Код казахского — `kk`, по стандарту языка. В интерфейсе он показывается как «KZ», потому что
 * так его узнают здесь; путать код и подпись нельзя, иначе однажды в `Accept-Language` уедет
 * несуществующий язык.
 */

export const LOCALES = ["ru", "en", "kk"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

/** Подпись в переключателе. Именно подпись, а не код. */
export const LOCALE_LABEL: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
  kk: "KZ",
};

/** Полное название на самом языке — для `aria-label` и подсказок. */
export const LOCALE_NAME: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
