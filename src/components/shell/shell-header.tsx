"use client";

import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { useProjects } from "@/lib/projects";
import { projectIdFromPath, projectSectionLabel, shellTitle } from "./shell-nav";
import { ShellHeaderAccount } from "./shell-header-account";
import { SaveStatus } from "@/components/workspace/save-status";

/**
 * Three zones, one job each — the previous header offered four competing controls of equal
 * weight (Workspace, consultation, navigation centre, persona chip) so nothing read as the
 * primary action.
 *
 *   left   — menu toggle + the logo, which is the universal way home
 *   centre — where you are right now
 *   right  — exactly one call to action
 */
export function ShellHeader({ onOpenSidebar, onGoHome }: { onOpenSidebar: () => void; onGoHome: () => void }) {
  const pathname = usePathname();
  const { openConsultation } = useBusiness();
  const { getProject } = useProjects();
  const projectId = projectIdFromPath(pathname);
  const project = projectId ? getProject(projectId) : null;
  const title = shellTitle(pathname, project?.name);
  const section = projectSectionLabel(pathname);

  return (
    <header className="shell-header">
      <div className="shell-header-left">
        <button type="button" className="shell-menu-button" onClick={onOpenSidebar} aria-label="Открыть навигацию">
          <Menu className="h-[18px] w-[18px]" />
        </button>
        {/* Always returns to the Hero, from anywhere in the product — never to Projects, never
            to whichever section happens to be nearest. */}
        <button type="button" className="shell-brand" onClick={onGoHome} aria-label="AEVIX, вернуться на главную">
          <span className="shell-brand-mark">AX</span>
          <span className="shell-brand-name">AEVIX</span>
        </button>
      </div>

      <div className="shell-header-center">
        <h1 className="shell-title">{title}</h1>
        {section && project ? <span className="shell-title-section">{section}</span> : null}
      </div>

      {/* Правая зона несёт основное целевое действие — консультацию — и сразу за ним вход.
          Второй элемент добавлен по решению владельца продукта: аккаунт должен быть виден из
          любой точки сайта, а не только из боковой панели Workspace. Чтобы это не вернуло
          прежнюю беду с четырьмя равнозначными кнопками, вход оформлен подчёркнуто тише
          консультации и исчезает у вошедшего — ему регистрироваться уже незачем. */}
      <div className="shell-header-right">
        {/* Единый индикатор сохранения — виден при любой правке проекта/дизайна/AI Designer (QA-3). */}
        <SaveStatus />
        <button type="button" className="shell-cta" onClick={openConsultation}>
          <Sparkles className="h-4 w-4" />
          <span>Бесплатная консультация</span>
        </button>
        <ShellHeaderAccount />
      </div>
    </header>
  );
}
