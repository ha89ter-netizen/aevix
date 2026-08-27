"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, type ProjectSection } from "@/lib/projects";
import { businessKnowledgeFor } from "@/lib/business-knowledge";
import { recommendStructure } from "@/lib/project-structure";
import { projectHref } from "@/components/shell/shell-nav";
import {
  BusinessStep,
  ConfirmationStep,
  GoalsStep,
  MAX_STYLES,
  StructureStep,
  VisualStyleStep,
} from "@/components/workspace/wizard-steps";
import {
  conceptColors,
  MAX_CONCEPT_COLORS,
  MIN_CONCEPT_SECTIONS,
  type ConceptColorId,
  type ConceptGoal,
  type ConceptSectionType,
  type ConceptStyleId,
} from "@/lib/website-concept";

// A light default so the STRUCTURAL differences between styles (radius, weight, tracking,
// shadow, density) are what the eye compares. A dark default made every card read as "dark".
const DEFAULT_PREVIEW_COLORS: ConceptColorId[] = ["blue"];

const STEPS = ["Бизнес", "Задача", "Структура", "Вид", "Готово"] as const;

/**
 * Бриф в пять шагов.
 *
 * Раньше это была одна страница с девятью группами полей и тридцатью с лишним элементами выбора
 * до первого действия AEVIX. Половина вопросов повторяла другую половину: пять из семи задач
 * прямо называли раздел («Показывать услуги» ↔ раздел «Услуги»), разделы при этом всё равно
 * перекрывались обязательным набором в маршруте генерации, а описание бизнеса и пожелания к
 * сайту склеивались в одну строку ещё до отправки модели.
 *
 * Теперь спрашивается только то, что нельзя вывести: чем занимается бизнес и чего владелец
 * хочет от сайта. Категория выводится из описания, структура предлагается по нише и задачам,
 * стиль и палитра предзаполнены по нише. Всё предложенное правится.
 *
 * Порядок не случаен: цвета и стиль стоят ПОСЛЕ структуры. Выбирать палитру, пока неизвестно,
 * что за сайт получится, — решение вслепую.
 *
 * Состояние живёт здесь, а разметка шагов — в wizard-steps: у шагов нет своего состояния, иначе
 * возврат назад терял бы введённое.
 */
