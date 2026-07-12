"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Expand,
  Info,
  Laptop,
  Maximize2,
  MessageCircle,
  Minimize2,
  Monitor,
  Palette,
  PencilLine,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumModal } from "@/components/ui/premium-modal";
import { cn } from "@/lib/utils";
import {
  buildFallbackWebsiteConcept,
  conceptBusinessTypes,
  conceptGoals,
  conceptMoods,
  conceptPalettes,
  conceptSectionOptions,
  conceptTemplates,
  type ConceptGoal,
  type ConceptSectionType,
  type ConceptTemplate,
  type WebsiteConcept,
  type WebsiteConceptInput,
  type WebsiteConceptSection,
} from "@/lib/website-concept";

type PreviewMode = "desktop" | "tablet" | "mobile";

const generationStages = [
  "Изучаем бизнес...",
  "Планируем структуру...",
  "Выбираем визуальный стиль...",
  "Генерируем концепт...",
  "Готовим preview...",
] as const;

const previewRevealStages = ["Логотип", "Палитра", "Типографика", "Hero", "Разделы", "Desktop", "Tablet", "Mobile"] as const;

const wizardSteps = ["Бизнес", "Стиль", "Цвет", "Задача", "Структура"] as const;

const initialInput: WebsiteConceptInput = {
  businessType: "Барбершоп",
  businessName: "FORMA",
  visualMood: "Премиальный минимализм",
  palettePreset: "silver-violet",
  customColors: "",
  goals: ["Записывать клиентов", "Вызывать доверие"],
  sections: ["services", "pricing", "about", "gallery", "booking", "contacts"],
  wishes: "",
};

const demoConcepts: Array<{ label: string; name: string; input: WebsiteConceptInput }> = [
  ["Барбершоп", "FORMA", "Барбершоп", "Премиальный минимализм", "silver-violet"],
  ["Салон красоты", "LUMI", "Салон красоты", "Теплый и элегантный", "soft-rose"],
  ["Кофейня", "ROAST", "Кофейня", "Теплый и элегантный", "warm-ivory"],
  ["Ресторан", "NORTH", "Ресторан", "Премиальный минимализм", "silver-violet"],
  ["Парфюмерный магазин", "SILLAGE", "Парфюмерный магазин", "Теплый и элегантный", "soft-rose"],
  ["Строительная компания", "MONOLITH", "Другое", "Современный технологичный", "cool-blue"],
  ["Стоматология", "DENTA", "Другое", "Премиальный минимализм", "cool-blue"],
  ["Фитнес-клуб", "PULSE", "Другое", "Современный технологичный", "silver-violet"],
].map(([label, name, businessType, visualMood, palettePreset]) => ({
  label,
  name,
  input: {
    ...initialInput,
    businessName: name,
    businessType,
    visualMood,
    palettePreset,
  } as WebsiteConceptInput,
}));

const templateLabels: Record<ConceptTemplate, string> = {
  "premium-minimal": "Premium minimal",
  "warm-editorial": "Warm editorial",
  "modern-technological": "Modern technological",
};

function toggleKnown<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

