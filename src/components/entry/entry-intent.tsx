"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SceneIntent } from "./ecosystem/graph";

/**
 * Намерение, прочитанное с левой половины экрана.
 *
 * Герой и система перестают быть двумя картинками рядом: когда человек тянется к кнопке, правая
 * половина отвечает — не эффектом, а поведением. «Открыть сайт» поднимает маршруты витрины,
 * «Войти» — маршруты рабочего места.
 *
 * Передаётся именно СМЫСЛ, а не «наведено на кнопку номер один»: сцена ничего не знает ни о
 * вёрстке героя, ни о числе кнопок, а герой — о том, какие узлы существуют. Поэтому связь можно
 * будет расширить (третье действие, подсказка, разбор бизнеса), не трогая ни одну из сторон.
 */

type IntentValue = { intent: SceneIntent | null; setIntent: (next: SceneIntent | null) => void };

const EntryIntentContext = createContext<IntentValue>({ intent: null, setIntent: () => {} });

export function EntryIntentProvider({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState<SceneIntent | null>(null);
  const value = useMemo(() => ({ intent, setIntent }), [intent]);
  return <EntryIntentContext.Provider value={value}>{children}</EntryIntentContext.Provider>;
}

/** Для сцены: что человек сейчас имеет в виду. */
export function useEntryIntent(): SceneIntent | null {
  return useContext(EntryIntentContext).intent;
}

/** Для героя: сообщить о намерении. Наведение и фокус равноправны — с клавиатуры тоже видно. */
export function useSetEntryIntent(): (next: SceneIntent | null) => void {
  return useContext(EntryIntentContext).setIntent;
}
