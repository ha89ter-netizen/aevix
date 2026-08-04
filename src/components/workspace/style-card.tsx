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
 * Раньше это были серые полоски, и «Минимализм» с «Роскошью» выглядели одинаково — потому что
 * из всего набора токенов полоски способны показать только скругление и тень. Тонкая роскошь и
 * тяжёлый брутализм различаются весом, межбуквенным интервалом, масштабом заголовка и
 * плотностью, а на прямоугольнике ни вес, ни интервал не видны вовсе.
 *
 * Поэтому в миниатюре теперь настоящий текст. Слово «Бренд» набрано ровно тем весом, масштабом
 * и трекингом, которые этот стиль применит к заголовкам сайта, а отступы и толщина рамок берут
 * `spacing` и `borderWidth`. Это те же самые числа — просто наконец показанные тем, на чём они
 * заметны.
 */

/** Нейтральное слово: кириллица, пять букв — достаточно, чтобы увидеть трекинг и вес, и
 * достаточно коротко, чтобы поместиться при любом масштабе. */
const SAMPLE_HEADING = "Бренд";
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
      <span className="style-card-preview" style={style} aria-hidden="true">
        <span className="style-card-nav">
          <i className="style-card-logo" />
          <i />
          <i />
        </span>
        <span className="style-card-hero">
          <b className="style-card-heading">{SAMPLE_HEADING}</b>
          <span className="style-card-sub">услуги и цены</span>
          <span className="style-card-cta">Смотреть</span>
        </span>
        <span className="style-card-row">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="style-card-label">
        {label}
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}
