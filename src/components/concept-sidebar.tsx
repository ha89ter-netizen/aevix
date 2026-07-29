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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WebsiteConcept } from "@/lib/website-concept";

/**
 * The concept generator's workspace sidebar — replaces the old toolbar's crammed row of page
 * tabs, palette/template/rename buttons, and price badge. Always visible on desktop (a plain
 * flex child, no JS media-query state needed); on mobile it's an off-canvas drawer purely via
 * CSS (`.concept-sidebar:not(.is-open)` gets `visibility:hidden` below the md breakpoint, which
 * also removes it from the tab order for free — no separate `inert`/tabIndex juggling needed).
 */

export type ConceptSidebarProps = {
  concept: WebsiteConcept;
  activePageId: string;
  onPageChange: (id: string) => void;
  onCyclePalette: () => void;
  onCycleTemplate: () => void;
  templateLabel: string;
  priceLabel: string;
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
  onCyclePalette,
  onCycleTemplate,
  templateLabel,
  priceLabel,
  onRename,
  onEditParams,
  fullscreen,
  onToggleFullscreen,
  onContact,
  mobileOpen,
  onMobileClose,
}: ConceptSidebarProps) {
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
            {concept.navigation.map((item) => (
              <button
                key={item.pageId}
                type="button"
                className="concept-sidebar-item"
                aria-current={item.pageId === activePageId ? "page" : undefined}
                onClick={() => onPageChange(item.pageId)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="concept-sidebar-group">
          <p className="concept-sidebar-label">Инструменты</p>
          <nav className="concept-sidebar-nav">
            <button type="button" className="concept-sidebar-item" onClick={onCyclePalette}>
              <Palette className="h-4 w-4" /> Цвета
            </button>
            <button type="button" className="concept-sidebar-item" onClick={onCycleTemplate}>
              <Sparkles className="h-4 w-4" /> {templateLabel}
            </button>
          </nav>
        </div>

        <div className="concept-sidebar-group">
          <p className="concept-sidebar-label">Проект</p>
          <nav className="concept-sidebar-nav">
            <button type="button" className="concept-sidebar-item" onClick={onRename}>
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
            <strong>{priceLabel}</strong>
          </div>
        </div>

        <div className="concept-sidebar-footer">
          <Button type="button" onClick={onContact} className="w-full justify-center">
            <MessageCircle className="mr-2 h-4 w-4" /> Разработать этот концепт
          </Button>
        </div>
      </aside>
    </>
  );
}
