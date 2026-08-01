"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Redo2, Sparkles, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { applyDesignerRequest, toLogEntry, type DesignerSuggestion, type ResolvedIntent } from "@/lib/ai-designer";
import { SECTION_IMPROVEMENTS, useDesignerSelection } from "./designer-selection";

const OPENED_KEY = "aevix.designer.opened";

/** Asks the server to place a request the local matcher could not. Returns null on any failure,
 * including no configured key — the caller then shows its normal "не понял" hint. */
async function resolveWithModel(request: string, project: Project): Promise<ResolvedIntent | null> {
  const offers = [
    ...(project.design?.offers?.products ?? []),
    ...(project.design?.offers?.services ?? []),
  ].map((offer) => offer.name);
  const sections = Array.from(
    new Set((project.design?.pages ?? []).flatMap((page) => page.sections.map((section) => section.type))),
  );
  try {
    const response = await fetch("/api/designer-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, offers, sections }),
    });
    const data = (await response.json()) as { intent?: { id: string; value?: string; target?: string; text?: string } | null };
    if (!data.intent) return null;
    return data.intent as ResolvedIntent;
  } catch {
    return null;
  }
}

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
  const [insight, setInsight] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useDesignerSelection();

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
    const open = () => setOpen(true);
    window.addEventListener("aevix:designer-open", open);
    return () => window.removeEventListener("aevix:designer-open", open);
  }, []);

  /**
   * A single observation when returning to a project that has been sitting untouched. Rare by
   * construction: it needs a day since the last edit, at least one edit already made, and it is
   * shown once per project — a designer who greets you every visit is wallpaper, not insight.
   */
  useEffect(() => {
    if (!project.generatedAt || !project.designerLog.length) return;
    const key = `aevix.insight.${project.id}`;
    const lastTouch = project.updatedAt;
    if (Date.now() - lastTouch < 24 * 60 * 60 * 1000) return;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
      setInsight(
        "Я пересмотрел проект: блок цен сейчас читается слабее остальных — типографика там осталась от первой генерации.",
      );
      setOpen(true);
    } catch {
      // Storage disabled — the insight simply never appears.
    }
  }, [project.id, project.generatedAt, project.updatedAt, project.designerLog.length]);

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

    let outcome = applyDesignerRequest(trimmed, project);

    // The local matcher only covers common phrasings. Rather than tell someone their wording was
    // wrong, hand the sentence to the model — it picks from the same closed list of operations,
    // so whatever comes back is applied by the identical bounded, undoable code path.
    if (!outcome.design && outcome.intent === "unknown" && project.design) {
      setSteps(["Разбираем запрос…"]);
      const resolved = await resolveWithModel(trimmed, project);
      if (resolved) outcome = applyDesignerRequest(trimmed, project, resolved);
      setSteps([]);
    }

    if (!outcome.design) {
      setWorking(false);
      setNote(
        outcome.intent === "unknown"
          ? "Не понял правку. Попробуйте: «сделай темнее», «добавь отзывы», «цена «Капучино» 1500»."
          : "Сначала нужно сгенерировать сайт проекта.",
      );
      return;
    }

    // Each step is a real change being applied; they are revealed in sequence so the work reads
    // as progress rather than a single silent jump.
    const target = selection?.selected?.type ?? null;
    selection?.setEditing(target);
    for (const step of outcome.steps) {
      setSteps((current) => [...current, step.label]);
      await new Promise((resolve) => setTimeout(resolve, 260));
    }
    selection?.setEditing(null);

    // Both sides are passed: the project still holds the old design at this point, so the diff
    // cannot be derived from state alone.
    pushHistory(project.id, project.design, outcome.design);
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
            {selection?.selected ? (
              <div className="designer-scope">
                <span>
                  Правка применится к разделу <b>{selection.selected.label}</b>
                </span>
                <div className="designer-scope-actions">
                  {SECTION_IMPROVEMENTS.map((item) => (
                    <button key={item.request} type="button" onClick={() => void run(item.request)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {insight ? (
              <div className="designer-suggestion is-insight">
                <p>{insight}</p>
                <div>
                  <button type="button" onClick={() => { setInsight(null); void run("Улучши типографику"); }}>
                    Посмотреть
                  </button>
                  <button type="button" className="is-ghost" onClick={() => setInsight(null)}>
                    Скрыть
                  </button>
                </div>
              </div>
            ) : null}

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
