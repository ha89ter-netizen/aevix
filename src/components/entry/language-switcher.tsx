"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { LOCALES, LOCALE_LABEL, LOCALE_NAME, type Locale } from "@/lib/i18n/locales";

/**
 * Переключатель языка — единственный управляющий элемент во всей верхней панели входного экрана.
 *
 * Меню, а не три кнопки в ряд: три подписи подряд читаются как навигация и спорят с логотипом за
 * внимание, а панель обязана оставаться пустой. Свёрнутый вид показывает текущий язык — этого
 * достаточно, чтобы понять состояние.
 *
 * Внутри меню стоит тихая строка о том, что переведён пока только этот экран. Это не оговорка
 * ради приличия: Workspace и сгенерированные сайты остаются русскими, и человек должен узнать об
 * этом до переключения, а не после — когда следующая страница окажется не на его языке. По той же
 * причине переключателя нет в Workspace: там он обещал бы то, чего нет.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t, isReady } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div className="entry-lang" ref={wrapRef}>
      <button
        type="button"
        className={cn("entry-lang-trigger", open && "is-open")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("entry.nav.language")}
        onClick={() => setOpen((value) => !value)}
      >
        {/* До того как выбор прочитан из хранилища, показывается основная локаль — иначе
            переключатель мигнул бы чужим языком на первом кадре. */}
        <span aria-hidden="true">{LOCALE_LABEL[isReady ? locale : "ru"]}</span>
      </button>

      {open ? (
        <div className="entry-lang-menu" role="menu" aria-label={t("entry.nav.language")}>
          {LOCALES.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemradio"
              aria-checked={item === locale}
              className={cn("entry-lang-option", item === locale && "is-active")}
              onClick={() => choose(item)}
              lang={item}
            >
              <span className="entry-lang-code">{LOCALE_LABEL[item]}</span>
              <span className="entry-lang-name">{LOCALE_NAME[item]}</span>
            </button>
          ))}
          <p className="entry-lang-scope">{t("entry.nav.languageScope")}</p>
        </div>
      ) : null}
    </div>
  );
}
