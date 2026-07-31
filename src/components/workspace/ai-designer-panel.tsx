"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Redo2, Sparkles, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { applyDesignerRequest, toLogEntry, type DesignerSuggestion } from "@/lib/ai-designer";

const OPENED_KEY = "aevix.designer.opened";

/**
 * The AI Designer.
 *
 * Deliberately not a chat window: no avatars, no bubbles, no greeting, no assistant persona
 * writing paragraphs back. The panel shows what changed in the project and offers the next
 * improvement — the evolving website is the subject, the exchange is just the receipt.
 *
 * It opens by itself exactly once, the first time a project finishes generating; after that the
 * open/closed state is whatever the person last chose.
 */
export function AiDesignerPanel({ project }: { project: Project }) {
  const { saveDesign, appendDesignerEntry, pushHistory, undo, redo, canUndo, canRedo } = useProjects();
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [suggestion, setSuggestion] = useState<DesignerSuggestion | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // First open is automatic and one-off; the flag is global rather than per project because it
  // marks "this person has met the designer", not "this project has".
  useEffect(() => {
    if (!project.generatedAt) return;
    try {
      if (window.localStorage.getItem(OPENED_KEY)) return;
      window.localStorage.setItem(OPENED_KEY, "1");
      setOpen(true);
    } catch {
      // Storage disabled — simply never auto-opens.
    }
  }, [project.generatedAt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      // Never hijack undo inside a field the person is actually typing in.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      if (event.shiftKey) redo(project.id);
      else undo(project.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project.id, undo, redo]);

  const run = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || working) return;
    setWorking(true);
    setNote(null);
    setSuggestion(null);
    setSteps([]);
    setRequest("");

    const outcome = applyDesignerRequest(trimmed, project);
    if (!outcome.design) {
      setWorking(false);
      setNote(
        outcome.intent === "unknown"
          ? "Не понял правку. Попробуйте: «сделай темнее», «добавь отзывы», «смени макет»."
          : "Сначала нужно сгенерировать сайт проекта.",
      );
      return;
    }

    // Each step is a real change being applied; they are revealed in sequence so the work reads
    // as progress rather than a single silent jump.
    for (const step of outcome.steps) {
      setSteps((current) => [...current, step.label]);
      await new Promise((resolve) => setTimeout(resolve, 260));
    }

    // Snapshot BEFORE committing, so this edit is the thing Undo reverses.
    pushHistory(project.id, project.design);
    saveDesign(project.id, outcome.design);
    appendDesignerEntry(project.id, toLogEntry(trimmed, outcome));
    setSuggestion(outcome.suggestion);
    setWorking(false);
  };

  const history = project.designerLog.slice(-4).reverse();

  return (
    <>
      <button
        type="button"
        className={cn("designer-fab", open && "is-open")}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4" />
        <span>AI Designer</span>
      </button>

      {open ? (
        <aside className="designer-panel" aria-label="AI Designer">
          <header className="designer-head">
            <span className="designer-title">
              <Sparkles className="h-3.5 w-3.5" /> AI Designer
            </span>
            <div className="designer-head-actions">
              <button
                type="button"
                onClick={() => undo(project.id)}
                disabled={!canUndo(project.id)}
                title="Отменить (⌘Z)"
                aria-label="Отменить"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => redo(project.id)}
                disabled={!canRedo(project.id)}
                title="Вернуть (⇧⌘Z)"
                aria-label="Вернуть"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть панель">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="designer-body">
            {steps.length ? (
              <ul className="designer-steps">
                {steps.map((step, index) => (
                  <li key={step} className={cn(index === steps.length - 1 && working && "is-active")}>
                    {index < steps.length - 1 || !working ? <Check className="h-3 w-3" /> : null}
                    {step}
                  </li>
                ))}
              </ul>
            ) : null}

            {note ? <p className="designer-note">{note}</p> : null}

            {suggestion ? (
              <div className="designer-suggestion">
                <p>{suggestion.text}</p>
                <div>
                  <button type="button" onClick={() => void run(suggestion.request)}>
                    Применить
                  </button>
                  <button type="button" className="is-ghost" onClick={() => setSuggestion(null)}>
                    Не сейчас
                  </button>
                </div>
              </div>
            ) : null}

            {history.length ? (
              <div className="designer-history">
                <p className="designer-history-label">Недавние изменения</p>
                {history.map((entry) => (
                  <div key={entry.id} className="designer-history-item">
                    <span className="designer-history-meta">
                      <b>{entry.section}</b>
                      <time>{new Date(entry.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time>
                    </span>
                    {entry.changes.map((change) => (
                      <span key={change}>
                        <Check className="h-3 w-3" /> {change}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : !steps.length && !note ? (
              <p className="designer-empty">
                Опишите правку — я применю её к проекту. Например: «сделай темнее» или «добавь отзывы».
              </p>
            ) : null}
          </div>

          <form
            className="designer-input"
            onSubmit={(event) => {
              event.preventDefault();
              void run(request);
            }}
          >
            <input
              ref={inputRef}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Что изменить в проекте?"
              disabled={working}
              aria-label="Запрос к AI-дизайнеру"
            />
            <button type="submit" disabled={working || !request.trim()} aria-label="Применить">
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </aside>
      ) : null}
    </>
  );
}
