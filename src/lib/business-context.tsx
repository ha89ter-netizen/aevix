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

/**
 * Три такта локальной фазы. Каждый назван по работе, которая ДЕЙСТВИТЕЛЬНО происходит на
 * устройстве: принять текст, определить нишу каноническим резолвером, перестроить страницу под
 * неё. Ни один такт не описывает работу, которой нет, — «изучаем рынок» и «анализируем
 * конкурентов» здесь появиться не может, потому что таких шагов в системе не существует.
 *
 * Раньше тактов было четыре и они шли по таймеру до самого сетевого ответа. На замере это давало
 * от 5,8 до 10,7 секунды неподвижной надписи «Перестраиваем интерфейс»: повествование
 * заканчивалось на 1,56с, а ответ приходил на 7,35с. Локальный резолвер при этом знал нишу с
 * первого кадра и молчал. Теперь локальная фаза заканчивается собой, а не ожиданием сети.
 */
export const ANALYSIS_SEQUENCE = [
  "Читаем описание",
  "Определяем сферу",
  "Перестраиваем интерфейс",
] as const;

/**
 * Пол локальной фазы. Не имитация работы: сам разбор занимает единицы миллисекунд, и без пола
 * три такта мелькнули бы одним кадром. Это порог читаемости, и он намеренно короткий — экран
 * ждёт человека, а не сеть.
 */
const LOCAL_PHASE_MS = 900;
const LOCAL_BEAT_MS = 300;

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
  /**
   * Подробный разбор ещё едет с сервера, а всё локально известное уже на экране (Journey pass).
   * Отдельный флаг, а не третий статус: страница персонализируется по `profile`, и растягивать
   * ради ожидания сети общий `status` значило бы задержать её ровно на то время, которое мы и
   * убираем. Разделение честное: KNOWN LOCALLY уже показано, REMOTE помечено ожидающим.
   */
  summaryPending: boolean;
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
  const [summaryPending, setSummaryPending] = useState(false);
  /**
   * Номер запуска разбора. Пришедший ответ применяется, ТОЛЬКО если его запуск всё ещё
   * последний, — иначе «Изменить» или повторный ввод во время ожидания сети получили бы поверх
   * себя устаревший разбор. Тот же приём, что защищает порядок сохранений (этап 7, Wave 2).
   */
  const runIdRef = useRef(0);

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
    runIdRef.current += 1;
    setSummaryPending(false);
    setStatus("idle");
    setStage(0);
    setProfile(null);
    setSummary(null);
    setDegraded(false);
    setInput("");
  }, [authLoaded, accountId]);

  const analyze = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text) return;
    const runId = ++runIdRef.current;

    // Локальный резолвер. Сети здесь нет вовсе — ниша известна с первого кадра, и именно это
    // знание раньше лежало неиспользованным всё время сетевого ожидания.
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
    setSummaryPending(true);

    const stageTimers = [
      window.setTimeout(() => setStage(1), LOCAL_BEAT_MS),
      window.setTimeout(() => setStage(2), LOCAL_BEAT_MS * 2),
    ];

    // Сеть уходит ПАРАЛЛЕЛЬНО локальной фазе и больше её не держит. Раньше показ распознанного
    // ждал этот ответ, и всё ожидание уходило в неподвижный последний такт.
    const remote = (async (): Promise<{ summary: string | null; failed: boolean }> => {
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
        return { summary: data.result?.summary ?? data.analysis ?? null, failed: false };
      } catch {
        // graceful fallback: local recognition still drives the site
        return { summary: null, failed: true };
      }
    })();

    await new Promise((resolve) => window.setTimeout(resolve, LOCAL_PHASE_MS));
    if (runIdRef.current !== runId) return;

    stageTimers.forEach((timer) => window.clearTimeout(timer));
    setStage(ANALYSIS_SEQUENCE.length - 1);
    // Локально известное — на экран. Подробный разбор помечен ожидающим, а не выдуман.
    setStatus("ready");

    const { summary: nextSummary, failed } = await remote;
    // Разбор мог устареть, пока шёл: человек нажал «Изменить» или описал бизнес заново.
    if (runIdRef.current !== runId) return;
    setSummary(nextSummary);
    setDegraded(failed);
    setSummaryPending(false);
  }, []);

  const retry = useCallback(async () => {
    if (!input) return;
    await analyze(input);
  }, [analyze, input]);

  const reset = useCallback(() => {
    // Сброс доступен и во время ожидания сети: карточка с кнопкой «Изменить» теперь видна уже
    // тогда, а неработающая кнопка хуже отсутствующей. Устаревший ответ отсекается по runId.
    runIdRef.current += 1;
    setSummaryPending(false);
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
      summaryPending,
      input,
      analyze,
      retry,
      reset,
      consultationOpen,
      openConsultation,
      closeConsultation,
    }),
    [status, stage, profile, summary, degraded, summaryPending, input, analyze, retry, reset, consultationOpen, openConsultation, closeConsultation],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("useBusiness must be used within a BusinessProvider");
  return value;
}
