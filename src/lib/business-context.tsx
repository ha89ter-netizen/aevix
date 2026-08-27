"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  detectBusiness,
  getBusinessContent,
  type BusinessContent,
  type HeroBusinessProfile,
} from "@/lib/hero-analysis";
import { useAuth } from "@/lib/auth-context";

export type BusinessStatus = "idle" | "analyzing" | "ready";

/** The narrative shown while analysing; the last beat is the interface rebuild itself. */
export const ANALYSIS_SEQUENCE = [
  "Анализируем бизнес",
  "Понимаем процессы",
  "Проектируем автоматизацию",
  "Перестраиваем интерфейс",
] as const;

/** Minimum time the analysing sequence stays on screen, so the narrative reads deliberately. */
const MIN_SEQUENCE_MS = 2100;

/**
 * Сохранённый business context (Pricing pass). Храним ТОЛЬКО исходный текст пользователя и id
 * аккаунта, которому он принадлежит (`null` — аноним). Ниша выводится из текста каноническим
 * `resolveNiche`/`detectBusiness`, второго источника identity нет. localStorage: контекст переживает
 * F5 и навигацию на устройстве.
 *
 * Тег аккаунта нужен, чтобы transient-контекст пользователя A не перешёл пользователю B на том же
 * устройстве: восстанавливаем только если сохранённый `acc` совпадает с текущим, а при смене
 * identity (логаут, вход другим) — чистим и хранилище, и состояние в памяти.
 *
 * Единственный переход, где контекст ПЕРЕЖИВАЕТ смену тега, — «аноним вошёл» в той же вкладке:
 * человек сам ввёл описание минуту назад, поэтому контекст перевешивается на новый аккаунт. Чужим
 * он при этом не станет: у вышедшего пользователя контекст уже стёрт на логауте, а сохранённый
 * анонимный контекст неизвестного происхождения (холодный старт при уже открытой сессии) не
 * восстанавливается вовсе.
 */
const CONTEXT_STORAGE_KEY = "aevix.business-context";

type StoredContext = { acc: string | null; input: string };

function readStoredContext(): StoredContext | null {
  try {
    const raw = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredContext>;
    const input = typeof parsed.input === "string" ? parsed.input.trim() : "";
    if (!input) return null;
    return { acc: parsed.acc ?? null, input };
  } catch {
    return null;
  }
}

/** Перевешивает уже сохранённый контекст на другой аккаунт, не трогая сам текст. */
function retagStoredContext(acc: string | null) {
  const saved = readStoredContext();
  if (!saved) return;
  try {
    window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify({ acc, input: saved.input }));
  } catch {
    // ignore
  }
}

