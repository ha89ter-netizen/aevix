"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, LogIn, Mail, Terminal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

/**
 * Вход и регистрация — одна страница, две вкладки.
 *
 * Разделение настоящее, а не косметическое: регистрация собирает имя, которого у входа нет и
 * быть не может. Раньше в навигации была одна кнопка «Войти», и человек, у которого аккаунта
 * ещё нет, не понимал, куда ему.
 *
 * Третий путь — вход по коду из письма — оставлен как восстановление. Без него забытый пароль
 * означал бы потерянный аккаунт со всеми проектами, а аккаунты, заведённые до появления
 * паролей, не открылись бы вовсе.
 */

type Mode = "signup" | "signin" | "code";

function AuthForm() {
  const router = useRouter();
  const { available, isLoaded, refresh } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [delivery, setDelivery] = useState<"email" | "console" | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

  const done = async () => {
    await refresh();
    router.push("/app/projects");
  };

  const fail = (data: { error?: string; field?: string }) => {
    setError(data.error ?? "Не получилось. Попробуйте ещё раз.");
    setField(data.field ?? null);
  };

  const post = async (url: string, payload: unknown) => {
    setBusy(true);
    setError(null);
    setField(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as Record<string, unknown>;
      return { ok: response.ok, data } as const;
    } catch {
      setError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз.");
      return { ok: false, data: {} } as const;
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const { ok, data } = await post("/api/auth/register", { name, email, password, confirm });
    if (!ok) return fail(data as { error?: string; field?: string });
    await done();
  };

  const submitSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const { ok, data } = await post("/api/auth/password", { email, password });
    if (!ok) {
      // Аккаунт без пароля — не тупик: уводим туда, где он откроется.
      if (data.reason === "no-password") setMode("code");
      return fail(data as { error?: string; field?: string });
    }
    await done();
  };

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const { ok, data } = await post("/api/auth/request", { email });
    if (!ok || !data.sent) return fail(data as { error?: string });
    setDelivery((data.delivery as "email" | "console") ?? "email");
    setCodeSent(true);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return;
    const { ok, data } = await post("/api/auth/verify", { email, code: digits });
    if (!ok) {
      setCode("");
      return fail(data as { error?: string });
    }
    await done();
  };

  const problem = (name: string) => (field === name ? "is-invalid" : undefined);

  return (
    <div className="workspace-page auth-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Аккаунт AEVIX</p>
        <h2 className="brief-title">
          {mode === "signup" ? "Создать аккаунт" : mode === "signin" ? "Войти в аккаунт" : "Вход по коду"}
        </h2>
        <p className="brief-lead">
          {mode === "signup"
            ? "Проекты будут храниться в аккаунте и открываться с любого устройства."
            : mode === "signin"
              ? "Введите почту и пароль. Забыли пароль — войдите по коду из письма."
              : "Пришлём шестизначный код на почту. Пароль не понадобится."}
        </p>
      </header>

      {/* Две вкладки, а не одна кнопка: человек должен сразу понимать, создаёт он аккаунт или
          входит в существующий. */}
      <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={cn("auth-tab", mode === "signup" && "is-active")}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          <UserPlus className="h-4 w-4" /> Регистрация
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode !== "signup"}
          className={cn("auth-tab", mode !== "signup" && "is-active")}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
        >
          <LogIn className="h-4 w-4" /> Вход
        </button>
      </div>

      <form
        className="workspace-create-form"
        onSubmit={mode === "signup" ? submitSignUp : mode === "signin" ? submitSignIn : codeSent ? submitCode : requestCode}
      >
        {mode === "signup" ? (
          <label className={cn("workspace-field", problem("name"))}>
            <span className="workspace-field-label">Как вас зовут *</span>
            <input
              type="text"
              aria-label="Как вас зовут"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Алан"
              autoComplete="name"
              maxLength={60}
              required
            />
          </label>
        ) : null}

        {!(mode === "code" && codeSent) ? (
          <label className={cn("workspace-field", problem("email"))}>
            <span className="workspace-field-label">Почта *</span>
            <input
              type="email"
              aria-label="Почта"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        ) : null}

        {mode !== "code" ? (
          <label className={cn("workspace-field", problem("password"))}>
            <span className="workspace-field-label">Пароль *</span>
            <input
              type="password"
              aria-label="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "Не короче 8 символов" : "Ваш пароль"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              maxLength={200}
              required
            />
            {mode === "signup" ? (
              <span className="workspace-field-hint">Не короче 8 символов, хотя бы одна буква и одна цифра.</span>
            ) : null}
          </label>
        ) : null}

        {mode === "signup" ? (
          <label className={cn("workspace-field", problem("confirm"))}>
            <span className="workspace-field-label">Повторите пароль *</span>
            <input
              type="password"
              aria-label="Повторите пароль"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Ещё раз"
              autoComplete="new-password"
              maxLength={200}
              required
            />
          </label>
        ) : null}

        {mode === "code" && codeSent ? (
          <label className="workspace-field">
            <span className="workspace-field-label">Код из письма</span>
            <input
              className="login-code-input"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
            />
          </label>
        ) : null}

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        {delivery === "console" && codeSent ? (
          <p className="workspace-field-hint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Terminal className="h-4 w-4" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Почта на сервере не настроена (нет <code>RESEND_API_KEY</code>), поэтому письмо не отправлено — код
              напечатан в консоль сервера.
            </span>
          </p>
        ) : null}

        {isLoaded && !available ? (
          <p className="workspace-field-hint" role="status">
            Вход пока не настроен на сервере. Проекты продолжают сохраняться на этом устройстве.
          </p>
        ) : null}

        <button type="submit" className="workspace-create-submit" disabled={busy}>
          {busy ? (
            <>
              <span className="auth-spinner" aria-hidden="true" /> Проверяем…
            </>
          ) : mode === "signup" ? (
            <>
              <UserPlus className="h-4 w-4" /> Создать аккаунт
            </>
          ) : mode === "signin" ? (
            <>
              <LogIn className="h-4 w-4" /> Войти
            </>
          ) : codeSent ? (
            <>
              <KeyRound className="h-4 w-4" /> Подтвердить код
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" /> Получить код
            </>
          )}
        </button>

        {/* Восстановление: третий путь, который не должен спорить с основными двумя. */}
        {mode === "signin" ? (
          <button
            type="button"
            className="auth-alt"
            onClick={() => {
              setMode("code");
              setError(null);
            }}
          >
            Забыли пароль? Войти по коду из письма
          </button>
        ) : null}
        {mode === "code" ? (
          <button
            type="button"
            className="auth-alt"
            onClick={() => {
              setMode("signin");
              setCodeSent(false);
              setError(null);
            }}
          >
            Вернуться ко входу по паролю
          </button>
        ) : null}
      </form>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams требует границы Suspense: без неё вся страница выпадает из статического
  // рендера и собирается только на клиенте.
  return (
    <Suspense fallback={<div className="workspace-page" />}>
      <AuthForm />
    </Suspense>
  );
}
