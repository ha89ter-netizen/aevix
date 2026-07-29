"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Expand,
  Eye,
  Info,
  Laptop,
  Menu,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumModal } from "@/components/ui/premium-modal";
import { ConceptSidebar } from "@/components/concept-sidebar";
import { cn } from "@/lib/utils";
import { conceptImagesFor, type ConceptImagery } from "@/lib/concept-images";
import { conceptServicesFor, type ConceptServiceCatalog } from "@/lib/concept-services";
import {
  buildFallbackWebsiteConcept,
  conceptBusinessTypes,
  conceptColors,
  conceptGoals,
  conceptSectionOptions,
  conceptStyles,
  estimateConceptPrice,
  formatConceptPrice,
  generateVisualIdentity,
  type ConceptGoal,
  type ConceptSectionType,
  type WebsiteConcept,
  type WebsiteConceptInput,
  type WebsiteConceptSection,
} from "@/lib/website-concept";

type PreviewMode = "desktop" | "tablet" | "mobile";
type ViewMode = "edit" | "preview";

/** Idle delay before the floating "back to editor" pill fades out in preview mode. */
const PREVIEW_CHROME_IDLE_MS = 2600;

/**
 * The generation experience is two honest phases, never a fake progress bar:
 *
 *  1. "Thinking" — the real network request is in flight and its duration is unknown. These
 *     three labels cycle for as long as that actually takes (a minimum dwell keeps the first one
 *     from flashing by if the response is instant, e.g. the offline fallback). Nothing about this
 *     phase claims work isn't happening — it IS happening, we just can't subdivide one HTTP call
 *     into three real steps, so the labels describe the request honestly rather than pretending
 *     to track it precisely.
 *  2. "Reveal" — the concept has actually arrived in full. From here every stage corresponds to
 *     real content becoming visible: a specific page's hero, a specific section, a specific
 *     later page, the (really computed) price estimate. This is a choreographed reveal of data
 *     that already exists, not simulated computation — the same honest pattern as a staged
 *     fade-in, just paced to read as construction rather than a single jarring cut.
 */
const THINKING_STAGES = ["Изучаем бизнес", "Исследуем структуру ниши", "Планируем архитектуру сайта"] as const;
const THINKING_STAGE_MS = 900;
const REVEAL_STAGE_MS = 420;

const sectionRevealLabels: Record<ConceptSectionType, string> = {
  services: "Собираем услуги",
  pricing: "Формируем цены",
  about: "Пишем о бренде",
  gallery: "Добавляем галерею",
  reviews: "Готовим отзывы",
  booking: "Настраиваем запись",
  contacts: "Добавляем контакты",
  faq: "Готовим частые вопросы",
};

type PipelineReveal = { heroVisible?: true; sectionCount?: number; pageId?: string; price?: true };
type PipelineStage = { label: string; reveal?: PipelineReveal };

/** Built from the ACTUAL generated concept, so every stage matches what that specific business
 * got — a coffee shop's pipeline mentions its real "Меню" page by its real name, a dental
 * clinic's doesn't show a stage for a gallery it doesn't have. */
function buildRevealPipeline(concept: WebsiteConcept): PipelineStage[] {
  const [home, ...rest] = concept.pages;
  const stages: PipelineStage[] = [{ label: "Создаём Hero", reveal: { heroVisible: true, pageId: home.id } }];
  home.sections.forEach((section, index) => {
    stages.push({ label: sectionRevealLabels[section.type] ?? "Собираем раздел", reveal: { sectionCount: index + 1 } });
  });
  rest.forEach((page) => {
    stages.push({ label: `Готовим страницу «${page.name}»`, reveal: { pageId: page.id } });
  });
  stages.push({ label: "Считаем стоимость проекта", reveal: { price: true } });
  stages.push({ label: "Финальная проверка качества" });
  return stages;
}

const wizardSteps = ["Бизнес", "Стиль", "Цвет", "Задача", "Структура"] as const;

const initialInput: WebsiteConceptInput = {
  businessType: "Барбершоп",
  businessName: "FORMA",
  styleId: "minimal",
  colorId: "purple",
  customColors: "",
  goals: ["Записывать клиентов", "Вызывать доверие"],
  sections: ["services", "pricing", "about", "gallery", "booking", "contacts"],
  wishes: "",
};

