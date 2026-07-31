"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generationStages, type GenerationStageId } from "@/lib/project-generation";

/**
 * Shown while a project is being generated. Each line corresponds to a real step in
 * `runProjectGeneration` and lights up when that step actually begins — a step that completes in
 * 200ms is ticked off in 200ms. Nothing here waits on a timer to look like it is thinking.
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
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
