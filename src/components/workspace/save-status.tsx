"use client";

import { usePathname } from "next/navigation";
import { useProjects } from "@/lib/projects";

/**
 * Единый индикатор состояния сохранения (этап 7, Wave 1, QA-3).
 *
 * Раньше провайдер выставлял `saveState="error"`, но это НИГДЕ не показывалось — неудачная запись
 * на сервер проходила молча, и человек продолжал работать в уверенности, что всё сохранено.
 *
 * Один примитив на все сохранения (проект, правка дизайна, AI Designer) — все они идут через один
 * `saveState` провайдера, поэтому индикатор один, не три разных. Спокойный, но очевидный: не модаль,
 * не 10px серым. Появляется только при реальной правке (в покое `idle` → ничего не рендерит).
 */
export function SaveStatus() {
  const { saveState, retrySave, isLoaded } = useProjects();
  const pathname = usePathname();
  // Индикатор относится к работе в Workspace: правки живут там. На лендинге (общая шапка) его нет —
  // иначе он засорял бы «одно целевое действие» в правой зоне (загрузка страницы сама трогает
  // saveState). Полное различение «правка vs загрузка» (dirty) — задача Wave 2.
  if (!pathname?.startsWith("/app")) return null;
  if (!isLoaded || saveState === "idle") return null;

  return (
    <div className="save-status" data-state={saveState} role="status" aria-live="polite">
      {saveState === "saving" ? <span className="save-status-label">Сохранение…</span> : null}
      {saveState === "saved" ? <span className="save-status-label">Сохранено</span> : null}
      {saveState === "error" ? (
        <>
          <span className="save-status-label save-status-error">Не удалось сохранить</span>
          <button type="button" className="save-status-retry" onClick={retrySave}>
            Повторить
          </button>
        </>
      ) : null}
    </div>
  );
}

export default SaveStatus;
