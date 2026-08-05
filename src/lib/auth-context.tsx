"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Кто вошёл — на стороне браузера.
 *
 * Сессионная cookie httpOnly, то есть из JavaScript не читается: это защищает её от кражи через
 * XSS, но и означает, что состояние входа приложение узнаёт единственным способом — спросив
 * сервер. Отсюда один запрос к /api/auth/session при загрузке и общий контекст поверх него,
 * чтобы этот запрос не делал каждый компонент отдельно.
 */

export type AuthUser = { id: string; email: string; name?: string };

type AuthContextValue = {
  user: AuthUser | null;
  /** False до первого ответа сервера. Отличает «ещё не знаем» от «точно не вошёл» — без этого
   * интерфейс на мгновение показывал бы «Войти» уже вошедшему. */
  isLoaded: boolean;
  /** Настроен ли вход на сервере. Если нет, предлагать его бессмысленно. */
  available: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [available, setAvailable] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await response.json()) as { user?: AuthUser | null; available?: boolean };
      setUser(data.user ?? null);
      setAvailable(Boolean(data.available));
    } catch {
      // Сеть недоступна — считаем, что не вошли. Приложение продолжает работать с локальным
      // хранилищем, как работало до появления аккаунтов.
      setUser(null);
      setAvailable(false);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoaded, available, signOut, refresh }),
    [user, isLoaded, available, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within an AuthProvider");
  return value;
}
