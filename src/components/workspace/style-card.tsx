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
 */
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
      <span className="style-card-preview" style={style} aria-hidden="true">
        <span className="style-card-nav">
          <i className="style-card-logo" />
          <i />
          <i />
        </span>
        <span className="style-card-hero">
          <b />
          <b className="is-short" />
          <span className="style-card-cta" />
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
