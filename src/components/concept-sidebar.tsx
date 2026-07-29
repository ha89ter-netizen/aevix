"use client";

import {
  ArrowLeft,
  Maximize2,
  MessageCircle,
  Minimize2,
  Palette,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WebsiteConcept } from "@/lib/website-concept";

/**
 * The concept generator's workspace sidebar — replaces the old toolbar's crammed row of page
 * tabs, palette/template/rename buttons, and price badge. Always visible on desktop (a plain
 * flex child, no JS media-query state needed); on mobile it's an off-canvas drawer purely via
 * CSS (`.concept-sidebar:not(.is-open)` gets `visibility:hidden` below the md breakpoint, which
 * also removes it from the tab order for free — no separate `inert`/tabIndex juggling needed).
 *
 * While a concept is still being built, it doubles as a live reflection of that build: only the
 * pages already revealed in the preview show up here (`visiblePageIds`), the price line reads
 * "Считаем…" until it's actually been computed, and the project-tools group is disabled — there's
 * nothing real to tweak yet.
 */

export type ConceptSidebarProps = {
  concept: WebsiteConcept;
  activePageId: string;
  onPageChange: (id: string) => void;
  onCycleColor: () => void;
  onCycleStyle: () => void;
  styleLabel: string;
  priceLabel: string;
  /** Undefined/null = every page is available (fully built). While building, the exact set of
   * page ids already revealed in the live preview. */
  visiblePageIds?: string[] | null;
  priceReady: boolean;
  isBuilding: boolean;
  onRename: () => void;
  onEditParams: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onContact: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function ConceptSidebar({
  concept,
  activePageId,
  onPageChange,
  onCycleColor,
  onCycleStyle,
  styleLabel,
  priceLabel,
  visiblePageIds,
  priceReady,
  isBuilding,
  onRename,
  onEditParams,
  fullscreen,
  onToggleFullscreen,
  onContact,
  mobileOpen,
  onMobileClose,
}: ConceptSidebarProps) {
  const pages = visiblePageIds
    ? concept.navigation.filter((item) => visiblePageIds.includes(item.pageId))
    : concept.navigation;

  return (
    <>
      <div
        className={cn("concept-sidebar-backdrop", mobileOpen && "is-open")}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside className={cn("concept-sidebar", mobileOpen && "is-open")} aria-label="Панель проекта">
        <div className="concept-sidebar-group">
          <p className="concept-sidebar-label">Страницы</p>
          <nav className="concept-sidebar-nav" aria-label="Страницы концепта">
            <AnimatePresence initial={false}>
              {pages.map((item) => (
                <motion.button
                  key={item.pageId}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="concept-sidebar-item"
                  aria-current={item.pageId === activePageId ? "page" : undefined}
                  onClick={() => onPageChange(item.pageId)}
                >
                  {item.label}
                </motion.button>
              ))}
            </AnimatePresence>
            {isBuilding && pages.length < concept.navigation.length ? (
              <span className="concept-sidebar-item concept-sidebar-item-pending" aria-hidden="true">
                <span className="concept-sidebar-pulse" />
              </span>
            ) : null}
          </nav>
        </div>

        <div className="concept-sidebar-group">
          <p className="concept-sidebar-label">Инструменты</p>
          <nav className="concept-sidebar-nav">
            <button type="button" className="concept-sidebar-item" onClick={onCycleColor} disabled={isBuilding}>
              <Palette className="h-4 w-4" /> Цвета
            </button>
            <button type="button" className="concept-sidebar-item" onClick={onCycleStyle} disabled={isBuilding}>
              <Sparkles className="h-4 w-4" /> {styleLabel}
            </button>
          </nav>
        </div>

        <div className="concept-sidebar-group">
          <p className="concept-sidebar-label">Проект</p>
          <nav className="concept-sidebar-nav">
            <button type="button" className="concept-sidebar-item" onClick={onRename} disabled={isBuilding}>
              <PencilLine className="h-4 w-4" /> Название
            </button>
            <button type="button" className="concept-sidebar-item" onClick={onToggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? "Свернуть окно" : "Развернуть окно"}
            </button>
            <button type="button" className="concept-sidebar-item" onClick={onEditParams}>
              <ArrowLeft className="h-4 w-4" /> Изменить параметры
            </button>
          </nav>
          <div className="concept-sidebar-price">
            <span>Примерная стоимость</span>
            <strong className={cn(!priceReady && "is-pending")}>{priceReady ? priceLabel : "Считаем…"}</strong>
          </div>
        </div>

        <div className="concept-sidebar-footer">
          <Button type="button" onClick={onContact} className="w-full justify-center" disabled={isBuilding}>
            <MessageCircle className="mr-2 h-4 w-4" /> Разработать этот концепт
          </Button>
        </div>
      </aside>
    </>
  );
}
