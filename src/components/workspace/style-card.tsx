"use client";

import { useMemo, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateVisualIdentity, type ConceptColorId, type ConceptStyleId } from "@/lib/website-concept";

/**
 * A style is chosen by looking at it, not by reading its name.
 *
 * The miniature is not an illustration of the style — it is rendered from `generateVisualIdentity`,
 * the same function that themes the real generated website, using the colours the visitor has
 * actually picked. So the radius, weight, tracking, shadow language and spacing in the thumbnail
 * are literally what that style will produce. A drawn mockup would have to be kept in sync by
 * hand and would eventually start lying.
 *
 * КОМПОЗИЦИЯ, А НЕ ТОЛЬКО ОФОРМЛЕНИЕ. Замер тринадцати превью показывал: одна схема разметки на
 * всех, двенадцать элементов в каждом, заголовок занимает 9–10% кадра везде, изображений нет
 * нигде. Различались только токены — то есть поверхность. «Роскошь» и «Брутализм» имели один
 * скелет и отличались скруглением.
 *
 * Поэтому стили разбиты на четыре семейства композиции. Каркас общий — та же пропорция, рамка,
 * тень, подпись и тот же источник токенов: это и есть бренд AEVIX, разные концепции одного
 * продукта, а не набор случайных шаблонов. Внутри кадра композиция своя у каждого семейства.
 */

/** Нейтральное слово: кириллица, пять букв — достаточно, чтобы увидеть трекинг и вес. */
const SAMPLE_HEADING = "Бренд";

type Family = "typographic" | "photo" | "grid" | "layered";

/**
 * Вариант внутри семейства.
 *
 * Одной композиции на семейство мало: «Роскошь», «Премиум» и «Элегантный» получались похожими
 * до неразличимости — общий каркас, а различия только в скруглении. Вариант меняет пропорции
 * внутри той же композиции, поэтому ни один из тринадцати не повторяет другой, а семейство
 * при этом остаётся узнаваемым.
 */
const VARIANT: Partial<Record<ConceptStyleId, 1 | 2 | 3 | 4>> = {
  // Типографская: по центру и воздушно / колонка с линией / во всю ширину и тяжело.
  minimal: 1,
  editorial: 2,
  brutalist: 3,
  // Фотографическая: кадр во весь блок / кадр сверху с текстом под ним / кадр с полями.
  luxury: 1,
  premium: 2,
  elegant: 3,
  // Сеточная: 3×2 / 2×3 / крупные 2×2 / смешанная.
  tech: 1,
  futuristic: 2,
  bold: 3,
  modern: 4,
  // Слоёная: слой справа / слой слева / слой снизу.
  glass: 1,
  soft: 2,
  organic: 3,
};

/**
 * Какому семейству принадлежит стиль.
 *
 * Деление не по вкусу, а по тому, чем стиль выражает себя: у одних главное — типографика, у
 * других — фотография, у третьих — сетка, у четвёртых — слои и прозрачность.
 */
const FAMILY: Record<ConceptStyleId, Family> = {
  minimal: "typographic",
  editorial: "typographic",
  brutalist: "typographic",
  luxury: "photo",
  premium: "photo",
  elegant: "photo",
  tech: "grid",
  futuristic: "grid",
  bold: "grid",
  modern: "grid",
  glass: "layered",
  soft: "layered",
  organic: "layered",
};

export function StyleCard({
  styleId,
  label,
  colorIds,
  selected,
  disabled,
  onToggle,
}: {
  styleId: ConceptStyleId;
  label: string;
  colorIds: ConceptColorId[];
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const identity = useMemo(() => generateVisualIdentity(colorIds, styleId), [colorIds, styleId]);
  const { palette, tokens } = identity;
  const family = FAMILY[styleId] ?? "typographic";
  const variant = VARIANT[styleId] ?? 1;

  const style = {
    "--sc-bg": palette.background,
    "--sc-surface": palette.surface,
    "--sc-border": palette.border,
    "--sc-text": palette.text,
    "--sc-muted": palette.textMuted,
    "--sc-accent": palette.accent,
    "--sc-radius": tokens.radius,
    "--sc-radius-sm": tokens.radiusSmall,
    "--sc-tracking": tokens.letterSpacing,
    "--sc-heading-weight": String(tokens.headingWeight),
    "--sc-body-weight": String(tokens.bodyWeight),
    // Масштаб заголовка и плотность — безразмерные множители, поэтому в CSS уходят числами и
    // умножаются там на базовый размер миниатюры.
    "--sc-heading-scale": String(tokens.headingScale),
    "--sc-spacing": String(tokens.spacing),
    "--sc-border-width": tokens.borderWidth,
    "--sc-shadow": tokens.shadowSm,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={cn("style-card", selected && "is-selected")}
      aria-pressed={selected}
      // A disabled card would drop out of the tab order; keeping it focusable lets someone who
      // has already picked three understand why a fourth does nothing.
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled && !selected) return;
        onToggle();
      }}
    >
      {/* aria-hidden: для незрячего человека миниатюра — шум, название стиля ниже несёт всё
          значение. Поэтому здесь можно и нужно ставить настоящий текст ради вида. */}
      <span className={cn("style-card-preview", `is-${family}`, `is-v${variant}`)} style={style} aria-hidden="true">
        <StyleComposition family={family} />
      </span>
      <span className="style-card-label">
        {label}
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

/** Композиция кадра. Разметка своя у каждого семейства — в этом и весь смысл разделения. */
function StyleComposition({ family }: { family: Family }) {
  if (family === "photo") {
    // Крупное изображение решает всё: роскошь и премиум без него не читаются. Блок тональный,
    // собран из палитры стиля — тринадцать настоящих картинок в сетке стоили бы трафика и
    // времени загрузки ради превью размером с ладонь, и это был бы плохой размен.
    return (
      <>
        <span className="style-card-photo" />
        <span className="style-card-hero">
          <b className="style-card-heading">{SAMPLE_HEADING}</b>
          <span className="style-card-sub">коллекция и услуги</span>
        </span>
      </>
    );
  }

  if (family === "grid") {
    // Плотность как выразительное средство: элементов заметно больше, ячейки равные, геометрия
    // резкая. Именно этим технологичный отличается от воздушного, а не оттенком.
    return (
      <>
        <span className="style-card-nav">
          <i className="style-card-logo" />
          <i />
          <i />
        </span>
        <b className="style-card-heading">{SAMPLE_HEADING}</b>
        <span className="style-card-cells">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} />
          ))}
        </span>
      </>
    );
  }

  if (family === "layered") {
    // Слои и прозрачность: плоскости перекрываются, радиусы крупные, воздуха много.
    return (
      <>
        <span className="style-card-layer style-card-layer-back" />
        <span className="style-card-layer style-card-layer-front">
          <b className="style-card-heading">{SAMPLE_HEADING}</b>
          <span className="style-card-sub">услуги и запись</span>
        </span>
        <span className="style-card-cta">Смотреть</span>
      </>
    );
  }

  // Типографская: заголовок занимает треть кадра и больше, элементов минимум, карточек нет.
  return (
    <>
      <span className="style-card-nav">
        <i className="style-card-logo" />
        <i />
      </span>
      <b className="style-card-heading style-card-heading-xl">{SAMPLE_HEADING}</b>
      <span className="style-card-rule" />
      <span className="style-card-sub">услуги · цены · контакты</span>
    </>
  );
}
