import {
  ArrowLeft,
  Bot,
  FolderKanban,
  FolderPlus,
  Globe2,
  LayoutDashboard,
  Palette,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

/**
 * One navigation model for the whole product.
 *
 * AEVIX used to carry three unrelated navigations: a floating pill header with its own modal
 * "navigation centre" on the landing page, a separate sidebar in the Workspace, and a third row
 * of tabs inside an open project. Each was self-consistent and none of them agreed with the
 * others, which is what made the product read as a landing page bolted onto a dashboard.
 *
 * Now there is a single sidebar whose CONTENTS depend on where the visitor is, and the mode is
 * derived from the URL alone — never from component state — so the sidebar can never disagree
 * with the route, and the three sets can never appear at once.
 */

/**
 * Публичный слой состоит из двух разных опытов, а не из одной страницы с якорями.
 *
 * `entry` — входной экран: тёмный, локализованный, без навигации по разделам. Его задача —
 * первое впечатление, и рамка продукта ему только мешала бы.
 * `landing` — основной сайт AEVIX: разделы, своя навигация, светлая тема.
 *
 * Режим по-прежнему выводится ТОЛЬКО из маршрута, поэтому оболочка не может разойтись с тем,
 * где человек находится.
 */
export type ShellMode = "entry" | "landing" | "workspace" | "project";

/**
 * Маршруты публичного слоя — в одном месте, чтобы код, ссылки и тесты не расходились.
 *
 * `/platform`, а не `/site`: словом «сайт» в этом продукте называется то, что AEVIX генерирует
 * клиенту, и второй смысл того же слова в URL путал бы. Имя оставляет место для роста — разделы
 * позже могут стать `/platform/pricing`, не ломая ссылок.
 */
export const publicRoutes = {
  entry: "/" as Route,
  site: "/platform" as Route,
  privacy: "/privacy" as Route,
  terms: "/terms" as Route,
} as const;

/**
 * Заголовок шапки для публичных страниц вне лендинга.
 *
 * Пока правовые документы жили модальным окном, «Главная» в шапке было правдой: человек не
 * покидал лендинг. Как только у них появились свои адреса, эта же строка стала врать — читаешь
 * политику, а шапка сообщает, что ты на главной. Незнакомый адрес (то есть 404) не называется
 * никак: страницы нет, и придумывать ей имя незачем.
 */
const PUBLIC_PAGE_TITLES: Record<string, string> = {
  [publicRoutes.privacy]: "Конфиденциальность",
  [publicRoutes.terms]: "Условия",
};

export type ShellNavItem = {
  /** In-page anchor on the landing, a real route everywhere else. */
  href: string;
  label: string;
  icon?: LucideIcon;
};

/**
 * Канонический список разделов лендинга — ЕДИНСТВЕННЫЙ источник о его структуре.
 *
 * Порядок здесь обязан совпадать с порядком, в котором `LandingExperience` рендерит сцены: это
 * оглавление страницы, а оглавление, переставляющее главы, врёт о структуре. Прежний список был
 * отдельной копией и разошёлся с реальностью — «Как работает» стояло третьим пунктом, а на
 * странице лежало на 8713px, ниже «Кейсов» (6967) и «Цен» (4241). Посетитель, идущий по меню
 * сверху вниз, трижды подряд ехал против направления чтения.
 *
 * Здесь перечислены ВСЕ разделы, а не только попавшие в меню. Причина в подсветке: наблюдатель
 * следит именно за этим списком, и раздел, о котором список не знает, оставлял активным
 * предыдущий пункт. На замере это давало «Главную» в меню, пока человек читал демонстрацию
 * AI-консультанта и раздел о задачах, — около 2400 пикселей прокрутки с врущим индикатором.
 *
 * `menu: false` означает «раздел существует, в меню его не выносим» — тогда подсветка отдаётся
 * пункту из `representedBy`. Пустого пункта ради счёта заводить не нужно.
 */
export type LandingSection = {
  /** Настоящий id секции в разметке лендинга. */
  id: string;
  /** Подпись в меню; у разделов вне меню её нет. */
  label?: string;
  /** Какой пункт меню подсвечивать, пока читают этот раздел (для разделов вне меню). */
  representedBy?: string;
};

export const landingSections: LandingSection[] = [
  { id: "главная", label: "Главная" },
  { id: "что-такое-aevix", label: "Возможности" },
  { id: "ai-анализ", label: "AI-разбор" },
  { id: "проблемы", label: "До и после" },
  { id: "стоимость", label: "Цены" },
  { id: "результаты", label: "Кейсы" },
  // Раздел об основателе — часть рассказа о продукте, отдельным пунктом меню он не нужен;
  // подсветка на нём остаётся у «Кейсов», предыдущего раздела того же рассказа.
  { id: "кто-мы", representedBy: "результаты" },
  { id: "процесс", label: "Как работает" },
  { id: "faq", label: "FAQ" },
  { id: "контакты", label: "Контакты" },
];

/** Пункты меню — производная от реестра, а не вторая копия правды. */
export const landingNavItems: ShellNavItem[] = landingSections
  .filter((section): section is LandingSection & { label: string } => Boolean(section.label))
  .map((section) => ({ href: `#${section.id}`, label: section.label }));

/** Какому пункту меню принадлежит раздел — для честной подсветки положения. */
export function navHrefForSection(sectionId: string): string | null {
  const section = landingSections.find((item) => item.id === sectionId);
  if (!section) return null;
  if (section.label) return `#${section.id}`;
  return section.representedBy ? `#${section.representedBy}` : null;
}

export const workspaceNavItems: ShellNavItem[] = [
  { href: "/app/projects", label: "Проекты", icon: FolderKanban },
  { href: "/app/new", label: "Создать проект", icon: FolderPlus },
];

export type ProjectSectionId = "overview" | "ai-consultant" | "design" | "workflow" | "pricing";

const PROJECT_SECTIONS: Array<{ id: ProjectSectionId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "ai-consultant", label: "AI-консультант", icon: Bot },
  { id: "design", label: "Дизайн", icon: Palette },
  { id: "workflow", label: "Процесс", icon: Workflow },
  { id: "pricing", label: "Цены", icon: Wallet },
];

