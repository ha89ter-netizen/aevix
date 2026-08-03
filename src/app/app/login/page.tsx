"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, Terminal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Вход по ссылке на почту.
 *
 * Ни пароля, ни регистрации: первый вход по адресу и создаёт аккаунт. Отдельного экрана
 * «Регистрация» нет намеренно — он потребовал бы от человека решить, новый он или нет, хотя
 * ответ и так известен серверу.
 */

/** Что показать вместо технической причины из ссылки, по которой не удалось войти. */
const ERRORS: Record<string, string> = {
  expired: "Срок действия ссылки истёк. Запросите новую — она действует 15 минут.",
  used: "Эта ссылка уже использована. Запросите новую.",
  invalid: "Ссылка недействительна. Проверьте, что открыли её целиком, или запросите новую.",
  unavailable: "Вход временно недоступен: на сервере не настроено хранилище аккаунтов.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const { available, isLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [delivery, setDelivery] = useState<"email" | "console" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkError = searchParams.get("error");
  const shownError = error ?? (linkError ? ERRORS[linkError] ?? ERRORS.invalid : null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending" || !email.trim()) return;
    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { sent?: boolean; delivery?: "email" | "console"; error?: string };
      if (!response.ok || !data.sent) {
        setError(data.error ?? "Не удалось отправить ссылку. Попробуйте ещё раз.");
        setStatus("idle");
        return;
      }
      setDelivery(data.delivery ?? "email");
      setStatus("sent");
    } catch {
      setError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div className="workspace-page">
        <header className="brief-header">
          <p className="brief-eyebrow">Вход</p>
          <h2 className="brief-title">Проверьте почту</h2>
          <p className="brief-lead">
            Ссылка для входа отправлена на <strong>{email}</strong>. Она действует 15 минут и срабатывает один раз.
          </p>
        </header>

        <div className="workspace-create-form">
          <p className="workspace-field-hint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <CheckCircle2 className="h-4 w-4" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Письмо не пришло? Проверьте папку «Спам» — и запросите ссылку заново.</span>
          </p>

          {delivery === "console" ? (
            // Ключа Resend нет, письмо отправить нечем. Молчать об этом нельзя: человек будет
            // ждать письмо, которого не будет. Здесь это видно сразу и понятно, что делать.
            <p className="workspace-field-hint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Terminal className="h-4 w-4" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Почта на сервере не настроена (нет <code>RESEND_API_KEY</code>), поэтому письмо не отправлено — ссылка
                напечатана в консоль сервера. Это рабочий режим для разработки, но не для боевого сайта.
              </span>
            </p>
          ) : null}

          <button type="button" className="workspace-create-submit" onClick={() => setStatus("idle")}>
            Ввести другой адрес
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="brief-header">
        <p className="brief-eyebrow">Вход</p>
        <h2 className="brief-title">Войти в AEVIX</h2>
        <p className="brief-lead">
          Введите почту — пришлём ссылку для входа. Пароль не нужен. Проекты, созданные на этом устройстве, при первом
          входе перенесутся в аккаунт.
        </p>
      </header>

      <form className="workspace-create-form" onSubmit={submit}>
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

        {shownError ? (
          <p className="workspace-field-hint" role="alert" style={{ color: "#b91c1c" }}>
            {shownError}
          </p>
        ) : null}

        {isLoaded && !available ? (
          <p className="workspace-field-hint" role="status">
            Вход пока не настроен на сервере. Проекты продолжают сохраняться на этом устройстве.
          </p>
        ) : null}

        <button type="submit" className="workspace-create-submit" disabled={status === "sending" || !email.trim()}>
          <Mail className="h-4 w-4" />
          {status === "sending" ? "Отправляем…" : "Получить ссылку"}
        </button>
        <p className="workspace-storage-notice">
          Аккаунт нужен, чтобы проекты жили не в одном браузере, а были доступны с любого устройства.
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams требует границы Suspense: без неё вся страница выпадает из статического
  // рендера и собирается только на клиенте.
  return (
    <Suspense fallback={<div className="workspace-page" />}>
      <LoginForm />
    </Suspense>
  );
}
