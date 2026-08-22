"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ProcessIllustration } from "@/components/workspace/process-illustration";
import { describeProcess, processPrinciples, stageWidths } from "@/lib/process-illustrations";

/**
 * «Процесс» как визуальная история бизнеса (этап 4).
 *
 * Не схема ●─●─● и не вертикальный таймлайн: крупные карточки, у каждой своя микро-сцена, которая
 * ПОКАЗЫВАЕТ действие. Читается сверху вниз. Illustration explains — text confirms.
 *
 * Данные — `analysis.flow` (4–7 шагов под конкретный бизнес), поэтому один компонент рассказывает
 * разные истории для салона, автосервиса, ресторана, клиники. Тип шага и принципы — детерминированно
 * из текста шага (см. process-illustrations.ts), без второго запроса к AI.
 *
 * Раскладка «без сироты»: первая карточка ведущая (во всю ширину), остальные парами, а при нечётном
 * остатке последняя тоже во всю ширину — 3/4/5/6/7/10 шагов выглядят намеренно.
 *
 * Движение — однократный вход при попадании во вьюпорт, спокойный. Карточки видимы по умолчанию:
 * без JS и при reduced-motion страница полностью читаема, анимация лишь добавляет проявление.
 */

export function ProcessStory({ steps }: { steps: string[] }) {
  const stages = describeProcess(steps);
  const widths = stageWidths(stages.length);
  const principles = processPrinciples(steps);

  // Однократное проявление: индекс попал во вьюпорт → остаётся раскрытым. Set в состоянии, чтобы
  // и карточка, и её иллюстрация (data-revealed) узнали о проявлении и сыграли действие один раз.
  const gridRef = useRef<HTMLOListElement>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-index]"));
    if (!("IntersectionObserver" in window)) {
      // Нет наблюдателя — показываем всё сразу, а не прячем контент навсегда.
      setRevealed(new Set(cards.map((c) => Number(c.dataset.index))));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        let changed = false;
        const next = new Set<number>();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            next.add(Number((entry.target as HTMLElement).dataset.index));
            io.unobserve(entry.target);
            changed = true;
          }
        }
        if (changed) setRevealed((prev) => new Set([...prev, ...next]));
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
    );
    cards.forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, [stages.length]);

  return (
    <section className="process-story" aria-label="Как AEVIX предлагает устроить работу бизнеса">
      <header className="process-head">
        {/* Честная маркировка: это ПРЕДЛОЖЕНИЕ AEVIX из AI-анализа, а не реальные данные клиента. */}
        <p className="process-eyebrow">
          <span className="process-tag">Предложение AEVIX</span>
          Демонстрационный сценарий по итогам AI-анализа
        </p>
        <h1 className="process-title">Как работает ваш бизнес</h1>
        <p className="process-lede">
          От первого действия клиента до результата — так AEVIX предлагает вести работу этого бизнеса.
        </p>
      </header>

      <ol className="process-grid" ref={gridRef} aria-label="Этапы процесса">
        {stages.map((stage, index) => {
          const isRevealed = revealed.has(index);
          return (
            <li
              key={`${stage.title}-${index}`}
              data-index={index}
              data-type={stage.type}
              className={cn("process-card", widths[index] && "is-wide", isRevealed && "is-revealed")}
            >
              <span className="process-card-num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="process-card-illu">
                <ProcessIllustration type={stage.type} revealed={isRevealed} />
              </div>
              <div className="process-card-copy">
                <h2 className="process-card-title">{stage.title}</h2>
                <span className="process-card-caption">{stage.caption}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Спокойный смысловой финал: 2–3 системных эффекта, выведенных ИЗ состава процесса, а не
          одинаковых для всех. Не карточки, не FAQ, не огромный CTA. */}
      <aside className="process-why" aria-label="Почему именно так">
        <h2 className="process-why-title">Почему именно так</h2>
        <ul className="process-why-list">
          {principles.map((principle) => (
            <li key={principle.key}>{principle.text}</li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

export default ProcessStory;