function ConceptSection({ section, onDemoAction }: { section: WebsiteConceptSection; onDemoAction: () => void }) {
  if (section.type === "gallery") {
    return (
      <section className="concept-section concept-gallery">
        <div className="concept-section-heading">
          <p>Визуальная история</p>
          <h3>{section.title}</h3>
        </div>
        <div className="concept-gallery-grid">
          {(section.items.length ? section.items : ["Пространство", "Детали", "Результат"]).slice(0, 3).map((item, index) => (
            <div key={item} className={`concept-gallery-frame concept-gallery-frame-${index + 1}`}>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "booking" || section.type === "contacts") {
    return (
      <section className="concept-section concept-action-section">
        <p>{section.type === "booking" ? "Следующий шаг" : "Контакты"}</p>
        <h3>{section.title}</h3>
        <span>{section.text}</span>
        {section.type === "booking" ? (
          <div className="concept-mock-form" aria-label="Демонстрационная форма записи">
            <span>Услуга</span><span>Дата и время</span><span>Имя и контакт</span>
          </div>
        ) : (
          <div className="concept-contact-details">
            <span>Часы работы: по расписанию</span>
            <span>Адрес будет указан здесь</span>
            <div aria-label="Место для карты">Карта и маршрут</div>
          </div>
        )}
        <button type="button" onClick={onDemoAction}>{section.type === "booking" ? "Выбрать время" : "Связаться"}</button>
      </section>
    );
  }

  if (section.type === "about") {
    return (
      <section className="concept-section concept-about">
        <p>О бренде</p>
        <h3>{section.title}</h3>
        <div>
          <span>{section.text}</span>
          <ul>
            {section.items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="concept-section concept-list-section">
      <div className="concept-section-heading">
        <p>{section.type === "reviews" ? "Доверие" : section.type === "faq" ? "Вопросы" : "Предложение"}</p>
        <h3>{section.title}</h3>
        {section.text ? <span>{section.text}</span> : null}
      </div>
      <div className="concept-list-grid">
        {section.items.slice(0, 4).map((item, index) => (
          <article key={item}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{item}</strong>
            <span>{section.type === "pricing" ? "Состав уточняется после короткого разговора" : "Понятный формат без лишних шагов"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConceptPreview({
  concept,
  mode,
  revealIndex,
  activePageId,
  onPageChange,
  onDemoAction,
}: {
  concept: WebsiteConcept;
  mode: PreviewMode;
  revealIndex: number;
  activePageId: string;
  onPageChange: (pageId: string) => void;
  onDemoAction: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const style = {
    "--concept-bg": concept.palette.background,
    "--concept-surface": concept.palette.surface,
    "--concept-text": concept.palette.text,
    "--concept-accent": concept.palette.accent,
  } as CSSProperties;
  const activePage = concept.pages.find((page) => page.id === activePageId) ?? concept.pages[0];
  const pageIndex = concept.pages.findIndex((page) => page.id === activePage.id);
  const nextPage = concept.pages[Math.min(pageIndex + 1, concept.pages.length - 1)];

  useEffect(() => {
    stageRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activePageId]);

  return (
    <div ref={stageRef} className="concept-preview-stage">
      <motion.div
        layout
        className={cn("concept-device", `concept-device-${mode}`)}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={cn("concept-site", `concept-template-${concept.template}`)} style={style}>
          <header className={cn("concept-nav concept-preview-piece", revealIndex >= 0 && "is-visible")}>
            <strong>{concept.businessName}</strong>
            <nav aria-label="Навигация демонстрационного сайта">
              {concept.navigation.map((item) => (
                <button key={item.pageId} type="button" aria-current={item.pageId === activePage.id ? "page" : undefined} onClick={() => onPageChange(item.pageId)}>
                  {item.label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={onDemoAction}>Связаться</button>
          </header>
          <motion.main key={activePage.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <section className={cn("concept-hero concept-preview-piece", revealIndex >= 3 && "is-visible")}>
              <div className="concept-hero-copy">
                <p>{activePage.hero.eyebrow}</p>
                <h2>{activePage.hero.title}</h2>
                <span>{activePage.hero.subtitle}</span>
                <div>
                  <button type="button" onClick={onDemoAction}>{activePage.hero.primaryCta}</button>
                  <button type="button" onClick={() => nextPage.id === activePage.id ? onDemoAction() : onPageChange(nextPage.id)}>{activePage.hero.secondaryCta}</button>
                </div>
              </div>
              <div className="concept-hero-visual" aria-hidden="true">
                <div><span>{concept.businessType}</span><strong>{concept.businessName}</strong></div>
                <div><small>01</small><span>Внимание к деталям</span></div>
                <div><small>02</small><span>Понятный сервис</span></div>
              </div>
            </section>
            <div className={cn("concept-preview-piece", revealIndex >= 4 && "is-visible")}>
              {activePage.sections.map((section, index) => (
                <ConceptSection key={`${section.type}-${index}`} section={section} onDemoAction={onDemoAction} />
              ))}
            </div>
          </motion.main>
          <footer className={cn("concept-footer concept-preview-piece", revealIndex >= 4 && "is-visible")}>
            <strong>{concept.businessName}</strong>
            <span>Концепт сайта, подготовленный AEVIX</span>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}

export function WebsiteConceptExperience() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<WebsiteConceptInput>(initialInput);
  const [concept, setConcept] = useState<WebsiteConcept | null>(null);
  const [isGenerating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activePageId, setActivePageId] = useState("home");
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [previewRevealIndex, setPreviewRevealIndex] = useState(previewRevealStages.length - 1);
  const hasConcept = concept !== null;

  useEffect(() => {
    if (!hasConcept) return;
    setActivePageId(concept?.pages[0]?.id ?? "home");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPreviewRevealIndex(previewRevealStages.length - 1);
      return;
    }

    setPreviewRevealIndex(0);
    const timer = window.setInterval(() => {
      setPreviewRevealIndex((current) => {
        if (current >= previewRevealStages.length - 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 210);
    return () => window.clearInterval(timer);
  }, [concept?.pages, hasConcept]);

  useEffect(() => {
    if (!demoMessage) return;
    const timer = window.setTimeout(() => setDemoMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [demoMessage]);

  const canContinue = useMemo(() => {
    if (step === 0) return input.businessName.trim().length >= 2;
    if (step === 3) return input.goals.length > 0;
    if (step === 4) return input.sections.length >= 3;
    return true;
  }, [input, step]);

  const updateInput = (value: Partial<WebsiteConceptInput>) => {
    setInput((current) => ({ ...current, ...value }));
  };

  const generateConcept = async () => {
    if (isGenerating) return;
    setGenerating(true);
    setNotice(null);
    setStageIndex(0);
    const stageTimer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, generationStages.length - 1));
    }, 700);

    try {
      const response = await fetch("/api/website-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as {
        concept?: WebsiteConcept;
        source?: "ai" | "fallback";
        notice?: string;
        error?: string;
      };
      if (!response.ok || !data.concept) throw new Error(data.error || "Не удалось собрать концепт.");
      setConcept(data.concept);
      setNotice(data.notice ?? null);
    } catch {
      setConcept(buildFallbackWebsiteConcept(input));
      setNotice("Сеть временно недоступна. Показан локальный концепт AEVIX.");
    } finally {
      window.clearInterval(stageTimer);
      setGenerating(false);
    }
  };

  const cyclePalette = () => {
    if (!concept) return;
    const index = conceptPalettes.findIndex((palette) => palette.colors.accent.toUpperCase() === concept.palette.accent.toUpperCase());
    const next = conceptPalettes[(index + 1 + conceptPalettes.length) % conceptPalettes.length];
    setConcept({ ...concept, palette: { ...next.colors } });
  };

  const cycleTemplate = () => {
    if (!concept) return;
    const index = conceptTemplates.indexOf(concept.template);
    const template = conceptTemplates[(index + 1) % conceptTemplates.length];
    setConcept({ ...concept, template });
  };

  const saveBusinessName = (name: string) => {
    const cleaned = name.trim().slice(0, 80);
    if (!cleaned || !concept) return;
    updateInput({ businessName: cleaned });
    setConcept({ ...concept, businessName: cleaned });
    setEditingName(false);
  };

  const contactAevix = () => {
    setOpen(false);
    window.setTimeout(() => document.getElementById("контакты")?.scrollIntoView({ behavior: "smooth" }), 120);
  };

  const activePageIndex = concept ? Math.max(0, concept.pages.findIndex((page) => page.id === activePageId)) : 0;

  const movePreviewPage = (offset: number) => {
    if (!concept) return;
    const nextIndex = Math.min(Math.max(activePageIndex + offset, 0), concept.pages.length - 1);
    setActivePageId(concept.pages[nextIndex].id);
  };

  const showDemoAction = () => {
    setDemoMessage("Это демонстрация интерфейса. Функция будет подключена в готовом проекте.");
  };

  return (
    <>
      <div className="concept-trigger-group mt-7">
        <Button type="button" onClick={() => { setShowExamples(false); setConcept(null); setOpen(true); }} className="concept-trigger">
          <WandSparkles className="mr-2 h-4 w-4" />
          Получить концепт сайта
        </Button>
        <Button type="button" variant="glass" onClick={() => { setShowExamples(true); setConcept(null); setOpen(true); }}>
          Посмотреть пример <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <PremiumModal
        open={open}
        onClose={() => {
          if (fullscreen) setFullscreen(false);
          else setOpen(false);
        }}
        titleId="website-concept-title"
        expanded={fullscreen}
        panelClassName={concept && !fullscreen ? "md:h-[92svh] md:max-w-[96vw]" : undefined}
      >
        {concept ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="concept-workspace-toolbar">
              <div className="min-w-0 pr-12">
                <p>Концепт сайта</p>
                {editingName ? (
                  <input
                    autoFocus
                    defaultValue={concept.businessName}
                    aria-label="Название бизнеса"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveBusinessName(event.currentTarget.value);
                      if (event.key === "Escape") setEditingName(false);
                    }}
                    onBlur={(event) => saveBusinessName(event.currentTarget.value)}
                  />
                ) : (
                  <h2 id="website-concept-title">{concept.businessName}</h2>
                )}
              </div>
              <div className="concept-toolbar-actions">
                <span className="concept-draft-badge"><Info className="h-3.5 w-3.5" /> Предварительный макет</span>
                <div
                  className="concept-page-switch"
                  role="tablist"
                  aria-label="Страницы концепта"
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") { event.preventDefault(); movePreviewPage(1); }
                    if (event.key === "ArrowLeft") { event.preventDefault(); movePreviewPage(-1); }
                  }}
                >
                  {concept.navigation.map((item) => (
                    <button key={item.pageId} type="button" role="tab" aria-selected={item.pageId === activePageId} onClick={() => setActivePageId(item.pageId)}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="concept-mode-switch" aria-label="Размер preview">
                  {([
                    ["desktop", Monitor, "Desktop"],
                    ["tablet", Tablet, "Tablet"],
                    ["mobile", Smartphone, "Mobile"],
                  ] as const).map(([mode, Icon, label]) => (
                    <button key={mode} type="button" onClick={() => setPreviewMode(mode)} aria-pressed={previewMode === mode} title={label}>
                      <Icon className="h-4 w-4" /><span>{label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => void generateConcept()} disabled={isGenerating} title="Обновить концепт">
                  <RefreshCw className="h-4 w-4" /><span>Обновить</span>
                </button>
                <button type="button" onClick={cyclePalette} title="Сменить палитру">
                  <Palette className="h-4 w-4" /><span>Цвета</span>
                </button>
                <button type="button" onClick={cycleTemplate} title="Сменить стиль">
                  <Sparkles className="h-4 w-4" /><span>{templateLabels[concept.template]}</span>
                </button>
                <button type="button" onClick={() => setEditingName(true)} title="Изменить название">
                  <PencilLine className="h-4 w-4" /><span>Название</span>
                </button>
                <button type="button" onClick={() => setFullscreen((current) => !current)} title={fullscreen ? "Свернуть" : "На весь экран"}>
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span>{fullscreen ? "Свернуть" : "Fullscreen"}</span>
                </button>
              </div>
            </div>
            {notice ? <p className="concept-notice">{notice}</p> : null}
            <div className="concept-disclaimer">
              <Info className="h-4 w-4" />
              <p>Этот сайт является предварительным визуальным макетом, а не готовым продуктом. Здесь показаны дизайн, структура и общий пользовательский опыт. Формы, оплата, запись, интеграции и другие бизнес-функции подключаются на этапе полноценной разработки.</p>
            </div>
            <div className="concept-reveal-rail" aria-label="Сборка preview">
              {previewRevealStages.map((stage, index) => (
                <span key={stage} className={index <= previewRevealIndex ? "is-complete" : undefined}>
                  {index < previewRevealIndex ? <Check className="h-3.5 w-3.5" /> : index + 1} {stage}
                </span>
              ))}
            </div>
            <div className="concept-page-status">
              <button type="button" onClick={() => movePreviewPage(-1)} disabled={activePageIndex === 0} aria-label="Предыдущая страница"><ArrowLeft className="h-4 w-4" /></button>
              <span>{concept.pages[activePageIndex]?.name} · {activePageIndex + 1} из {concept.pages.length}</span>
              <button type="button" onClick={() => movePreviewPage(1)} disabled={activePageIndex === concept.pages.length - 1} aria-label="Следующая страница"><ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ConceptPreview
                concept={concept}
                mode={previewMode}
                revealIndex={previewRevealIndex}
                activePageId={activePageId}
                onPageChange={setActivePageId}
                onDemoAction={showDemoAction}
              />
            </div>
            {demoMessage ? <div className="concept-demo-toast" role="status">{demoMessage}</div> : null}
            <div className="concept-workspace-footer">
              <Button type="button" variant="glass" onClick={() => { setConcept(null); setFullscreen(false); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Изменить параметры
              </Button>
              <Button type="button" onClick={contactAevix}>
                <MessageCircle className="mr-2 h-4 w-4" /> Разработать этот концепт
              </Button>
            </div>
          </div>
        ) : showExamples ? (
          <div className="concept-examples-shell">
            <div className="concept-wizard-header">
              <p>AEVIX showcase</p>
              <h2 id="website-concept-title">Примеры концептов</h2>
              <span>Выберите бизнес и откройте готовый интерактивный preview.</span>
            </div>
            <div className="concept-examples-grid">
              {demoConcepts.map((demo, index) => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => {
                    setInput(demo.input);
                    setPreviewMode("desktop");
                    setConcept(buildFallbackWebsiteConcept(demo.input));
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{demo.name}</strong>
                  <small>{demo.label}</small>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
            <div className="concept-wizard-footer">
              <Button type="button" variant="glass" onClick={() => setOpen(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Закрыть
              </Button>
              <Button type="button" onClick={() => setShowExamples(false)}>
                <WandSparkles className="mr-2 h-4 w-4" /> Создать свой концепт
              </Button>
            </div>
          </div>
        ) : (
          <div className="concept-wizard-shell">
            <div className="concept-wizard-header">
              <p>AEVIX design lab</p>
              <h2 id="website-concept-title">Получить концепт сайта</h2>
              <span>Ответьте на несколько вопросов. AEVIX соберёт безопасный интерактивный preview.</span>
            </div>

            <div className="concept-progress" aria-label={`Шаг ${step + 1} из ${wizardSteps.length}`}>
              {wizardSteps.map((label, index) => (
                <button key={label} type="button" onClick={() => setStep(index)} aria-current={index === step ? "step" : undefined}>
                  <span>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{label}
                </button>
              ))}
            </div>

            <div className="concept-wizard-content">
              {isGenerating ? (
                <div className="concept-generating" role="status">
                  <div className="concept-generation-mark"><WandSparkles className="h-7 w-7" /></div>
                  <p>Создаём концепт</p>
                  <h3>{generationStages[stageIndex]}</h3>
                  <div><motion.span animate={{ width: `${((stageIndex + 1) / generationStages.length) * 100}%` }} /></div>
                </div>
              ) : null}

              {!isGenerating && step === 0 ? (
                <div className="concept-step-grid">
                  <label className="concept-field concept-field-wide">
                    <span>Название бизнеса</span>
                    <input value={input.businessName} onChange={(event) => updateInput({ businessName: event.target.value })} maxLength={80} placeholder="Например: FORMA" />
                  </label>
                  <div className="concept-field concept-field-wide">
                    <span>Тип бизнеса</span>
                    <div className="concept-choice-grid">
                      {conceptBusinessTypes.map((option) => (
                        <button key={option} type="button" aria-pressed={input.businessType === option} onClick={() => updateInput({ businessType: option })}>{option}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {!isGenerating && step === 1 ? (
                <div className="concept-field">
                  <span>Визуальное настроение</span>
                  <div className="concept-choice-grid concept-choice-grid-large">
                    {conceptMoods.map((option) => (
                      <button key={option} type="button" aria-pressed={input.visualMood === option} onClick={() => updateInput({ visualMood: option })}>
                        <Sparkles className="h-4 w-4" />{option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isGenerating && step === 2 ? (
                <div className="concept-step-grid">
                  <div className="concept-field concept-field-wide">
                    <span>Готовые палитры</span>
                    <div className="concept-palette-grid">
                      {conceptPalettes.map((paletteOption) => (
                        <button key={paletteOption.id} type="button" aria-pressed={input.palettePreset === paletteOption.id} onClick={() => updateInput({ palettePreset: paletteOption.id })}>
                          <span>{Object.values(paletteOption.colors).map((color) => <i key={color} style={{ background: color }} />)}</span>
                          <strong>{paletteOption.label}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="concept-field concept-field-wide">
                    <span>Свои пожелания по цветам</span>
                    <input value={input.customColors} onChange={(event) => updateInput({ customColors: event.target.value })} maxLength={180} placeholder="Например: светлый фон, серебро и холодный синий" />
                  </label>
                </div>
              ) : null}

              {!isGenerating && step === 3 ? (
                <div className="concept-field">
                  <span>Что должен делать сайт</span>
                  <div className="concept-choice-grid concept-choice-grid-large">
                    {conceptGoals.map((goal) => (
                      <button key={goal} type="button" aria-pressed={input.goals.includes(goal)} onClick={() => updateInput({ goals: toggleKnown<ConceptGoal>(input.goals, goal) })}>
                        {input.goals.includes(goal) ? <Check className="h-4 w-4" /> : <Expand className="h-4 w-4" />}{goal}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isGenerating && step === 4 ? (
                <div className="concept-step-grid">
                  <div className="concept-field concept-field-wide">
                    <span>Нужные разделы</span>
                    <div className="concept-choice-grid">
                      {conceptSectionOptions.map((section) => (
                        <button key={section.id} type="button" aria-pressed={input.sections.includes(section.id)} onClick={() => updateInput({ sections: toggleKnown<ConceptSectionType>(input.sections, section.id) })}>
                          {input.sections.includes(section.id) ? <Check className="h-4 w-4" /> : null}{section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="concept-field concept-field-wide">
                    <span>Дополнительные пожелания</span>
                    <textarea value={input.wishes} onChange={(event) => updateInput({ wishes: event.target.value })} maxLength={700} rows={4} placeholder="Что важно передать в характере сайта?" />
                  </label>
                </div>
              ) : null}
            </div>

            {!isGenerating ? (
              <div className="concept-wizard-footer">
                <Button type="button" variant="glass" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Назад
                </Button>
                <span>{step + 1} / {wizardSteps.length}</span>
                {step < wizardSteps.length - 1 ? (
                  <Button type="button" disabled={!canContinue} onClick={() => setStep((current) => Math.min(current + 1, wizardSteps.length - 1))}>
                    Далее <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" disabled={!canContinue} onClick={() => void generateConcept()}>
                    <Laptop className="mr-2 h-4 w-4" /> Создать preview
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </PremiumModal>
    </>
  );
}