function clearStoredContext() {
  try {
    window.localStorage.removeItem(CONTEXT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

type BusinessContextValue = {
  status: BusinessStatus;
  /** Index into ANALYSIS_SEQUENCE while status === "analyzing". */
  stage: number;
  profile: HeroBusinessProfile | null;
  content: BusinessContent | null;
  summary: string | null;
  degraded: boolean;
  /** The description the visitor submitted. */
  input: string;
  analyze: (message: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  /** Free-consultation popup (channel picker), shared by every "get in touch" CTA. */
  consultationOpen: boolean;
  openConsultation: () => void;
  closeConsultation: () => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BusinessStatus>("idle");
  const [stage, setStage] = useState(0);
  const [profile, setProfile] = useState<HeroBusinessProfile | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [input, setInput] = useState("");
  const [consultationOpen, setConsultationOpen] = useState(false);
  const runningRef = useRef(false);

  const { user, isLoaded: authLoaded } = useAuth();
  const accountId = user?.id ?? null;
  // Текущий аккаунт в ref — чтобы `analyze` мог тегировать сохранение, не пересобираясь при логине.
  const accountIdRef = useRef<string | null>(accountId);
  accountIdRef.current = accountId;
  const prevAccountRef = useRef<string | null | undefined>(undefined);

  const openConsultation = useCallback(() => setConsultationOpen(true), []);
  const closeConsultation = useCallback(() => setConsultationOpen(false), []);

  // Регидрация и защита от межаккаунтной утечки в одном эффекте (ждёт готовности auth).
  //  - первый резолв: восстанавливаем контекст локально (detectBusiness — без сети), НО только если
  //    он принадлежит текущей identity; чужой (другой acc) — стираем, не отдаём.
  //  - смена identity после инициализации (логаут / вход другим): чистим и хранилище, и in-memory —
  //    transient-контекст пользователя A не виден B;
  //  - исключение — «аноним вошёл»: контекст перевешивается на новый аккаунт, а не стирается.
  useEffect(() => {
    if (!authLoaded) return;
    const prev = prevAccountRef.current;
    prevAccountRef.current = accountId;

    if (prev === undefined) {
      const saved = readStoredContext();
      if (!saved) return;
      if (saved.acc !== accountId) {
        clearStoredContext(); // контекст другого аккаунта — не восстанавливаем
        return;
      }
      setInput(saved.input);
      setProfile(detectBusiness(saved.input));
      setStatus("ready");
      return;
    }

    if (prev === accountId) return;

    // Аноним вошёл в аккаунт ПРЯМО СЕЙЧАС, в этой же вкладке: описание бизнеса он только что ввёл
    // сам, и стирать его на входе значит спросить сферу второй раз ровно в момент регистрации.
    // Контекст остаётся и перевешивается на новый аккаунт — после чего переживает и перезагрузку.
    // Это не наследование чужого: контекст реального аккаунта тегирован им и на выходе стирается.
    if (prev === null && accountId !== null) {
      retagStoredContext(accountId);
      return;
    }

    // Настоящая смена identity (выход или вход другим) — transient-контекст не переходит дальше.
    clearStoredContext();
    setStatus("idle");
    setStage(0);
    setProfile(null);
    setSummary(null);
    setDegraded(false);
    setInput("");
  }, [authLoaded, accountId]);

  const analyze = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text || runningRef.current) return;
    runningRef.current = true;

    const detected = detectBusiness(text);
    setInput(text);
    try {
      // Тегируем текущим аккаунтом (null для анонима) — см. защиту от межаккаунтной утечки.
      window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify({ acc: accountIdRef.current, input: text }));
    } catch {
      // fail-open: не удалось сохранить — контекст просто не переживёт reload, но flow не ломается.
    }
    setProfile(detected);
    setSummary(null);
    setDegraded(false);
    setStage(0);
    setStatus("analyzing");

    // Advance the narrative beats while the request is in flight.
    const stageTimers = [
      window.setTimeout(() => setStage(1), 500),
      window.setTimeout(() => setStage(2), 1000),
      window.setTimeout(() => setStage(3), 1500),
    ];

    const startedAt = performance.now();
    let nextSummary: string | null = null;
    let failed = false;

    try {
      const response = await fetch("/api/business-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await response.json()) as {
        analysis?: string;
        result?: { summary?: string };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "analysis failed");
      nextSummary = data.result?.summary ?? data.analysis ?? null;
    } catch {
      failed = true; // graceful fallback: local recognition still drives the site
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed < MIN_SEQUENCE_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_SEQUENCE_MS - elapsed));
    }

    stageTimers.forEach((timer) => window.clearTimeout(timer));
    setStage(ANALYSIS_SEQUENCE.length - 1);
    setSummary(nextSummary);
    setDegraded(failed);
    setStatus("ready");
    runningRef.current = false;
  }, []);

  const retry = useCallback(async () => {
    if (!input) return;
    await analyze(input);
  }, [analyze, input]);

  const reset = useCallback(() => {
    if (runningRef.current) return;
    setStatus("idle");
    setStage(0);
    setProfile(null);
    setSummary(null);
    setDegraded(false);
    setInput("");
    clearStoredContext();
  }, []);

  const value = useMemo<BusinessContextValue>(
    () => ({
      status,
      stage,
      profile,
      content: profile ? getBusinessContent(profile.category) : null,
      summary,
      degraded,
      input,
      analyze,
      retry,
      reset,
      consultationOpen,
      openConsultation,
      closeConsultation,
    }),
    [status, stage, profile, summary, degraded, input, analyze, retry, reset, consultationOpen, openConsultation, closeConsultation],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("useBusiness must be used within a BusinessProvider");
  return value;
}
