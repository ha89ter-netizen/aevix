"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Terminal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Вход по коду из письма.
 *
 * Два шага на одной странице: почта, затем шесть цифр. Человек не покидает вкладку, в которой
 * начал, — и это не удобство, а требование. Перенос проектов в аккаунт читает `localStorage`
 * того браузера, где случился вход; прежняя ссылка из письма уводила в другой браузер, и
 * проекты оставались запертыми в первом (см. src/lib/auth.ts).
 *
 * Отдельного экрана «Регистрация» нет намеренно: первый вход по адресу и создаёт аккаунт, а
 * спрашивать человека, новый он или нет, незачем — это и так известно серверу.
 */
export default function LoginPage() {
  const router = useRouter();
  const { available, isLoaded, refresh } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<"email" | "console" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { sent?: boolean; delivery?: "email" | "console"; error?: string };
      if (!response.ok || !data.sent) {
        setError(data.error ?? "Не удалось отправить код. Попробуйте ещё раз.");
        return;
      }
      setDelivery(data.delivery ?? "email");
      setStep("code");
      setCode("");
      // Фокус сразу в поле кода: человек возвращается из почты и должен начать печатать, а не
      // искать, куда.
      window.setTimeout(() => codeRef.current?.focus(), 50);
    } catch {
      setError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (busy || digits.length !== 6) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      const data = (await response.json()) as { user?: unknown; error?: string; reason?: string };
      if (!response.ok || !data.user) {
        setError(data.error ?? "Неверный код.");
        // Сгоревший код возвращает к первому шагу: вводить в него что-то ещё бессмысленно.
        if (data.reason === "attempts" || data.reason === "expired" || data.reason === "used") {
          setStep("email");
        }
        setCode("");
        return;
      }
      await refresh();
      router.push("/app/projects");
    } catch {
      setError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "code") {
    return (
      <div className="workspace-page">
        <header className="brief-header">
          <p className="brief-eyebrow">Вход</p>
          <h2 className="brief-title">Введите код из письма</h2>
          <p className="brief-lead">
            Отправили шесть цифр на <strong>{email}</strong>. Код действует 15 минут и срабатывает один раз.
          </p>
        </header>

        <form className="workspace-create-form" onSubmit={submitCode}>
          <label className="workspace-field">
            <span className="workspace-field-label">Код из письма</span>
            <input
              ref={codeRef}
              className="login-code-input"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              // Подсказка браузеру и iOS: подставить код из только что пришедшего письма.
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>

          {error ? (
            <p className="workspace-field-hint" role="alert" style={{ color: "#b91c1c" }}>
              {error}
            </p>
          ) : null}

          {delivery === "console" ? (
            // Ключа Resend нет, письмо отправить нечем. Молчать нельзя: человек будет ждать
            // письмо, которого не будет.
            <p className="workspace-field-hint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Terminal className="h-4 w-4" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Почта на сервере не настроена (нет <code>RESEND_API_KEY</code>), поэтому письмо не отправлено — код
                напечатан в консоль сервера. Это рабочий режим для разработки, но не для боевого сайта.
              </span>
            </p>
          ) : null}

          <button type="submit" className="workspace-create-submit" disabled={busy || code.length !== 6}>
            {busy ? "Проверяем…" : "Войти"}
          </button>

          <button
            type="button"
            className="workspace-field-hint"
            style={{ display: "flex", gap: 6, alignItems: "center", background: "none", border: 0, cursor: "pointer" }}
            onClick={() => {
              setStep("email");
              setError(null);
              setCode("");
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Ввести другой адрес или запросить новый код
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Вход</p>
        <h2 className="brief-title">Войти в AEVIX</h2>
        <p className="brief-lead">
          Введите почту — пришлём код из шести цифр. Пароль не нужен. Проекты, созданные на этом устройстве, при первом
          входе перенесутся в аккаунт.
        </p>
      </header>

      <form className="workspace-create-form" onSubmit={requestCode}>
        <label className="workspace-field">
          <span className="workspace-field-label">Почта</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>

        {error ? (
          <p className="workspace-field-hint" role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        {isLoaded && !available ? (
          <p className="workspace-field-hint" role="status">
            Вход пока не настроен на сервере. Проекты продолжают сохраняться на этом устройстве.
          </p>
        ) : null}

        <button type="submit" className="workspace-create-submit" disabled={busy || !email.trim()}>
          <Mail className="h-4 w-4" />
          {busy ? "Отправляем…" : "Получить код"}
        </button>
        <p className="workspace-storage-notice">
          Аккаунт нужен, чтобы проекты жили не в одном браузере, а были доступны с любого устройства.
        </p>
      </form>
    </div>
  );
}
