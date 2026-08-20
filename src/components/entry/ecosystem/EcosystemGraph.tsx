"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { CAPABILITY_BY_ID } from "./capabilities";
import { CAPABILITY_ICON } from "./icons";
import {
  activeEdgeIds,
  buildGraph,
  carrierEdgeIds,
  densityFor,
  intentEdgeIds,
  intentNodeIds,
  neighboursOf,
  type GraphEdge,
  type GraphNode,
} from "./graph";
import { useEntryIntent } from "../entry-intent";
import { NEUTRAL_PROFILE, type BusinessProfile } from "./profiles";
import { PULSE_DURATION_MS, useEcosystemLife } from "./use-ecosystem-life";

/**
 * Отрисовка живой системы.
 *
 * Слой получает готовое: граф считает `graph.ts`, ритм — `use-ecosystem-life.ts`, важность —
 * профиль. Здесь только вопрос «как это выглядит», и поэтому будущий разбор бизнеса не заставит
 * править ни строчки в этом файле: он поменяет профиль на входе.
 *
 * Узлы — обычные элементы с текстом, а не рисунок. Читалка их прочтёт, поиск найдёт, клавиатура
 * дойдёт. Живая картинка, которую нельзя прочесть, была бы обманом: система, которая «думает»,
 * обязана уметь сказать, о чём именно.
 */

/** Детерминированное число из строки: композиция обязана быть одинаковой при каждой загрузке. */
function seeded(id: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  return (hash % 1000) / 1000;
}

type Point = { x: number; y: number };

