"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Жизнь сцены во времени — отдельно от графа и отдельно от отрисовки.
 *
 * Здесь нет ни одного кадра анимации, и это главное решение всего этапа. Дыхание узлов и их
 * дрейф отданы CSS: у каждого узла свой период и своя фаза, браузер считает их на композиторе, а
 * React об этом вообще не знает. Гнать шестьдесят перерисовок в секунду ради движения, которое
 * человек не должен замечать, — самый дорогой способ получить самый незаметный эффект.
 *
 * React здесь просыпается редко и по делу: раз в несколько секунд система перекладывает связи, и
 * ещё реже по одной из них проходит импульс. Всё остальное время дерево не трогается вовсе.
 *
 * Сцена останавливается, когда её не видно, и не запускается вовсе, если человек просил
 * уменьшить анимацию: незаметное движение не стоит ни одного процента чужой батареи.
 */

/** Как часто система пересматривает пути. Медленно: перекладка должна читаться как решение. */
const REROUTE_MS = 2600;

/**
 * Разброс пауз между импульсами. Ровный такт превратил бы систему в метроном.
 *
 * Числа подобраны наблюдением, а не на глаз: при паузе в 4–9 секунд импульс был на экране почти
 * половину времени и превращался из события в ритм. Сейчас доля — около шестой части, то есть
 * чаще всего сцена просто живёт, а данные проходят изредка.
 */
const PULSE_GAP_MS = { min: 6500, max: 15000 };

/**
 * И отдельно — редкие происшествия.
 *
 * Дыхание показывает, что система жива. Но живое и думающее — разные вещи: дыхание предсказуемо,
 * а мысль нет. Поэтому здесь второй, гораздо более редкий и разреженный поток, в котором ещё и
 * тип события выбирается случайно. Пауза от четырнадцати до тридцати четырёх секунд подобрана
 * так, чтобы следующий момент нельзя было предугадать даже при внимательном наблюдении, — и
 * чтобы за одно посещение человек застал одно-два происшествия, а не череду.
 */
const EVENT_GAP_MS = { min: 14000, max: 34000 };

/** Сколько импульс идёт по пути. Долго — это информация, а не разряд. */
export const PULSE_DURATION_MS = 2400;

/** Сколько держится вспышка внимания на узле и временно открытый маршрут. */
export const SPARK_MS = 2600;
export const GRAFT_MS = 3400;

/**
 * Что именно случилось.
 *
 * `pulse` — по маршруту прошли данные. `cascade` — то же, но через несколько зависимых узлов
 * подряд: так выглядит сценарий, а не одиночное событие. `spark` — узел получил работу.
 * `graft` — система на несколько секунд открыла путь, которым сейчас не пользуется.
 */
export type SceneEvent =
  | { kind: "pulse"; key: number; edgeId: string; delay: number }
  | { kind: "spark"; key: number; nodeId: string }
  | { kind: "graft"; key: number; edgeId: string };

type Options = {
  /** Элемент сцены — за его появлением в кадре следит наблюдатель. */
  stageRef: RefObject<HTMLElement | null>;
  /** Пути, по которым может пойти импульс, — только открытые прямо сейчас. */
  edgeIds: string[];
  /** Все пути графа: среди закрытых система иногда открывает один на несколько секунд. */
  allEdgeIds: string[];
  /** Узлы сцены — для вспышки внимания. */
  nodeIds: string[];
  /** Цепочки зависимых маршрутов: по ним проходит каскад. */
  chains: string[][];
};

export type EcosystemLife = {
  /** Медленно растущая фаза: из неё граф выводит, какие пути открыты сейчас. */
  phase: number;
  events: SceneEvent[];
  /** Сцена дышит. Ложь — вне кадра или человек просил уменьшить анимацию. */
  isBreathing: boolean;
};

