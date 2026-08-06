"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Единый примитив модального диалога.
 *
 * Появился из настоящего дефекта. Окно подтверждения выхода рисовалось прижатым к правому краю и
 * обрезанным сверху, хотя у затемнения стояло `position: fixed; inset: 0` — то есть оно и
 * задумывалось во весь экран. Причина не в отступах: у `.shell-header` есть `backdrop-filter`, а
 * он у ЛЮБОГО предка создаёт новый содержащий блок для `position: fixed`. «Весь экран»
 * превращается в коробку шапки.
 *
 * Значит лечится это не позиционированием, а тем, что диалог вообще не должен зависеть от того,
 * где в дереве он объявлен. Отсюда портал в `document.body` — и отсюда же примитив, а не правка
 * одного окна: следующее подтверждение, объявленное внутри чего-нибудь с `transform` или
 * `filter`, наступило бы на те же грабли.
 *
 * Берёт на себя то, что каждый диалог обязан уметь и что каждый раз забывают: затемнение на весь
 * экран, центрирование, ловушку фокуса, Escape, возврат фокуса туда, откуда пришли, блокировку
 * фоновой прокрутки и порядок слоёв.
 */

/** Что вообще может получить фокус внутри диалога. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Подпись основного действия. */
  confirmLabel: string;
  cancelLabel: string;
  /** Действие необратимо — тогда основная кнопка выглядит опасной, а не обычной. */
  destructive?: boolean;
  /** Пока идёт работа, обе кнопки заблокированы, а диалог не закрывается по Escape и фону. */
  busy?: boolean;
  busyLabel?: string;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  busyLabel,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useScrollLock(open);

  const close = useCallback(() => {
    if (busy) return;
    onCancel();
  }, [busy, onCancel]);

  // Куда вернуть фокус после закрытия. Запоминается до того, как фокус уедет внутрь диалога.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      // Кнопки, открывшей диалог, может уже не быть в документе — тогда просто ничего.
      const target = returnFocusRef.current;
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    };
  }, [open]);

  // Фокус входит в диалог: на отмену, а не на подтверждение. Промах по Enter обязан быть
  // безобидным — особенно когда действие необратимо.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("[data-dialog-initial]");
    (first ?? panelRef.current)?.focus({ preventScroll: true });
  }, [open]);

  // Ловушка фокуса и Escape. Без ловушки Tab уводит на страницу под диалогом, где человек
  // нажимает невидимые кнопки, а экранный диктор читает то, чего сейчас не существует.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  // Портал требует документа, поэтому на сервере диалога нет вовсе.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(event) => {
        // Именно mousedown и именно по самому затемнению: отпускание кнопки после выделения
        // текста внутри окна не должно закрывать диалог.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className={cn("dialog-panel", destructive && "is-destructive")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        {icon ? (
          <span className="dialog-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="dialog-text">
            {description}
          </div>
        ) : null}
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={close} disabled={busy} data-dialog-initial>
            {cancelLabel}
          </button>
          <button type="button" className="dialog-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