const demoConcepts: Array<{ label: string; name: string; input: WebsiteConceptInput }> = [
  ["Барбершоп", "FORMA", "Барбершоп", "minimal", "purple"],
  ["Салон красоты", "LUMI", "Салон красоты", "elegant", "pink"],
  ["Кофейня", "ROAST", "Кофейня", "elegant", "beige"],
  ["Ресторан", "NORTH", "Ресторан", "minimal", "navy"],
  ["Парфюмерный магазин", "SILLAGE", "Парфюмерный магазин", "luxury", "gold"],
  ["Строительная компания", "MONOLITH", "Другое", "brutalist", "gray"],
  ["Стоматология", "DENTA", "Другое", "minimal", "teal"],
  ["Фитнес-клуб", "PULSE", "Другое", "tech", "orange"],
].map(([label, name, businessType, styleId, colorId]) => ({
  label,
  name,
  input: {
    ...initialInput,
    businessName: name,
    businessType,
    styleId,
    colorId,
  } as WebsiteConceptInput,
}));

function toggleKnown<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

function ConceptSection({
  section,
  onDemoAction,
  imagery,
  services,
}: {
  section: WebsiteConceptSection;
  onDemoAction: () => void;
  imagery: ConceptImagery;
  services: ConceptServiceCatalog;
}) {
  if (section.type === "pricing") {
    return (
      <section className="concept-section concept-list-section">
        <div className="concept-section-heading">
          <p>Услуги и цены</p>
          <h3>{section.title}</h3>
        </div>
        <div className="concept-pricelist">
          {services.items.map((service) => (
            <div key={service.name} className="concept-pricelist-row">
              <strong>{service.name}</strong>
              <span className="concept-pricelist-dots" aria-hidden="true" />
              <span className="concept-pricelist-price">{service.price}</span>
            </div>
          ))}
        </div>
        <p className="concept-pricelist-note">{services.note}</p>
      </section>
    );
  }

  if (section.type === "gallery") {
    const labels = section.items.length ? section.items : ["Пространство", "Детали", "Результат"];
    return (
      <section className="concept-section concept-gallery">
        <div className="concept-section-heading">
          <p>Визуальная история</p>
          <h3>{section.title}</h3>
        </div>
        <div className="concept-gallery-grid">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`concept-gallery-frame concept-gallery-frame-${index + 1}`}
              style={{ background: imagery.gradient }}
            >
              {/* Decorative external mock imagery with a gradient fallback — plain img by design. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="concept-photo" src={imagery.gallery[index]} alt="" loading="lazy" />
              <span>{labels[index] ?? labels[0]}</span>
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

  const cards =
    section.type === "services"
      ? services.items.slice(0, 6).map((service) => ({ title: service.name, sub: service.price }))
      : section.items.slice(0, 4).map((item) => ({ title: item, sub: "Понятный формат без лишних шагов" }));

  return (
    <section className="concept-section concept-list-section">
      <div className="concept-section-heading">
        <p>{section.type === "reviews" ? "Доверие" : section.type === "faq" ? "Вопросы" : "Предложение"}</p>
        <h3>{section.title}</h3>
        {section.text ? <span>{section.text}</span> : null}
      </div>
      <div className="concept-list-grid">
        {cards.map((card, index) => (
          <article key={card.title}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{card.title}</strong>
            <span>{card.sub}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Shown in place of ConceptPreview before the real concept has arrived — the device frame
 * itself, with no invented business content inside it, just an honest status readout. This is
 * what makes the transition into real content read as continuous rather than a jarring swap
 * from an abstract loading screen into the actual workspace. */
function ConceptBuildingFrame({ mode, label }: { mode: PreviewMode; label: string }) {
  return (
    <div className="concept-preview-stage">
      <div className={cn("concept-device", `concept-device-${mode}`)}>
        <div className="concept-building-frame">
          <div className="concept-generation-mark">
            <WandSparkles className="h-6 w-6" />
          </div>
          <p role="status" aria-live="polite">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ConceptPreview({
  concept,
  mode,
  heroVisible,
  sectionCount,
  visiblePageIds,
  activePageId,
  onPageChange,
  onDemoAction,
  isPreview = false,
}: {
  concept: WebsiteConcept;
  mode: PreviewMode;
  /** True once the active page's hero is part of the reveal — always true once settled. */
  heroVisible: boolean;
  /** How many of the HOME page's sections are visible so far. Pages other than home always
   * show fully once they've appeared at all (see visiblePageIds) — only home reveals piece by
   * piece, since it's the only page in view during most of the build. */
  sectionCount: number;
  /** Which pages exist yet, for the in-preview nav bar — null once fully built. */
  visiblePageIds: string[] | null;
  activePageId: string;
  onPageChange: (pageId: string) => void;
  onDemoAction: () => void;
  isPreview?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imagery = conceptImagesFor(concept.businessType, concept.businessName);
  const services = conceptServicesFor(concept.businessType);
  const identity = useMemo(() => generateVisualIdentity(concept.colorId, concept.styleId), [concept.colorId, concept.styleId]);
  const style = {
    "--concept-bg": identity.palette.background,
    "--concept-surface": identity.palette.surface,
    "--concept-border": identity.palette.border,
    "--concept-muted": identity.palette.muted,
    "--concept-text": identity.palette.text,
    "--concept-text-muted": identity.palette.textMuted,
    "--concept-accent": identity.palette.accent,
    "--concept-accent-hover": identity.palette.accentHover,
    "--concept-accent-active": identity.palette.accentActive,
    "--concept-secondary": identity.palette.secondary,
    "--concept-radius": identity.tokens.radius,
    "--concept-radius-sm": identity.tokens.radiusSmall,
    "--concept-border-width": identity.tokens.borderWidth,
    "--concept-letter-spacing": identity.tokens.letterSpacing,
    "--concept-heading-weight": identity.tokens.headingWeight,
    "--concept-body-weight": identity.tokens.bodyWeight,
    "--concept-heading-scale": identity.tokens.headingScale,
    "--concept-spacing": identity.tokens.spacing,
    "--concept-shadow-sm": identity.tokens.shadowSm,
    "--concept-shadow-lg": identity.tokens.shadowLg,
  } as CSSProperties;
  const activePage = concept.pages.find((page) => page.id === activePageId) ?? concept.pages[0];
  const pageIndex = concept.pages.findIndex((page) => page.id === activePage.id);
  const nextPage = concept.pages[Math.min(pageIndex + 1, concept.pages.length - 1)];
  const isHomePage = activePage.id === concept.pages[0]?.id;
  const visibleNav = visiblePageIds
    ? concept.navigation.filter((item) => visiblePageIds.includes(item.pageId))
    : concept.navigation;

  useEffect(() => {
    stageRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activePageId]);

  // Entering preview: move focus to the scroll container so Space / PageUp / PageDown /
  // arrows / Home / End drive it natively, with no synthetic key handling.
  useEffect(() => {
    if (isPreview) stageRef.current?.focus({ preventScroll: true });
  }, [isPreview]);

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="region"
      aria-label={`Превью сайта: ${concept.businessName}`}
      className={cn("concept-preview-stage", isPreview && "is-preview")}
    >
      <motion.div
        layout
        className={cn("concept-device", `concept-device-${mode}`)}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="concept-site" style={style}>
          <div className="concept-atmosphere" aria-hidden="true">
            <span className="concept-orb concept-orb-1" />
            <span className="concept-orb concept-orb-2" />
          </div>
          <header className={cn("concept-nav concept-preview-piece", heroVisible && "is-visible")}>
            <strong>{concept.businessName}</strong>
            <nav aria-label="Навигация демонстрационного сайта">
              <AnimatePresence initial={false}>
                {visibleNav.map((item) => (
                  <motion.button
                    key={item.pageId}
                    type="button"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    aria-current={item.pageId === activePage.id ? "page" : undefined}
                    onClick={() => onPageChange(item.pageId)}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </AnimatePresence>
            </nav>
            <button type="button" onClick={onDemoAction}>Связаться</button>
          </header>
          <motion.main key={activePage.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
            <section className={cn("concept-hero concept-preview-piece", heroVisible && "is-visible")}>
              <div className="concept-hero-copy">
                <p>{activePage.hero.eyebrow}</p>
                <h2>{activePage.hero.title}</h2>
                <span>{activePage.hero.subtitle}</span>
                <div>
                  <button type="button" onClick={onDemoAction}>{activePage.hero.primaryCta}</button>
                  <button type="button" onClick={() => nextPage.id === activePage.id ? onDemoAction() : onPageChange(nextPage.id)}>{activePage.hero.secondaryCta}</button>
                </div>
              </div>
              <div className="concept-hero-visual" style={{ background: imagery.gradient }}>
                {/* Decorative external mock imagery with a gradient fallback — plain img by design. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="concept-photo concept-hero-photo" src={imagery.hero} alt="" loading="lazy" />
                <div className="concept-hero-visual-caption">
                  <span>{concept.businessType}</span>
                  <strong>{concept.businessName}</strong>
                </div>
              </div>
            </section>
            <div className={cn("concept-preview-piece", heroVisible && "is-visible")}>
              {activePage.sections.map((section, index) => {
                // Only the home page reveals section-by-section (it's the one on screen for
                // most of the build); any other page, once it exists at all, shows in full.
                const visible = !isHomePage || index < sectionCount;
                return (
                  <div key={`${section.type}-${index}`} className={cn("concept-section-piece", visible && "is-visible")}>
                    <ConceptSection section={section} onDemoAction={onDemoAction} imagery={imagery} services={services} />
                  </div>
                );
              })}
            </div>
          </motion.main>
          <footer className={cn("concept-footer concept-preview-piece", heroVisible && "is-visible")}>
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
  const [generationId, setGenerationId] = useState(0);
  const [thinkingLabel, setThinkingLabel] = useState<string>(THINKING_STAGES[0]);
  const [pipelineLabel, setPipelineLabel] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [sectionCount, setSectionCount] = useState(0);
  const [priceVisible, setPriceVisible] = useState(false);
  const [revealedPageIds, setRevealedPageIds] = useState<string[]>([]);
  const [isSettled, setIsSettled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [previewChromeVisible, setPreviewChromeVisible] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activePageId, setActivePageId] = useState("home");
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasConcept = concept !== null;
  const isBuilding = isGenerating || (hasConcept && !isSettled);
  const isPreview = viewMode === "preview";
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep local state in sync with the browser's own fullscreen state, so pressing Escape
  // (which the browser handles natively) never leaves the UI showing a stale "Свернуть".
  useEffect(() => {
    const sync = () => setNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen?.();
    } catch {
      // Fullscreen can be refused (iOS Safari, permissions). Fall back to the in-modal
      // expanded layout so the control still does something useful.
      setFullscreen((current) => !current);
    }
  };

  const enterPreview = () => {
    setViewMode("preview");
    setPreviewChromeVisible(true);
  };

  const exitPreview = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setViewMode("edit");
    setPreviewChromeVisible(true);
  };

  // Closing the workspace must never leave preview mode or a native fullscreen session
  // latched, otherwise the next open starts in a chrome-less state the user did not ask for.
  useEffect(() => {
    if (open) return;
    setViewMode("edit");
    setFullscreen(false);
    setPreviewChromeVisible(true);
    setSidebarOpen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [open]);

  // Auto-hide the floating pill after inactivity; any pointer/key activity brings it back.
  useEffect(() => {
    if (!isPreview) return;
    let timer = window.setTimeout(() => setPreviewChromeVisible(false), PREVIEW_CHROME_IDLE_MS);
    const wake = () => {
      setPreviewChromeVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPreviewChromeVisible(false), PREVIEW_CHROME_IDLE_MS);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake, { passive: true });
    // "wheel" fires once per physical scroll tick, so it's cheap. Deliberately not "scroll" —
    // that fires on every frame of the keyboard-driven smooth-scroll animation below and would
    // flood this with re-renders; pointer-events stays enabled while idle regardless (see
    // .concept-preview-exit.is-idle in globals.css), so skipping it costs nothing but a
    // slightly earlier fade while reading.
    window.addEventListener("wheel", wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("wheel", wake);
    };
  }, [isPreview]);

  // Phase 1 — "thinking": cycles while the real request is in flight. Its total duration is
  // however long that request actually takes; this only controls which of the three labels is
  // legible right now, and stops the instant a response (real or fallback) actually arrives.
  useEffect(() => {
    if (!isGenerating || concept) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setThinkingLabel(THINKING_STAGES[0]);
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % THINKING_STAGES.length;
      setThinkingLabel(THINKING_STAGES[index]);
    }, THINKING_STAGE_MS);
    return () => window.clearInterval(timer);
  }, [isGenerating, concept]);

  // Phase 2 — "reveal": the concept is fully in hand. Keyed on generationId (bumped only by
  // applyNewConcept), not on `concept` itself, so a palette/template tweak later — which also
  // calls setConcept — never re-triggers this build-out.
  useEffect(() => {
    if (!concept) return;
    setActivePageId(concept.pages[0]?.id ?? "home");
    const stages = buildRevealPipeline(concept);
    const applyStage = (stage: PipelineStage) => {
      setPipelineLabel(stage.label);
      if (!stage.reveal) return;
      if (stage.reveal.heroVisible) setHeroVisible(true);
      if (stage.reveal.sectionCount !== undefined) setSectionCount(stage.reveal.sectionCount);
      if (stage.reveal.price) setPriceVisible(true);
      if (stage.reveal.pageId) {
        setRevealedPageIds((current) => (current.includes(stage.reveal!.pageId!) ? current : [...current, stage.reveal!.pageId!]));
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stages.forEach(applyStage);
      setIsSettled(true);
      return;
    }

    setHeroVisible(false);
    setSectionCount(0);
    setPriceVisible(false);
    setRevealedPageIds([]);
    setIsSettled(false);

    let index = 0;
    applyStage(stages[0]);
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= stages.length) {
        window.clearInterval(timer);
        setIsSettled(true);
        return;
      }
      applyStage(stages[index]);
    }, REVEAL_STAGE_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId]);

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

  /** The single place a newly-arrived concept enters state — used by both a real generation and
   * picking a ready-made example, so both go through the identical build-out reveal instead of
   * examples just snapping into view inconsistently with a real generation. */
  const applyNewConcept = (nextConcept: WebsiteConcept, noticeText: string | null) => {
    setConcept(nextConcept);
    setNotice(noticeText);
    setGenerationId((id) => id + 1);
  };

  const generateConcept = async () => {
    if (isGenerating) return;
    setGenerating(true);
    setNotice(null);

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
      applyNewConcept(data.concept, data.notice ?? null);
    } catch {
      applyNewConcept(buildFallbackWebsiteConcept(input), "Сеть временно недоступна. Показан локальный концепт AEVIX.");
    } finally {
      setGenerating(false);
    }
  };

  const cycleColor = () => {
    if (!concept) return;
    const index = conceptColors.findIndex((color) => color.id === concept.colorId);
    const next = conceptColors[(index + 1) % conceptColors.length];
    setConcept({ ...concept, colorId: next.id });
  };

  const cycleStyle = () => {
    if (!concept) return;
    const index = conceptStyles.findIndex((style) => style.id === concept.styleId);
    const next = conceptStyles[(index + 1) % conceptStyles.length];
    setConcept({ ...concept, styleId: next.id });
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
          // Escape unwinds one layer at a time: sidebar -> fullscreen -> preview -> close.
          if (sidebarOpen) { setSidebarOpen(false); return; }
          if (document.fullscreenElement) { void document.exitFullscreen(); return; }
          if (fullscreen) { setFullscreen(false); return; }
          if (isPreview) { exitPreview(); return; }
          setOpen(false);
        }}
        titleId="website-concept-title"
        expanded={fullscreen || isPreview}
        hideClose={isPreview}
        disableBackdropClose={isPreview}
        panelClassName={
          isPreview
            ? "md:h-[100svh] md:max-h-[100svh] md:w-screen md:max-w-none md:rounded-none"
            : concept && !fullscreen
              ? "md:h-[92svh] md:max-w-[96vw]"
              : undefined
        }
      >
        {concept || isGenerating ? (
          <div ref={panelRef} className="flex min-h-0 flex-1 flex-col bg-[#f7f8f9]">
            <div className="concept-topbar" hidden={isPreview}>
              <div className="concept-topbar-identity min-w-0">
                {concept ? (
                  <button
                    type="button"
                    className="concept-hamburger"
                    aria-label="Открыть панель проекта"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-4.5 w-4.5" />
                  </button>
                ) : null}
                {concept ? (
                  editingName ? (
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
                  )
                ) : (
                  <h2 id="website-concept-title">{input.businessName || "Новый проект"}</h2>
                )}
              </div>
              {concept ? (
                <div className="concept-topbar-controls">
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
                  <button
                    type="button"
                    className="concept-topbar-refresh"
                    onClick={() => void generateConcept()}
                    disabled={isGenerating}
                    title="Обновить концепт"
                    aria-label="Обновить концепт"
                    aria-busy={isGenerating}
                  >
                    <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                  </button>
                  <Button type="button" size="sm" className="concept-topbar-preview" onClick={enterPreview} title="Просмотр" disabled={!isSettled}>
                    <Eye className="mr-2 h-4 w-4" /> <span>Просмотр</span>
                  </Button>
                </div>
              ) : null}
            </div>
            {notice && !isPreview ? <p className="concept-notice">{notice}</p> : null}
            <div className="concept-disclaimer" hidden={isPreview}>
              <Info className="h-4 w-4" />
              <p>Этот сайт является предварительным визуальным макетом, а не готовым продуктом. Здесь показаны дизайн, структура и общий пользовательский опыт. Формы, оплата, запись, интеграции и другие бизнес-функции подключаются на этапе полноценной разработки.</p>
            </div>
            {isBuilding ? (
              <div className="concept-pipeline-status" aria-live="polite" hidden={isPreview}>
                <span className="concept-pipeline-dot" />
                {concept ? pipelineLabel : thinkingLabel}
              </div>
            ) : null}
            <div className="concept-workspace-shell">
              {!isPreview ? (
                concept ? (
                  <ConceptSidebar
                    concept={concept}
                    activePageId={activePageId}
                    onPageChange={setActivePageId}
                    onCycleColor={cycleColor}
                    onCycleStyle={cycleStyle}
                    styleLabel={conceptStyles.find((style) => style.id === concept.styleId)?.label ?? ""}
                    priceLabel={`от ${formatConceptPrice(estimateConceptPrice(concept).min)}`}
                    visiblePageIds={isSettled ? null : revealedPageIds}
                    priceReady={isSettled || priceVisible}
                    isBuilding={!isSettled}
                    onRename={() => setEditingName(true)}
                    onEditParams={() => { setConcept(null); setFullscreen(false); setViewMode("edit"); }}
                    fullscreen={fullscreen}
                    onToggleFullscreen={() => setFullscreen((current) => !current)}
                    onContact={contactAevix}
                    mobileOpen={sidebarOpen}
                    onMobileClose={() => setSidebarOpen(false)}
                  />
                ) : (
                  <aside className="concept-sidebar concept-sidebar-skeleton" aria-hidden="true">
                    <p className="concept-sidebar-label">Страницы</p>
                    <span className="concept-sidebar-pulse" />
                  </aside>
                )
              ) : null}
              <div className="concept-workspace-main">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {concept ? (
                    <ConceptPreview
                      concept={concept}
                      mode={isPreview ? "desktop" : previewMode}
                      heroVisible={isSettled || heroVisible}
                      sectionCount={isSettled ? concept.pages[0]?.sections.length ?? 0 : sectionCount}
                      visiblePageIds={isSettled ? null : revealedPageIds}
                      activePageId={activePageId}
                      onPageChange={setActivePageId}
                      onDemoAction={showDemoAction}
                      isPreview={isPreview}
                    />
                  ) : (
                    <ConceptBuildingFrame mode={previewMode} label={thinkingLabel} />
                  )}
                  {isPreview ? (
                    <div className={cn("concept-preview-exit", !previewChromeVisible && "is-idle")}>
                      <button type="button" onClick={exitPreview}>
                        <ArrowLeft className="h-4 w-4" /> Вернуться к редактированию
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleNativeFullscreen()}
                        aria-label={nativeFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
                        title={nativeFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
                      >
                        {nativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : null}
                </div>
                {demoMessage ? <div className="concept-demo-toast" role="status">{demoMessage}</div> : null}
              </div>
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
                    // Carry the descriptive label (e.g. "Стоматология") as the concept's
                    // businessType so imagery, the service catalogue and the hero eyebrow match
                    // the real niche, even when the wizard type is the generic "Другое".
                    const base = buildFallbackWebsiteConcept(demo.input);
                    applyNewConcept(
                      {
                        ...base,
                        businessType: demo.label,
                        pages: base.pages.map((page, index) =>
                          index === 0 ? { ...page, hero: { ...page.hero, eyebrow: demo.label } } : page,
                        ),
                      },
                      null,
                    );
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
              {step === 0 ? (
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

              {step === 1 ? (
                <div className="concept-field">
                  <span>Визуальный стиль</span>
                  <div className="concept-choice-grid">
                    {conceptStyles.map((option) => (
                      <button key={option.id} type="button" aria-pressed={input.styleId === option.id} onClick={() => updateInput({ styleId: option.id })}>
                        <Sparkles className="h-4 w-4" />{option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="concept-step-grid">
                  <div className="concept-field concept-field-wide">
                    <span>Основной цвет</span>
                    <div className="concept-color-grid">
                      {conceptColors.map((colorOption) => (
                        <button key={colorOption.id} type="button" aria-pressed={input.colorId === colorOption.id} onClick={() => updateInput({ colorId: colorOption.id })}>
                          <i style={{ background: colorOption.swatch }} />
                          <span>{colorOption.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="concept-field concept-field-wide">
                    <span>Доп. пожелания по цвету и характеру</span>
                    <input value={input.customColors} onChange={(event) => updateInput({ customColors: event.target.value })} maxLength={180} placeholder="Например: больше воздуха, тёплые акценты" />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
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

              {step === 4 ? (
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
          </div>
        )}
      </PremiumModal>
    </>
  );
}
