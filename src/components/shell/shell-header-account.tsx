"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, LogIn, LogOut, Settings, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type AuthUser } from "@/lib/auth-context";

/**
 * Личность в правом верхнем углу.
 *
 * До этого после входа менялось только одно: ссылка «Войти» исчезала. Ни имени, ни аватара, ни
 * способа выйти из шапки — продукт не сообщал, что человек внутри своего рабочего пространства.
 *
 * Не вошедший видит две кнопки, а не одну: «Создать аккаунт» и «Войти». Одна кнопка «Войти»
 * оставляла человека без аккаунта гадать, куда ему идти.
 */

/** Инициалы из имени, а без имени — из почты. Показывать пустой кружок хуже, чем одну букву. */
export function initialsOf(user: AuthUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join("").toUpperCase() || "?";
}

export function displayNameOf(user: AuthUser): string {
  return user.name?.trim() || user.email;
}

export function ShellHeaderAccount() {
  const router = useRouter();
  const { user, isLoaded, available, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Меню закрывается кликом мимо и по Escape — обычные ожидания от выпадающего меню.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isLoaded) return null;
  // Вход не настроен на сервере — предлагать его значит вести человека в тупик.
  if (!user && !available) return null;

  if (!user) {
    return (
      <div className="shell-header-auth">
        <Link href="/app/login?mode=signup" className="shell-header-signup">
          <UserPlus className="h-4 w-4" />
          <span>Регистрация</span>
        </Link>
        <Link href="/app/login" className="shell-header-login" aria-label="Войти в аккаунт">
          <LogIn className="h-4 w-4" />
          <span>Войти</span>
        </Link>
      </div>
    );
  }

  const confirm = async () => {
    setLeaving(true);
    await signOut();
    setConfirming(false);
    setLeaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="shell-account-wrap" ref={wrapRef}>
      <button
        type="button"
        className={cn("shell-avatar", open && "is-open")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Аккаунт: ${displayNameOf(user)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="shell-avatar-mark" aria-hidden="true">
          {initialsOf(user)}
        </span>
        {/* Имя рядом с аватаром на широком экране: аватар один сообщает «вы вошли», но не
            «вы — это вы». На узком остаётся только кружок, там места нет. */}
        <span className="shell-avatar-name">{displayNameOf(user)}</span>
      </button>

      {open ? (
        <div className="shell-menu" role="menu">
          <div className="shell-menu-head">
            <span className="shell-menu-name">{displayNameOf(user)}</span>
            <span className="shell-menu-email">{user.email}</span>
          </div>
          <Link href="/app/profile" className="shell-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <User className="h-4 w-4" /> Профиль
          </Link>
          <Link href="/app/projects" className="shell-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <FolderKanban className="h-4 w-4" /> Мои проекты
          </Link>
          <Link href="/app/settings" className="shell-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" /> Настройки
          </Link>
          <button
            type="button"
            className="shell-menu-item is-exit"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      ) : null}

      {confirming ? (
        <div
          className="shell-confirm-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shell-confirm-title"
          onClick={() => setConfirming(false)}
        >
          <div className="shell-confirm" onClick={(event) => event.stopPropagation()}>
            <h2 id="shell-confirm-title" className="shell-confirm-title">
              Выйти из аккаунта?
            </h2>
            <p className="shell-confirm-text">
              Проекты останутся в аккаунте — вы увидите их снова после входа.
            </p>
            <div className="shell-confirm-actions">
              <button type="button" className="shell-confirm-cancel" onClick={() => setConfirming(false)} autoFocus>
                Остаться
              </button>
              <button type="button" className="shell-confirm-ok" onClick={confirm} disabled={leaving}>
                {leaving ? "Выходим…" : "Подтвердить выход"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
