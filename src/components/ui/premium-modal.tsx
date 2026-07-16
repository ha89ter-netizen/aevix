"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type PremiumModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  panelClassName?: string;
  expanded?: boolean;
  /** Hides the built-in close control so a host can render its own minimal affordance (preview mode). */
  hideClose?: boolean;
  /** Disables closing when clicking the backdrop (preview mode fills the viewport). */
  disableBackdropClose?: boolean;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function PremiumModal({
  open,
  onClose,
  titleId,
  children,
  panelClassName,
  expanded = false,
  hideClose = false,
  disableBackdropClose = false,
}: PremiumModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previousStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => (closeRef.current ?? panelRef.current)?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.position = previousStyles.position;
      document.body.style.top = previousStyles.top;
      document.body.style.width = previousStyles.width;
      document.body.style.overflow = previousStyles.overflow;
      window.scrollTo(0, scrollY);
      previousFocus?.focus();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/34 p-0 backdrop-blur-md md:items-center md:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (disableBackdropClose) return;
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[94svh] w-full flex-col overflow-hidden border border-ink/10 bg-[#f7f8f9] shadow-[0_36px_120px_rgba(18,22,27,0.24)] md:rounded-lg",
              expanded ? "h-[100svh] max-h-[100svh] md:h-[96svh] md:max-h-[96svh] md:max-w-[98vw]" : "h-[100svh] max-h-[100svh] md:h-auto md:max-w-5xl",
              panelClassName,
            )}
          >
            {hideClose ? null : (
              <button
                ref={closeRef}
                type="button"
                aria-label="Закрыть окно"
                title="Закрыть"
                onClick={onClose}
                className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white/88 text-ink/64 shadow-[0_10px_28px_rgba(18,22,27,0.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40 md:right-4 md:top-4"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