/** Путь связи — слегка изогнутый: прямая между узлами читается как схема, дуга как маршрут. */
function edgePath(from: Point, to: Point): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // Изгиб перпендикулярен связи и пропорционален её длине.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const bend = Math.min(28, length * 0.12);
  const cx = mx + (-dy / length) * bend;
  const cy = my + (dx / length) * bend;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export function EcosystemGraph({ profile = NEUTRAL_PROFILE }: { profile?: BusinessProfile }) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [focused, setFocused] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  // Размер сцены нужен в пикселях: связи рисуются в SVG, и растягивать её неравномерно нельзя —
  // круглые узлы стали бы овальными, а линии разной толщины.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const density = densityFor(size.width || 1);
  const { nodes, edges } = useMemo(() => buildGraph(profile, density), [profile, density]);

  const intent = useEntryIntent();

  const allEdgeIds = useMemo(() => edges.map((edge) => edge.id), [edges]);
  const nodeIds = useMemo(() => nodes.filter((node) => !node.isCore).map((node) => String(node.id)), [nodes]);

  /**
   * Цепочки зависимых маршрутов: путь данных от одного умения через ядро к другому.
   * По ним проходит каскад — так видно сценарий целиком, а не одиночное событие.
   */
  const chains = useMemo(() => {
    const byNode = new Map<string, string[]>();
    for (const edge of edges) {
      for (const end of [edge.from, edge.to]) {
        const list = byNode.get(String(end.id)) ?? [];
        list.push(edge.id);
        byNode.set(String(end.id), list);
      }
    }
    return [...byNode.entries()]
      .filter(([id, list]) => id !== "core" && list.length >= 2)
      .map(([, list]) => list.slice(0, 3));
  }, [edges]);

  const openIds = useMemo(
    () => [...activeEdgeIds(edges, 0)],
    [edges],
  );

  const life = useEcosystemLife({ stageRef, edgeIds: openIds, allEdgeIds, nodeIds, chains });
  const open = useMemo(() => activeEdgeIds(edges, life.phase), [edges, life.phase]);
  const carriers = useMemo(() => carrierEdgeIds(edges, life.phase), [edges, life.phase]);

  // Временно открытые системой маршруты — они существуют лишь на время происшествия.
  const grafted = useMemo(
    () => new Set(life.events.filter((event) => event.kind === "graft").map((event) => event.edgeId)),
    [life.events],
  );
  const sparked = useMemo(
    () => new Set(life.events.filter((event) => event.kind === "spark").map((event) => event.nodeId)),
    [life.events],
  );

  const wanted = useMemo(() => intentNodeIds(intent), [intent]);
  const wantedEdges = useMemo(() => intentEdgeIds(edges, intent), [edges, intent]);

  const highlighted = active ?? focused;
  const near = useMemo(
    () => (highlighted ? neighboursOf(edges, highlighted) : null),
    [edges, highlighted],
  );

  const point = (node: GraphNode): Point => ({ x: node.x * size.width, y: node.y * size.height });

  /**
   * Насколько узел далеко от ядра, 0..1.
   *
   * Из этого числа берётся задержка волны: импульс расходится от центра наружу и доходит до
   * дальних позже, чем до ближних. Вспыхнуть везде одновременно значило бы мигнуть всей сценой —
   * это гирлянда, а не работа системы.
   */
  const maxReach = Math.max(...nodes.map((node) => Math.hypot(node.x - 0.5, node.y - 0.5)), 0.001);
  const reachOf = (node: GraphNode) => Math.hypot(node.x - 0.5, node.y - 0.5) / maxReach;

  /**
   * Когда ядро отправляет комету каждому умению — доля цикла, 0..1.
   *
   * Моменты разложены РОВНО по циклу, а не взяты из хеша. Хеш давал сгустки: восемь умений
   * загорались разом, и это читалось как гирлянда, а не как работа. Сейчас в каждый момент горят
   * два-три, и каждый прилёт виден отдельно.
   *
   * Механическим порядок при этом не выглядит: умения разбросаны по сцене, спицы разной длины и
   * направления, и следующей загорается не соседняя карточка, а та, что стоит в другом углу.
   * Небольшой сдвиг от идентификатора добавляет неровности внутри шага.
   */
  const fireOrder = new Map(
    nodes
      .filter((node) => !node.isCore)
      .map((node, index, all) => [
        String(node.id),
        (index + seeded(String(node.id), 23) * 0.5) / all.length,
      ]),
  );
  const fireOf = (node: GraphNode) => fireOrder.get(String(node.id)) ?? 0;

  // Клавиатура ходит по узлам стрелками, а не табом: восемнадцать остановок на входном экране
  // означали бы, что до кнопки «Открыть сайт» человек добирается двадцатым нажатием.
  const order = nodes.map((node) => String(node.id));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = focused ? order.indexOf(focused) : -1;
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? order.length - 1
          : (current + step + order.length) % order.length;
    setFocused(order[next]);
  };

  const ready = size.width > 0 && size.height > 0;

  return (
    <div
      ref={stageRef}
      className={cn("eco", life.isBreathing && "is-breathing", highlighted && "is-focused")}
      role="group"
      tabIndex={0}
      aria-label={t("eco.aria.scene")}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        if (event.target === event.currentTarget && !focused) setFocused(order[0] ?? null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(null);
      }}
    >
      {ready ? (
        <>
          <svg className="eco-links" width={size.width} height={size.height} aria-hidden="true">
            {edges.map((edge) => {
              const path = edgePath(point(edge.from), point(edge.to));
              const isOpen = open.has(edge.id) || grafted.has(edge.id);
              const isNear = near?.edges.has(edge.id) ?? false;
              return (
                <path
                  key={edge.id}
                  d={path}
                  className={cn(
                    "eco-link",
                    isOpen && "is-open",
                    carriers.has(edge.id) && "is-carrier",
                    grafted.has(edge.id) && "is-graft",
                    wantedEdges.has(edge.id) && "is-wanted",
                    isNear && "is-near",
                  )}
                  style={{ "--w": edge.weight } as CSSProperties}
                />
              );
            })}

            {/* Импульс идёт по той же кривой, что нарисована: он движется по маршруту, а не
                летит поверх него. */}
            {/*
              Волна системы: раз в три секунды импульс проходит от ядра ко всем умениям сразу,
              расходясь наружу. Пути волны нарисованы отдельно от связей и существуют всегда —
              иначе перекладка маршрутов сбивала бы волну и она бы дёргалась.
            */}
            {life.isBreathing
              ? edges
                  .filter((edge) => edge.from.isCore)
                  .flatMap((edge) => {
                    const d = edgePath(point(edge.from), point(edge.to));
                    const reach = reachOf(edge.to);
                    // Три слоя одной кометы: яркая голова и два всё более длинных и тусклых
                    // следа за ней. Одним штрихом хвост не сделать — обводка не умеет затухать
                    // вдоль пути, а накладывать градиент, который не следует за кривой, значит
                    // получить пятно поперёк движения.
                    return (["tail", "mid", "head"] as const).map((part) => (
                      <path
                        key={`flow-${edge.id}-${part}`}
                        className={`eco-comet is-${part}`}
                        // Кому летит: нужно, чтобы прилёт и свечение можно было сверить замером,
                        // а не на глаз — первая комета в разметке принадлежит не тому узлу, и
                        // сравнение «первая попавшаяся против выбранного узла» однажды уже
                        // показало расхождение, которого не было.
                        data-comet={String(edge.to.id)}
                        d={d}
                        pathLength={100}
                        style={
                          {
                            "--reach": reach,
                            "--fire": fireOf(edge.to),
                          } as CSSProperties
                        }
                      />
                    ));
                  })
              : null}

            {life.events.map((event) => {
              if (event.kind !== "pulse") return null;
              const edge = edges.find((item) => item.id === event.edgeId);
              if (!edge) return null;
              return (
                <circle key={event.key} className="eco-pulse" r={2.2}>
                  <animateMotion
                    dur={`${PULSE_DURATION_MS}ms`}
                    begin={`${event.delay}ms`}
                    fill="freeze"
                    path={edgePath(point(edge.from), point(edge.to))}
                  />
                </circle>
              );
            })}
          </svg>

          {nodes.map((node, index) => {
            const capability = node.isCore ? null : CAPABILITY_BY_ID.get(node.id as never);
            const Icon = capability ? CAPABILITY_ICON[capability.id] : null;
            const label = node.isCore
              ? "AEVIX"
              : capability
                ? "key" in capability.label
                  ? t(capability.label.key)
                  : capability.label.literal
                : "";
            const isNear = near?.nodes.has(String(node.id)) ?? false;
            const isSelf = highlighted === String(node.id);

            return (
              <div
                key={node.id}
                className={cn(
                  "eco-node",
                  node.isCore && "is-core",
                  isSelf && "is-self",
                  isNear && "is-near",
                  sparked.has(String(node.id)) && "is-sparked",
                  wanted.has(String(node.id)) && "is-wanted",
                  highlighted && !isSelf && !isNear && "is-dimmed",
                  intent && !node.isCore && !wanted.has(String(node.id)) && "is-aside",
                )}
                style={
                  {
                    left: `${node.x * 100}%`,
                    top: `${node.y * 100}%`,
                    // Вес управляет заметностью: то, чем бизнес не пользуется, становится тише,
                    // но не исчезает.
                    "--w": node.weight,
                    // Глубина: дальнее чуть мельче и спокойнее, ближнее чуть контрастнее.
                    // Разброс мал намеренно — заметная глубина означала бы перебор.
                    "--depth": node.depth,
                    // Момент, в который до узла долетает комета.
                    "--reach": reachOf(node),
                    // Своя фаза мерцания у каждого умения — по всему пятисекундному периоду.
                    "--shimmer": `${(seeded(String(node.id), 11) * 5).toFixed(2)}s`,
                    // Тот же момент вылета, что у летящей к нему кометы: свет и прилёт — одно
                    // событие, а не два совпадения.
                    "--fire": fireOf(node),
                    "--scale": 1.05 - node.depth * 0.13,
                    // У каждого узла свой период и своя фаза. Простые несовпадающие числа — и
                    // сцена не выстраивается в общий такт даже через минуты наблюдения.
                    "--dur": `${9 + seeded(String(node.id), 7) * 8}s`,
                    "--delay": `-${seeded(String(node.id), 13) * 12}s`,
                    "--dx": `${(seeded(String(node.id), 3) - 0.5) * 10}px`,
                    "--dy": `${(seeded(String(node.id), 5) - 0.5) * 8}px`,
                  } as CSSProperties
                }
                data-node={node.id}
                tabIndex={-1}
                ref={(element) => {
                  if (element && focused === String(node.id) && document.activeElement !== element) {
                    element.focus({ preventScroll: true });
                  }
                }}
                onMouseEnter={() => setActive(String(node.id))}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setFocused(String(node.id))}
              >
                <span className="eco-node-face">
                  {Icon ? <Icon className="eco-node-icon" aria-hidden="true" /> : null}
                  <span className="eco-node-title">{label}</span>
                  {/* Крошечный статус — только у опор бизнеса: значок на каждом узле перестал бы
                      что-либо значить. */}
                  {!node.isCore && node.weight >= 0.85 ? (
                    <span className="eco-node-state" aria-hidden="true" />
                  ) : null}
                </span>
                {/* Порядковый номер нужен читалке, чтобы объявить «3 из 15», а не просто список. */}
                <span className="sr-only">{`${index + 1} / ${nodes.length}`}</span>
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

export default EcosystemGraph;