export function useEcosystemLife({ stageRef, edgeIds, allEdgeIds, nodeIds, chains }: Options): EcosystemLife {
  const [phase, setPhase] = useState(0);
  const [events, setEvents] = useState<SceneEvent[]>([]);
  const [isBreathing, setBreathing] = useState(false);

  // Всё, из чего выбираются события, живёт в ref: обновление графа не должно перезапускать
  // таймеры и обрывать происшествие на середине.
  const sourceRef = useRef({ edgeIds, allEdgeIds, nodeIds, chains });
  sourceRef.current = { edgeIds, allEdgeIds, nodeIds, chains };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Два независимых условия, а не один флаг: сцена должна быть и в кадре, и во вкладке, на
    // которую смотрят. Смешать их в одну переменную — значит однажды не суметь восстановить
    // первое после второго.
    let inView = false;
    let rerouteTimer = 0;
    let pulseTimer = 0;
    let eventTimer = 0;
    let key = 0;

    const stop = () => {
      window.clearInterval(rerouteTimer);
      window.clearTimeout(pulseTimer);
      window.clearTimeout(eventTimer);
      rerouteTimer = 0;
      pulseTimer = 0;
      eventTimer = 0;
      setBreathing(false);
      // Происшествия в пути гасятся: вернувшись, человек не должен застать замершее на середине.
      setEvents([]);
    };

    const pick = <T,>(list: T[]): T | null => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

    const add = (event: SceneEvent, lifetime: number) => {
      setEvents((current) => [...current, event]);
      // Событие снимает себя само: на сцене никогда не копится больше двух-трёх живых.
      window.setTimeout(() => {
        setEvents((current) => current.filter((item) => item.key !== event.key));
      }, lifetime);
    };

    const schedulePulse = () => {
      const gap = PULSE_GAP_MS.min + Math.random() * (PULSE_GAP_MS.max - PULSE_GAP_MS.min);
      pulseTimer = window.setTimeout(() => {
        const edgeId = pick(sourceRef.current.edgeIds);
        if (edgeId) {
          key += 1;
          add({ kind: "pulse", key, edgeId, delay: 0 }, PULSE_DURATION_MS + 200);
        }
        schedulePulse();
      }, gap);
    };

    /**
     * Происшествие. Тип выбирается случайно, поэтому предугадать нельзя не только момент, но и
     * то, что именно случится.
     */
    const scheduleEvent = () => {
      const gap = EVENT_GAP_MS.min + Math.random() * (EVENT_GAP_MS.max - EVENT_GAP_MS.min);
      eventTimer = window.setTimeout(() => {
        const source = sourceRef.current;
        const roll = Math.random();

        if (roll < 0.4) {
          // Каскад: данные идут по цепочке зависимых маршрутов с задержкой между звеньями —
          // так выглядит сценарий целиком, а не одно событие.
          const chain = pick(source.chains);
          if (chain) {
            chain.slice(0, 3).forEach((edgeId, step) => {
              key += 1;
              add(
                { kind: "pulse", key, edgeId, delay: step * (PULSE_DURATION_MS * 0.55) },
                PULSE_DURATION_MS * 2.5,
              );
            });
          }
        } else if (roll < 0.7) {
          const nodeId = pick(source.nodeIds);
          if (nodeId) {
            key += 1;
            add({ kind: "spark", key, nodeId }, SPARK_MS);
          }
        } else {
          // Открыть на несколько секунд путь, которым сейчас не пользуются: система пробует
          // другой маршрут. Путь берётся из осмысленных, а не выдумывается.
          const closed = source.allEdgeIds.filter((id) => !source.edgeIds.includes(id));
          const edgeId = pick(closed);
          if (edgeId) {
            key += 1;
            add({ kind: "graft", key, edgeId }, GRAFT_MS);
          }
        }
        scheduleEvent();
      }, gap);
    };

    const start = () => {
      if (rerouteTimer || motion.matches) return;
      setBreathing(true);
      rerouteTimer = window.setInterval(() => setPhase((value) => value + 1), REROUTE_MS);
      schedulePulse();
      scheduleEvent();
    };

    const sync = () => {
      if (inView && !document.hidden && !motion.matches) start();
      else stop();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.1 },
    );
    observer.observe(stage);

    // Вкладка в фоне — та же остановка: таймеры там всё равно душит браузер, но импульсы, о
    // которых он не знает, копились бы и вывалились пачкой при возвращении.
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      stop();
    };
  }, [stageRef]);

  return { phase, events, isBreathing };
}