/** The one place a project sub-route is built, so the `as Route` cast (dynamic segments are not
 * literals typedRoutes can check) lives in exactly one spot. */
export function projectHref(projectId: string, section: ProjectSectionId = "overview"): Route {
  const path = section === "overview" ? `/app/projects/${projectId}` : `/app/projects/${projectId}/${section}`;
  return path as Route;
}

export function projectNavItems(projectId: string): ShellNavItem[] {
  return PROJECT_SECTIONS.map((section) => ({
    href: projectHref(projectId, section.id),
    label: section.label,
    icon: section.icon,
  }));
}

/** Extracts the project id from any `/app/projects/<id>...` path. */
export function projectIdFromPath(pathname: string): string | null {
  const match = /^\/app\/projects\/([^/]+)/.exec(pathname);
  const id = match?.[1];
  // `/app/projects` itself is the list, not a project.
  return id && id !== "" ? decodeURIComponent(id) : null;
}

export function shellModeFor(pathname: string): ShellMode {
  if (projectIdFromPath(pathname)) return "project";
  if (pathname.startsWith("/app")) return "workspace";
  if (pathname === publicRoutes.entry) return "entry";
  return "landing";
}

/** The title shown in the centre of the header — always the name of where you actually are. */
export function shellTitle(pathname: string, projectName?: string | null): string {
  const mode = shellModeFor(pathname);
  if (mode === "project") {
    const section = PROJECT_SECTIONS.find((item) => projectHref(projectIdFromPath(pathname)!, item.id) === pathname);
    // The project's own name is the headline; the section qualifies it (see ShellHeader).
    return projectName || section?.label || "Проект";
  }
  if (mode === "workspace") {
    if (pathname.startsWith("/app/new")) return "Создать проект";
    if (pathname.startsWith("/app/login")) return "Вход";
    return "Workspace";
  }
  if (pathname === publicRoutes.site) return "Главная";
  return PUBLIC_PAGE_TITLES[pathname] ?? "AEVIX";
}

/** Section label for the project header's subtitle, or null outside a project. */
export function projectSectionLabel(pathname: string): string | null {
  const projectId = projectIdFromPath(pathname);
  if (!projectId) return null;
  const section = PROJECT_SECTIONS.find((item) => projectHref(projectId, item.id) === pathname);
  return section?.label ?? "Обзор";
}

/** Where the sidebar's cross-context link goes, and what it says. */
export const shellCrossLinks = {
  toWorkspace: { href: "/app/projects" as Route, label: "Workspace", icon: LayoutDashboard },
  // Именно основной сайт, а не входной экран: из Workspace человек идёт читать про продукт.
  toSite: { href: publicRoutes.site, label: "На сайт AEVIX", icon: Globe2 },
  toProjects: { href: "/app/projects" as Route, label: "Все проекты", icon: ArrowLeft },
} as const;
