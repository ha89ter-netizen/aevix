"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects";
import { projectHref } from "@/components/shell/shell-nav";
import { StyleCard } from "@/components/workspace/style-card";
import {
  conceptBusinessTypes,
  conceptColors,
  conceptStyles,
  MAX_CONCEPT_COLORS,
  type ConceptColorId,
  type ConceptStyleId,
} from "@/lib/website-concept";

const MAX_STYLES = 3;
// A light default so the STRUCTURAL differences between styles (radius, weight, tracking,
// shadow, density) are what the eye compares. A dark default made every card read as "dark".
const DEFAULT_PREVIEW_COLORS: ConceptColorId[] = ["blue"];

/**
 * A short briefing, not a configuration screen. Four facts about the business, up to three
 * visual directions chosen by eye, and one button that starts the AI working — the project is
 * never handed over empty for the visitor to assemble themselves.
 */
export default function CreateProjectPage() {
  const router = useRouter();
  const { create, generateAll } = useProjects();

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [styleIds, setStyleIds] = useState<ConceptStyleId[]>([]);
  const [colorIds, setColorIds] = useState<ConceptColorId[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const previewColors = colorIds.length ? colorIds : DEFAULT_PREVIEW_COLORS;

  const toggleStyle = (id: ConceptStyleId) => {
    setStyleIds((current) => {
      if (current.includes(id)) return current.filter((styleId) => styleId !== id);
      if (current.length >= MAX_STYLES) return current;
      return [...current, id];
    });
  };

  const toggleColor = (id: ConceptColorId) => {
    setColorIds((current) => {
      if (current.includes(id)) return current.filter((colorId) => colorId !== id);
      if (current.length >= MAX_CONCEPT_COLORS) return current;
      return [...current, id];
    });
  };

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const project = create({
      name,
      businessType,
      businessDescription: description.trim(),
      city: city.trim(),
      preferredStyleIds: styleIds,
      preferredColorIds: colorIds,
    });
    // Generation runs on the provider, so navigating to the project immediately does not
    // interrupt it — the project page picks the run up and shows its progress.
    void generateAll(project);
    router.push(projectHref(project.id));
  };

  return (
    <div className="workspace-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Бриф для AI</p>
        <h2 className="brief-title">Расскажите о бизнесе</h2>
        <p className="brief-lead">
          Четыре ответа и до трёх визуальных направлений — дальше AEVIX соберёт анализ, сайт, процесс и стоимость
          самостоятельно.
        </p>
      </header>

      <form className="workspace-create-form" onSubmit={handleSubmit}>
        <div className="brief-grid">
          <label className="workspace-field">
            <span className="workspace-field-label">Название бизнеса *</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Барбершоп FORMA"
              maxLength={80}
              required
            />
          </label>

          <label className="workspace-field">
            <span className="workspace-field-label">Город</span>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Например: Алматы"
              maxLength={60}
            />
          </label>
        </div>

        <div className="workspace-field">
          <span className="workspace-field-label">Категория</span>
          <div className="workspace-chip-row" role="group" aria-label="Категория бизнеса">
            {conceptBusinessTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={cn("workspace-chip", businessType === type && "is-active")}
                aria-pressed={businessType === type}
                onClick={() => setBusinessType((current) => (current === type ? "" : type))}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <label className="workspace-field">
          <span className="workspace-field-label">Коротко о бизнесе</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Чем занимаетесь, кто клиенты, что сейчас отнимает больше всего времени…"
            rows={3}
            maxLength={600}
          />
          <span className="workspace-field-hint">Чем конкретнее описание, тем точнее AI соберёт проект.</span>
        </label>

        <div className="workspace-field">
          <span className="workspace-field-label">
            Визуальное направление{" "}
            <em>
              {styleIds.length}/{MAX_STYLES}
            </em>
          </span>
          <span className="workspace-field-hint">Выберите от одного до трёх — превью показывает реальный результат.</span>
          <div className="style-card-grid" role="group" aria-label="Визуальный стиль">
            {conceptStyles.map((style) => (
              <StyleCard
                key={style.id}
                styleId={style.id}
                label={style.label}
                colorIds={previewColors}
                selected={styleIds.includes(style.id)}
                disabled={styleIds.length >= MAX_STYLES}
                onToggle={() => toggleStyle(style.id)}
              />
            ))}
          </div>
        </div>

        <div className="workspace-field">
          <span className="workspace-field-label">
            Цвета бренда{" "}
            <em>
              {colorIds.length}/{MAX_CONCEPT_COLORS}
            </em>
          </span>
          <div className="workspace-swatch-grid" role="group" aria-label="Цвета">
            {conceptColors.map((color) => {
              const selected = colorIds.includes(color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  className={cn("workspace-swatch", selected && "is-active")}
                  aria-pressed={selected}
                  title={color.label}
                  aria-label={color.label}
                  onClick={() => toggleColor(color.id)}
                >
                  <i style={{ background: color.swatch }} />
                  {selected ? <Check className="h-3 w-3" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <button type="submit" className="workspace-create-submit" disabled={!canSubmit}>
          <Sparkles className="h-4 w-4" />
          {submitting ? "Запускаем AI…" : "Создать проект"}
        </button>
        <p className="workspace-storage-notice">
          AEVIX сразу соберёт анализ, сайт, процесс и стоимость — открывать пустой проект не придётся.
        </p>
      </form>
    </div>
  );
}
