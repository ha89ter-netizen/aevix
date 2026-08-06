"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LocaleProvider, useTranslation } from "@/lib/i18n/provider";
import { publicRoutes } from "@/components/shell/shell-nav";
import { LanguageSwitcher } from "./language-switcher";
import { EcosystemSlot } from "./ecosystem-slot";

/**
 * Публичный входной экран AEVIX.
 *
 * Это не первый блок лендинга, а отдельный опыт. Его единственная задача — за секунду сообщить,
 * что открыли не конструктор сайтов, а систему. Отсюда всё остальное: пустая верхняя панель,
 * один разворот текста, две кнопки и большое место, отданное будущей живой экосистеме.
 *
 * Композиция задумана так, чтобы этап 2 ничего в ней не перестраивал. Левая колонка ничего не
 * знает о геометрии карточек, правая — о длине заголовка; между ними колонка сетки, а не
 * взаимные отступы. Поэтому сцена может занять свой отсек целиком, а текст — остаться на месте.
 *
 * Тёмная тема включается атрибутом на корне экрана. Глобальной тёмной темы у продукта нет и не
 * появляется: Workspace об этом атрибуте не знает.
 */

function EntryContent() {
  const { t } = useTranslation();
  // Заголовок хранится с переносом строки: где именно он ломается — решение типографики, а не
  // случайность ширины окна. Разбор здесь, а не <br> в словаре: перевод не должен нести разметку.
  const headline = t("entry.hero.headline").split("\n");

  return (
    <div className="entry-screen" data-surface="marketing">
      <header className="entry-nav">
        {/* Логотип на входном экране никуда не ведёт: это и есть начало. Ссылка на самого себя
            была бы обманом ожидания. */}
        <span className="entry-brand" aria-label="AEVIX">
          <span className="entry-brand-name">AEVIX</span>
        </span>
        <LanguageSwitcher />
      </header>

      <main className="entry-main">
        <div className="entry-copy">
          <p className="entry-eyebrow">{t("entry.hero.eyebrow")}</p>
          <h1 className="entry-headline">
            {headline.map((line, index) => (
              <span key={line} className="entry-headline-line">
                {line}
                {index < headline.length - 1 ? <br /> : null}
              </span>
            ))}
          </h1>
          <p className="entry-lead">{t("entry.hero.lead")}</p>

          {/* Иерархия действий: смотреть продукт важнее, чем входить. Поэтому основное действие
              — заполненная кнопка, вход — контурная, и порядок в разметке тот же, что визуально. */}
          <div className="entry-actions">
            <Link href={publicRoutes.site} className="entry-action is-primary">
              <span>{t("entry.hero.primary")}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/app/login" className="entry-action is-secondary">
              <span>{t("entry.hero.secondary")}</span>
            </Link>
          </div>
        </div>

        <EcosystemSlot />
      </main>

      {/*
        Основание композиции.

        Волосяная линия во всю ширину даёт экрану низ: содержание, прижатое к левому верху и
        ничем не закрытое снизу, читается незаконченным независимо от того, что в нём есть.

        Единственная надпись на линии — имя сцены, а не перечень разделов. Перечень был бы второй
        навигацией, от которой мы на этом экране как раз отказались; имя же принадлежит самой
        сцене и работает как штамп на чертеже — называет поле, к которому относится, и стоит
        под ним. Когда сцена оживёт и разберёт бизнес, сюда добавится его имя.
      */}
      <footer className="entry-base">
        <span className="entry-base-rule" aria-hidden="true" />
        <span id="entry-scene-name" className="entry-base-name">
          {t("entry.scene.name")}
        </span>
      </footer>
    </div>
  );
}

export function EntryScreen() {
  // Провайдер локали обёрнут вокруг входного экрана, а не вокруг всего приложения: переведён
  // пока только он, и заявлять охват шире реального нельзя.
  return (
    <LocaleProvider>
      <EntryContent />
    </LocaleProvider>
  );
}
