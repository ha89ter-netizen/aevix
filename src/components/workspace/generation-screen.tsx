"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generationStages, type GenerationStageId } from "@/lib/project-generation";

/**
 * Shown while a project is being generated. Each line is a phase `runProjectGeneration` can
 * actually observe — the two network waits and the synchronous assembly — and lights up when
 * that phase really begins. Nothing waits on a timer to look like it is thinking, and there is
 * no percentage: the wait depends on someone else's service, so a number would be invented.
 *
 * Подсказка под активной фазой объясняет, чего именно ждём. На замере ожидание длится 16–50
 * секунд, и всё это время раньше висела одна неподвижная строка без объяснения.
 */
export function GenerationScreen({ stage, projectName }: { stage: GenerationStageId; projectName: string }) {
  const currentIndex = generationStages.findIndex((item) => item.id === stage);

  return (
    <div className="generation-screen" role="status" aria-live="polite">
      <div className="generation-head">
        <span className="generation-mark">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <p className="generation-eyebrow">AEVIX собирает проект</p>
        <h2 className="generation-title">{projectName}</h2>
        <p className="generation-lead">
          Анализ, сайт, процесс и стоимость готовятся сразу — как только всё будет собрано, проект откроется полностью.
        </p>
      </div>

      <ol className="generation-stages">
        {generationStages.map((item, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={item.id} className={cn("generation-stage", done && "is-done", active && "is-active")}>
              <span className="generation-stage-icon">
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              </span>
              <span className="generation-stage-body">
                {item.label}
                {active ? <span className="generation-stage-hint">{item.hint}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
