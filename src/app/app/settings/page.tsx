"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

/**
 * Настройки аккаунта.
 *
 * Пока здесь ровно одно, что действительно работает, — пароль. Это не бедность, а честность:
 * ряд разделов-заглушек на странице настроек читается как недоделанный продукт. Появится
 * настоящая настройка — появится и раздел.
 *
 * Смена пароля живёт здесь, а не в отдельном мастере, потому что именно сюда попадает человек,
 * вошедший по коду: у него пароля нет, и задать его надо в одном очевидном месте.
 */
export default function SettingsPage() {
  const { user, isLoaded } = useAuth();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/auth/session?profile=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setHasPassword(Boolean(data.profile?.hasPassword)))
      .catch(() => setHasPassword(null));
  }, [user]);

  if (!isLoaded) return <div className="workspace-page" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-empty">
          <span className="workspace-empty-icon"><SettingsIcon className="h-5 w-5" /></span>
          <p className="workspace-empty-title">Настройки доступны после входа</p>
          <p className="workspace-empty-desc">Войдите в аккаунт, чтобы управлять им.</p>
          <Link href="/app/login" className="workspace-topbar-action">Войти</Link>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Не удалось сохранить пароль.");
        return;
      }
      setPassword("");
      setConfirm("");
      setHasPassword(true);
      setSaved(true);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Настройки</p>
        <h2 className="brief-title">Аккаунт</h2>
        <p className="brief-lead">{user.email}</p>
      </header>

      <form className="workspace-create-form" onSubmit={submit}>
        <div className="workspace-field">
          <span className="workspace-field-label">
            <KeyRound className="h-3.5 w-3.5" /> {hasPassword ? "Сменить пароль" : "Задать пароль"}
          </span>
          <span className="workspace-field-hint">
            {hasPassword
              ? "Новый пароль заменит текущий. Действующие сессии останутся."
              : "У аккаунта пока нет пароля — вы входите по коду из письма. Задайте пароль, чтобы входить быстрее."}
          </span>
        </div>

        <label className="workspace-field">
          <span className="workspace-field-label">Новый пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Не короче 8 символов" autoComplete="new-password" maxLength={200} required />
        </label>

        <label className="workspace-field">
          <span className="workspace-field-label">Повторите пароль</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ещё раз" autoComplete="new-password" maxLength={200} required />
        </label>

        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {saved ? <p className="auth-success" role="status">Пароль сохранён.</p> : null}

        <button type="submit" className={cn("workspace-create-submit")} disabled={busy}>
          {busy ? <><span className="auth-spinner" aria-hidden="true" /> Сохраняем…</> : "Сохранить пароль"}
        </button>
      </form>
    </div>
  );
}
