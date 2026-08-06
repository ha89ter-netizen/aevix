"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { ru, type Dictionary, type TranslationKey } from "./dictionaries/ru";
import { en } from "./dictionaries/en";
import { kk } from "./dictionaries/kk";

/**
 * Единственная точка локализации интерфейса.
 *
 * Компоненты не держат своих объектов с переводами и не знают, какой язык выбран, — они просят
 * строку по ключу. Три разрозненных набора переводов внутри компонентов — ровно то, ради чего
 * этот слой и заведён: их невозможно ни пересчитать, ни отдать переводчику.
 *
 * Охват сознательно узкий: переведён публичный входной экран. Остальной продукт остаётся русским
 * и мигрирует по мере касания в следующих этапах. Поэтому провайдер оборачивает только публичный
 * слой, а не всё приложение: обернуть всё значило бы заявить охват, которого нет.
 */

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en, kk };

const STORAGE_KEY = "aevix.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
  /** Пока язык не прочитан из хранилища, переключатель не должен показывать чужой выбор. */
  isReady: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Первый рендер — всегда основная локаль: разметка на сервере и на клиенте обязана совпасть,
  // а localStorage на сервере нет. Выбранный язык приезжает следом, после монтирования.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      // Хранилище недоступно — остаёмся на основной локали, это рабочее состояние.
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Выбор не переживёт перезагрузку, но текущая сессия работает.
    }
  }, []);

  // `lang` на documentElement — не косметика: от него зависят переносы, подбор шрифта и то, каким
  // голосом прочитает страницу экранный диктор.
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) => {
      // Запасной вариант — русская строка. Показать `entry.hero.headline` вместо заголовка хуже,
      // чем показать его по-русски: продукт работает там, где русский понимают все.
      return DICTIONARIES[locale][key] || ru[key];
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, isReady }), [locale, setLocale, t, isReady]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useTranslation вызван вне LocaleProvider");
  return value;
}
