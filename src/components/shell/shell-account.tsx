"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Состояние аккаунта в сайдбаре Workspace.
 *
 * Не в шапке: у правой зоны шапки одно основное действие, и это «Бесплатная консультация».
 * Аккаунт — не призыв к действию, а сведения о том, где лежит работа, и им место рядом с
 * навигацией.
 *
 * Пока состояние входа неизвестно, не показывается ничего: мигнуть кнопкой «Войти» уже
 * вошедшему хуже, чем показать её на долю секунды позже.
 */
export function ShellAccount({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { user, isLoaded, available, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

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

  const confirm = async () => {
    setLeaving(true);
    await signOut();
    setConfirming(false);
    setLeaving(false);
    onNavigate();
    // Обновляем маршрут, чтобы серверные данные страницы не остались от прошлой сессии.
    router.refresh();
  };

  return (
    <>
      <div className="shell-account">
        <span className="shell-account-text">
          <span className="shell-account-title">{user.email}</span>
          <span className="shell-account-hint">Проекты сохраняются в аккаунт</span>
        </span>
        {/* Выход спрашивает подтверждение. Кнопка стоит вплотную к навигации и попадала под
            случайное нажатие, а цена промаха несимметрична: выйти — секунда, вернуться — новый
            код из письма. */}
        <button
          type="button"
          className="shell-account-exit"
          aria-label="Выйти из аккаунта"
          title="Выйти"
          onClick={() => setConfirming(true)}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {confirming ? (
        <div
          className="shell-confirm-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shell-confirm-title"
          // Клик мимо окна — отмена: самый ожидаемый способ передумать.
          onClick={() => setConfirming(false)}
        >
          <div className="shell-confirm" onClick={(event) => event.stopPropagation()}>
            <h2 id="shell-confirm-title" className="shell-confirm-title">
              Выйти из аккаунта?
            </h2>
            <p className="shell-confirm-text">
              Проекты останутся в аккаунте — вы увидите их снова после входа. Для входа понадобится новый код из письма.
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
    </>
  );
}
