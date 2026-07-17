"use client";

import {
  createContext,
  useCallback,
  useContext,
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
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BusinessStatus>("idle");
  const [stage, setStage] = useState(0);
  const [profile, setProfile] = useState<HeroBusinessProfile | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [input, setInput] = useState("");
  const runningRef = useRef(false);

  const analyze = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text || runningRef.current) return;
    runningRef.current = true;

    const detected = detectBusiness(text);
    setInput(text);
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
    }),
    [status, stage, profile, summary, degraded, input, analyze, retry, reset],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("useBusiness must be used within a BusinessProvider");
  return value;
}
