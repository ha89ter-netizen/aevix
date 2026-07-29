"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects";
import { projectHref } from "@/components/workspace/project-nav";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import {
  conceptBusinessTypes,
  conceptColors,
  conceptStyles,
  MAX_CONCEPT_COLORS,
  type ConceptColorId,
  type ConceptStyleId,
} from "@/lib/website-concept";

export default function CreateProjectPage() {
  const router = useRouter();
  const { create } = useProjects();

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [styleId, setStyleId] = useState<ConceptStyleId | null>(null);
  const [colorIds, setColorIds] = useState<ConceptColorId[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      preferredStyleId: styleId,
      preferredColorIds: colorIds,
    });
    // The provider's save effect runs on this same state change, so by the time the project
    // page mounts the data is already in localStorage — safe to navigate immediately.
    router.push(projectHref(project.id));
  };

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title="Создать проект"
        description="Расскажите о бизнесе — проект будет создан, сохранён и сразу откроется."
      />

      <form className="workspace-create-form" onSubmit={handleSubmit}>
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
          <span className="workspace-field-label">Город</span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Например: Алматы"
            maxLength={60}
          />
        </label>

        <label className="workspace-field">
          <span className="workspace-field-label">Короткое описание</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Чем занимается бизнес, кто клиенты, что сейчас болит…"
            rows={3}
            maxLength={600}
          />
        </label>

        <div className="workspace-field">
          <span className="workspace-field-label">Предпочитаемый стиль</span>
          <div className="workspace-chip-row" role="group" aria-label="Стиль">
            {conceptStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                className={cn("workspace-chip", styleId === style.id && "is-active")}
                aria-pressed={styleId === style.id}
                onClick={() => setStyleId((current) => (current === style.id ? null : style.id))}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="workspace-field">
          <span className="workspace-field-label">
            Предпочитаемые цвета{" "}
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
          {submitting ? "Создаём проект…" : "Создать проект"}
        </button>
        <p className="workspace-storage-notice">Проект сохранится на этом устройстве и сразу откроется.</p>
      </form>
    </div>
  );
}
