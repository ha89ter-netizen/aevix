"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Состояние аккаунта в сайдбаре Workspace.
 *
 * Не в шапке: у правой зоны шапки ровно одно целевое действие («Бесплатная консультация»), и
 * это правило соблюдается с тех пор, как четыре равнозначных элемента сделали её нечитаемой.
 * Аккаунт — не призыв к действию, а сведения о том, где лежит работа, и им место рядом с
 * навигацией.
 *
 * Пока состояние входа неизвестно, не показывается ничего: мигнуть кнопкой «Войти» уже
 * вошедшему хуже, чем показать её на долю секунды позже.
 */
export function ShellAccount({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { user, isLoaded, available, signOut } = useAuth();

  if (!isLoaded) return null;
  // Вход не настроен на сервере — предлагать его значит вести человека в тупик.
  if (!user && !available) return null;

  if (!user) {
    return (
      <Link href="/app/login" className="shell-account" onClick={onNavigate}>
        <LogIn className="h-4 w-4" />
        <span className="shell-account-text">
          <span className="shell-account-title">Войти</span>
          <span className="shell-account-hint">Проекты только на этом устройстве</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="shell-account">
      <span className="shell-account-text">
        <span className="shell-account-title">{user.email}</span>
        <span className="shell-account-hint">Проекты сохраняются в аккаунт</span>
      </span>
      <button
        type="button"
        className="shell-account-exit"
        aria-label="Выйти из аккаунта"
        title="Выйти"
        onClick={async () => {
          await signOut();
          onNavigate();
          // Обновляем маршрут, чтобы серверные данные страницы не остались от прошлой сессии.
          router.refresh();
        }}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
