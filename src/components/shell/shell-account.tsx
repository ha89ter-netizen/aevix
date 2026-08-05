"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { displayNameOf } from "./shell-header-account";

/**
 * Состояние аккаунта в сайдбаре Workspace.
 *
 * Здесь только сведения о том, где лежит работа. Меню аккаунта и выход живут на аватаре в
 * шапке — держать вторую кнопку выхода в сайдбаре значило бы иметь два места для одного
 * действия и два места, где его можно нажать по ошибке.
 *
 * Пока состояние входа неизвестно, не показывается ничего: мигнуть кнопкой «Войти» уже
 * вошедшему хуже, чем показать её на долю секунды позже.
 */
export function ShellAccount({ onNavigate }: { onNavigate: () => void }) {
  const { user, isLoaded, available } = useAuth();

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
    <Link href="/app/profile" className="shell-account" onClick={onNavigate}>
      <span className="shell-account-text">
        <span className="shell-account-title">{displayNameOf(user)}</span>
        <span className="shell-account-hint">Ваши проекты в аккаунте</span>
      </span>
    </Link>
  );
}