export default function CreateProjectPage() {
  const router = useRouter();
  const { create, generateAll } = useProjects();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  /** Пусто — категория берётся из описания. Непусто — человек поправил догадку вручную. */
  const [typeOverride, setTypeOverride] = useState("");
  const [goals, setGoals] = useState<ConceptGoal[]>([]);
  const [structure, setStructure] = useState<ProjectSection[]>([]);
  const [styleIds, setStyleIds] = useState<ConceptStyleId[]>([]);
  const [colorIds, setColorIds] = useState<ConceptColorId[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Категория, выведенная из описания и названия тем же сопоставлением ниш, что и генерация.
   * Отдельным вопросом её больше не задают: человек уже написал, чем занимается.
   */
  const knowledge = useMemo(
    () => businessKnowledgeFor(typeOverride || description || name, name),
    [typeOverride, description, name],
  );
  const businessType = typeOverride || (knowledge.id === "generic" ? "" : knowledge.label);

  const previewColors = colorIds.length ? colorIds : DEFAULT_PREVIEW_COLORS;
  /** Что покажет сводка, если человек не выбрал цвета: имена реальной палитры ниши. */
  const nichePalette = knowledge.colors
    .map((id) => conceptColors.find((color) => color.id === id)?.label ?? id)
    .join(" + ");

  /**
   * Структура пересобирается, когда меняется то, из чего она выведена, — и только тогда.
   * Иначе возврат на шаг назад стирал бы правки человека без спроса.
   */
  const signature = `${businessType}|${goals.join(",")}`;
  const builtFor = useRef<string | null>(null);
  const enterStructure = () => {
    if (builtFor.current !== signature) {
      setStructure(recommendStructure(businessType, name, goals));
      builtFor.current = signature;
    }
    setStep(2);
  };

  const toggleGoal = (goal: ConceptGoal) =>
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));

  const toggleStyle = (id: ConceptStyleId) =>
    setStyleIds((current) => {
      if (current.includes(id)) return current.filter((styleId) => styleId !== id);
      if (current.length >= MAX_STYLES) return current;
      return [...current, id];
    });

  const toggleColor = (id: ConceptColorId) =>
    setColorIds((current) => {
      if (current.includes(id)) return current.filter((colorId) => colorId !== id);
      if (current.length >= MAX_CONCEPT_COLORS) return current;
      return [...current, id];
    });

  const removeSection = (index: number) => setStructure((current) => current.filter((_, i) => i !== index));
  const renameSection = (index: number, title: string) =>
    setStructure((current) => current.map((section, i) => (i === index ? { ...section, title } : section)));
  const moveSection = (index: number, delta: number) =>
    setStructure((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const addSection = (type: ConceptSectionType, title: string) =>
    setStructure((current) => [...current, { type, title }]);

  const canLeaveBusiness = name.trim().length > 0;
  const canLeaveGoals = goals.length > 0;
  // Тот же предел, что проверяет сервер (`MIN_CONCEPT_SECTIONS`) — иначе кнопка разрешала бы
  // отправить состояние, которое маршрут заведомо отвергнет, а человек получил бы локальный
  // концепт вместо AI-концепта и ни одного слова об этом.
  const canSubmit =
    canLeaveBusiness && canLeaveGoals && structure.length >= MIN_CONCEPT_SECTIONS && !submitting;

  const start = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const project = create({
      name,
      businessType,
      businessDescription: description.trim(),
      city: city.trim(),
      preferredStyleIds: styleIds,
      preferredColorIds: colorIds,
      goals,
      sections: structure,
    });
    // Generation runs on the provider, so navigating to the project immediately does not
    // interrupt it — the project page picks the run up and shows its progress.
    void generateAll(project);
    router.push(projectHref(project.id));
  };

  return (
    <div className="workspace-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Бриф для AEVIX</p>
        <h2 className="brief-title">{step === 4 ? "Всё готово" : "Расскажите о бизнесе"}</h2>
        <ol className="brief-steps" aria-label={`Шаг ${step + 1} из ${STEPS.length}`}>
          {STEPS.map((label, index) => (
            <li key={label} className={cn("brief-step", index === step && "is-active", index < step && "is-done")}>
              <span className="brief-step-dot">{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </header>

      <div className="workspace-create-form">
        {step === 0 ? (
          <BusinessStep
            name={name}
            city={city}
            description={description}
            businessType={businessType}
            onName={setName}
            onCity={setCity}
            onDescription={setDescription}
            onType={(type) => setTypeOverride((current) => (current === type ? "" : type))}
          />
        ) : null}

        {step === 1 ? <GoalsStep goals={goals} onToggle={toggleGoal} /> : null}

        {step === 2 ? (
          <StructureStep
            name={name}
            city={city}
            businessType={businessType}
            goals={goals}
            structure={structure}
            onRename={renameSection}
            onRemove={removeSection}
            onMove={moveSection}
            onAdd={addSection}
          />
        ) : null}

        {step === 3 ? (
          <VisualStyleStep
            styleIds={styleIds}
            colorIds={colorIds}
            previewColors={previewColors}
            onToggleStyle={toggleStyle}
            onToggleColor={toggleColor}
          />
        ) : null}

        {step === 4 ? (
          <ConfirmationStep
            name={name}
            city={city}
            businessType={businessType}
            goals={goals}
            structure={structure}
            styleIds={styleIds}
            colorIds={colorIds}
            nichePalette={nichePalette}
          />
        ) : null}

        <div className="brief-nav">
          {step > 0 ? (
            <button type="button" className="brief-back" onClick={() => setStep((current) => current - 1)}>
              <ArrowLeft className="h-4 w-4" /> Назад
            </button>
          ) : (
            <span />
          )}

          {step === 0 ? (
            <button type="button" className="workspace-create-submit" disabled={!canLeaveBusiness} onClick={() => setStep(1)}>
              Дальше <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 1 ? (
            <button type="button" className="workspace-create-submit" disabled={!canLeaveGoals} onClick={enterStructure}>
              Показать структуру <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 2 ? (
            <button
              type="button"
              className="workspace-create-submit"
              disabled={structure.length < MIN_CONCEPT_SECTIONS}
              onClick={() => setStep(3)}
            >
              Дальше <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" className="workspace-create-submit" onClick={() => setStep(4)}>
              Дальше <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 4 ? (
            <button type="button" className="workspace-create-submit" disabled={!canSubmit} onClick={start}>
              <Sparkles className="h-4 w-4" />
              {submitting ? "Запускаем AI…" : "Создать проект"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
