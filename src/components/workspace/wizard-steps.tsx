"use client";

import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSection } from "@/lib/projects";
import { availableSections } from "@/lib/project-structure";
import { StyleCard } from "@/components/workspace/style-card";
import {
  conceptBusinessTypes,
  conceptColors,
  conceptGoals,
  conceptStyles,
  MAX_CONCEPT_COLORS,
  type ConceptColorId,
  type ConceptGoal,
  type ConceptSectionType,
  type ConceptStyleId,
} from "@/lib/website-concept";

/**
 * Шаги брифа, вынесенные из страницы.
 *
 * Каждый шаг — чистая функция от переданного состояния: своего состояния у них нет, всё
 * хранится на странице. Это не украшение — при собственном состоянии возврат на шаг назад
 * терял бы введённое, а именно возвраты в мастере происходят постоянно.
 */

export const MAX_STYLES = 3;

export function BusinessStep({
  name,
  city,
  description,
  businessType,
  onName,
  onCity,
  onDescription,
  onType,
}: {
  name: string;
  city: string;
  description: string;
  /** Категория: выведена из описания либо выбрана вручную. */
  businessType: string;
  onName: (value: string) => void;
  onCity: (value: string) => void;
  onDescription: (value: string) => void;
  onType: (value: string) => void;
}) {
  return (
    <>
      <div className="brief-grid">
        <label className="workspace-field">
          <span className="workspace-field-label">Название бизнеса *</span>
          <input
            type="text"
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder="Например: Барбершоп FORMA"
            maxLength={80}
            autoFocus
          />
        </label>

        <label className="workspace-field">
          <span className="workspace-field-label">Город</span>
          <input
            type="text"
            value={city}
            onChange={(event) => onCity(event.target.value)}
            placeholder="Например: Астана"
            maxLength={60}
          />
        </label>
      </div>

      <label className="workspace-field">
        <span className="workspace-field-label">Коротко о бизнесе</span>
        <textarea
          value={description}
          onChange={(event) => onDescription(event.target.value)}
          placeholder="Чем занимаетесь, кто клиенты, что сейчас отнимает больше всего времени…"
          rows={3}
          maxLength={600}
        />
        <span className="workspace-field-hint">Чем конкретнее описание, тем точнее AEVIX соберёт проект.</span>
      </label>

      {/* Категорию не спрашиваем отдельным вопросом: человек уже написал, чем занимается.
          Показываем догадку и даём её поправить — одно действие вместо семи. */}
      <div className="workspace-field">
        <span className="workspace-field-label">Категория</span>
        {businessType ? (
          <p className="brief-detected">
            Похоже на: <strong>{businessType}</strong>
          </p>
        ) : (
          <p className="workspace-field-hint">Определим по описанию. Можно выбрать вручную:</p>
        )}
        <div className="workspace-chip-row" role="group" aria-label="Категория бизнеса">
          {conceptBusinessTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={cn("workspace-chip", businessType === type && "is-active")}
              aria-pressed={businessType === type}
              onClick={() => onType(type)}
            >
              {businessType === type ? <Check className="h-3 w-3" /> : null}
              {type}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function GoalsStep({ goals, onToggle }: { goals: ConceptGoal[]; onToggle: (goal: ConceptGoal) => void }) {
  return (
    <div className="workspace-field">
      <span className="workspace-field-label">Чего вы хотите от сайта? *</span>
      <span className="workspace-field-hint">
        Единственный вопрос о наполнении. Разделы AEVIX предложит сам на следующем шаге.
      </span>
      <div className="workspace-chip-row" role="group" aria-label="Задача сайта">
        {conceptGoals.map((goal) => (
          <button
            key={goal}
            type="button"
            className={cn("workspace-chip", goals.includes(goal) && "is-active")}
            aria-pressed={goals.includes(goal)}
            onClick={() => onToggle(goal)}
          >
            {goals.includes(goal) ? <Check className="h-3 w-3" /> : null}
            {goal}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StructureStep({
  name,
  city,
  businessType,
  goals,
  structure,
  onRename,
  onRemove,
  onMove,
  onAdd,
}: {
  name: string;
  city: string;
  businessType: string;
  goals: ConceptGoal[];
  structure: ProjectSection[];
  onRename: (index: number, title: string) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onAdd: (type: ConceptSectionType, title: string) => void;
}) {
  const extras = availableSections(structure);
  return (
    <div className="workspace-field">
      {/* Блок понимания: что AEVIX принял во внимание, прежде чем предлагать структуру.
          Формулировка точная — модель здесь не вызывается, поэтому «сформировал рекомендации»,
          а не «проанализировал». Данные берутся из состояния мастера, поэтому возврат назад и
          правка обновляют этот блок сами. */}
      <div className="brief-understanding">
        <p className="brief-understanding-lead">
          AEVIX сформировал рекомендации на основе типа бизнеса и выбранных целей.
        </p>
        <dl className="brief-summary">
          <div>
            <dt>Бизнес</dt>
            <dd>{name || "—"}</dd>
          </div>
          <div>
            <dt>Категория</dt>
            <dd>{businessType || "определим по описанию"}</dd>
          </div>
          <div>
            <dt>Город</dt>
            <dd>{city.trim() || "не указан"}</dd>
          </div>
          <div>
            <dt>Главная цель</dt>
            <dd>{goals[0] ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <span className="workspace-field-label">Рекомендуемая структура</span>
      <span className="workspace-field-hint">
        Вы можете изменить её перед генерацией — удалить, переименовать, переставить или добавить раздел.
      </span>

      <ol className="brief-structure">
        {structure.map((section, index) => (
          <li key={`${section.type}-${index}`} className="brief-structure-row">
            <span className="brief-structure-order">
              <button
                type="button"
                aria-label={`Поднять раздел «${section.title}»`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Опустить раздел «${section.title}»`}
                disabled={index === structure.length - 1}
                onClick={() => onMove(index, 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </span>
            <input
              className="brief-structure-title"
              value={section.title}
              aria-label={`Название раздела ${index + 1}`}
              maxLength={60}
              onChange={(event) => onRename(index, event.target.value)}
            />
            <button
              type="button"
              className="brief-structure-remove"
              aria-label={`Удалить раздел «${section.title}»`}
              onClick={() => onRemove(index)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ol>

      {extras.length ? (
        <div className="workspace-chip-row" role="group" aria-label="Добавить раздел">
          {extras.map((section) => (
            <button
              key={section.type}
              type="button"
              className="workspace-chip"
              onClick={() => onAdd(section.type, section.title)}
            >
              <Plus className="h-3 w-3" /> {section.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VisualStyleStep({
  styleIds,
  colorIds,
  previewColors,
  onToggleStyle,
  onToggleColor,
}: {
  styleIds: ConceptStyleId[];
  colorIds: ConceptColorId[];
  previewColors: ConceptColorId[];
  onToggleStyle: (id: ConceptStyleId) => void;
  onToggleColor: (id: ConceptColorId) => void;
}) {
  return (
    <>
      <div className="workspace-field">
        <span className="workspace-field-label">
          Визуальное направление{" "}
          <em>
            {styleIds.length}/{MAX_STYLES}
          </em>
        </span>
        <span className="workspace-field-hint">
          Необязательно — без выбора AEVIX подберёт стиль под нишу. Превью показывает реальный результат.
        </span>
        <div className="style-card-grid" role="group" aria-label="Визуальный стиль">
          {conceptStyles.map((style) => (
            <StyleCard
              key={style.id}
              styleId={style.id}
              label={style.label}
              colorIds={previewColors}
              selected={styleIds.includes(style.id)}
              disabled={styleIds.length >= MAX_STYLES}
              onToggle={() => onToggleStyle(style.id)}
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
        <span className="workspace-field-hint">Тоже необязательно — без выбора возьмём палитру, подходящую нише.</span>
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
                onClick={() => onToggleColor(color.id)}
              >
                <i style={{ background: color.swatch }} />
                {selected ? <Check className="h-3 w-3" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function ConfirmationStep({
  name,
  city,
  businessType,
  goals,
  structure,
  styleIds,
  colorIds,
  nichePalette,
}: {
  name: string;
  city: string;
  businessType: string;
  goals: ConceptGoal[];
  structure: ProjectSection[];
  styleIds: ConceptStyleId[];
  colorIds: ConceptColorId[];
  /** Палитра ниши — показываем именно её, а не обещание «что-нибудь подберём». */
  nichePalette: string;
}) {
  return (
    <div className="workspace-field">
      <span className="workspace-field-label">Проверьте перед генерацией</span>
      <dl className="brief-summary">
        <div>
          <dt>Бизнес</dt>
          <dd>{name || "—"}</dd>
        </div>
        <div>
          <dt>Категория</dt>
          <dd>{businessType || "определим по описанию"}</dd>
        </div>
        <div>
          <dt>Город</dt>
          <dd>{city.trim() || "не указан"}</dd>
        </div>
        <div>
          <dt>Задачи</dt>
          <dd>{goals.join(", ")}</dd>
        </div>
        <div>
          <dt>Структура</dt>
          <dd>{structure.map((section) => section.title).join(" · ")}</dd>
        </div>
        <div>
          <dt>Оформление</dt>
          <dd>
            {styleIds.length
              ? conceptStyles.filter((style) => styleIds.includes(style.id)).map((style) => style.label).join(", ")
              : "стиль подберём по нише"}
            {colorIds.length ? "" : `, палитра ниши: ${nichePalette}`}
          </dd>
        </div>
      </dl>
      <p className="workspace-storage-notice">
        AEVIX соберёт анализ, сайт, процесс и стоимость — открывать пустой проект не придётся.
      </p>
    </div>
  );
}
