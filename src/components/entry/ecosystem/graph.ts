import { CAPABILITIES, CAPABILITY_LINKS, type CapabilityId } from "./capabilities";
import { weightOf, type BusinessProfile } from "./profiles";

/**
 * Логика графа: кто на сцене, где стоит и что с чем связано.
 *
 * Ни одной ссылки на React, DOM и анимацию — это чистые вычисления. Такое разделение нужно не
 * ради красоты: слой отрисовки менять дороже всего, а перестройка под конкретный бизнес будет
 * происходить именно здесь. Когда придёт разбор, изменится профиль на входе — и всё.
 *
 * Раскладка задана вручную, а не случайными числами и не силовым алгоритмом. Случайность дала бы
 * разную картинку на каждой загрузке, то есть систему, которая не помнит себя; силовой алгоритм
 * — вечное подрагивание и невозможность предсказать, где окажется подпись. Композиция здесь
 * такая же, как у чертежа: осознанная и повторяемая.
 */

export type Density = "compact" | "regular" | "full";

export type GraphNode = {
  id: CapabilityId | "core";
  /** Доля ширины и высоты сцены, 0..1. Пиксели считает уже слой отрисовки. */
  x: number;
  y: number;
  /** 0..1 — насколько эта возможность важна текущему бизнесу. */
  weight: number;
  /** 0 — ближе всего к зрителю, 1 — дальше всего. Композиционная глубина, не перспектива. */
  depth: number;
  isCore: boolean;
};

export type GraphEdge = {
  id: string;
  from: GraphNode;
  to: GraphNode;
  /** Средний вес концов: система ведёт данные в первую очередь по важному. */
  weight: number;
};

/**
 * Сколько возможностей помещается, чтобы подписи оставались читаемыми.
 *
 * Не «спрятать лишнее», а показать столько, сколько на этой ширине можно прочесть. Панорама на
 * телефоне физически не вмещает четырнадцать подписей — четырнадцать нечитаемых прямоугольников
 * там были бы не богатством, а шумом.
 */
export const DENSITY_COUNT: Record<Density, number> = { compact: 4, regular: 9, full: 14 };

/**
 * Пороги считаются по ширине САМОЙ СЦЕНЫ, а не окна.
 *
 * На планшете сцена шире, чем на десктопе: там она занимает всю строку, здесь делит её с
 * текстом. Пороги по окну дали бы телефону густоту планшета и наоборот.
 */
export function densityFor(width: number): Density {
  if (width < 460) return "compact";
  if (width < 620) return "regular";
  return "full";
}

/**
 * Композиция — таблица координат, а не формула.
 *
 * Кольцо с ровным шагом читается как циферблат, а любая формула — как схема, нарисованная
 * дизайнером: мозг мгновенно узнаёт правило и перестаёт видеть систему. Здесь места расставлены
 * руками и намеренно неровно — плотнее слева вверху, разреженнее справа внизу, с парой
 * одиночек. Симметрии нет ни по одной оси, расстояния между соседями разные.
 *
 * Зазор при этом посчитан под ширину подписи: между любыми двумя местами либо больше 0.2 ширины
 * сцены по горизонтали, либо больше 0.07 высоты по вертикали. Крайние места отодвинуты от границ
 * на 0.13 — узел стоит серединой на своей точке, а самая длинная подпись занимает около десятой
 * доли ширины в каждую сторону.
 *
 * `depth` — глубина, 0 ближе всего, 1 дальше всего. Она не про 3D и не про перспективу: дальнее
 * чуть мельче и спокойнее, ближнее чуть контрастнее. Разброс намеренно мал — если глубину можно
 * заметить и назвать, её уже слишком много.
 */
type Place = { x: number; y: number; depth: number };

const LAYOUT: Record<Density, Place[]> = {
  full: [
    { x: 0.17, y: 0.13, depth: 0.55 },
    { x: 0.43, y: 0.09, depth: 0.85 },
    { x: 0.7, y: 0.16, depth: 0.45 },
    { x: 0.86, y: 0.28, depth: 0.9 },
    { x: 0.15, y: 0.31, depth: 0.3 },
    { x: 0.39, y: 0.27, depth: 0.65 },
    { x: 0.65, y: 0.3, depth: 0.15 },
    { x: 0.19, y: 0.53, depth: 0.7 },
    { x: 0.83, y: 0.5, depth: 0.6 },
    { x: 0.34, y: 0.67, depth: 0.2 },
    { x: 0.63, y: 0.71, depth: 0.5 },
    { x: 0.14, y: 0.79, depth: 0.9 },
    { x: 0.45, y: 0.89, depth: 0.4 },
    { x: 0.79, y: 0.86, depth: 0.75 },
  ],
  regular: [
    { x: 0.18, y: 0.14, depth: 0.5 },
    { x: 0.5, y: 0.1, depth: 0.8 },
    { x: 0.82, y: 0.2, depth: 0.35 },
    { x: 0.33, y: 0.31, depth: 0.2 },
    { x: 0.14, y: 0.45, depth: 0.7 },
    { x: 0.86, y: 0.51, depth: 0.55 },
    { x: 0.21, y: 0.72, depth: 0.3 },
    { x: 0.52, y: 0.87, depth: 0.85 },
    { x: 0.81, y: 0.77, depth: 0.45 },
  ],
  // Панорама на телефоне: два ряда по два и ядро между ними. Пять подписей в строку там
  // физически не помещаются — вышли бы обрезки вместо слов.
  compact: [
    { x: 0.17, y: 0.23, depth: 0.35 },
    { x: 0.83, y: 0.26, depth: 0.7 },
    { x: 0.18, y: 0.77, depth: 0.6 },
    { x: 0.82, y: 0.74, depth: 0.25 },
  ],
};

/**
 * Собирает сцену: берёт самые весомые возможности профиля и расставляет их по композиции.
 *
 * Порядок отбора — по весу, поэтому смена профиля меняет не только яркость, но и состав того,
 * что видно на узкой сцене. Порядок среди равных весов остаётся стабильным (каталог), чтобы
 * картинка не прыгала между загрузками.
 */
export function buildGraph(profile: BusinessProfile, density: Density): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Ядро всегда ближе всех: оно и есть то, к чему возвращается взгляд.
  const core: GraphNode = { id: "core", x: 0.5, y: 0.5, weight: 1, depth: 0, isCore: true };

  const ranked = [...CAPABILITIES]
    .map((capability, index) => ({ capability, weight: weightOf(profile, capability.id), index }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .slice(0, DENSITY_COUNT[density]);

  const layout = LAYOUT[density];
  const nodes: GraphNode[] = ranked.map(({ capability, weight }, position) => {
    const place = layout[position] ?? { x: 0.5, y: 0.5, depth: 0.5 };
    return { id: capability.id, x: place.x, y: place.y, weight, depth: place.depth, isCore: false };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));

  // Ядро связано со всем, что на сцене: оно и есть то, что держит остальное вместе.
  const edges: GraphEdge[] = nodes.map((node) => ({
    id: `core-${node.id}`,
    from: core,
    to: node,
    weight: (1 + node.weight) / 2,
  }));

  // И осмысленные пары между возможностями — только те, у которых оба конца на сцене.
  for (const [a, b] of CAPABILITY_LINKS) {
    const from = byId.get(a);
    const to = byId.get(b);
    if (from && to) edges.push({ id: `${a}-${b}`, from, to, weight: (from.weight + to.weight) / 2 });
  }

  return { nodes: [core, ...nodes], edges };
}

/**
 * Какие связи система держит открытыми прямо сейчас.
 *
 * Открыты не все и не случайные: чем важнее концы, тем чаще путь востребован. `phase` медленно
 * растёт, и набор меняется — это и есть «информация выбирает путь». Функция чистая, поэтому
 * одна и та же фаза всегда даёт один и тот же набор: сцена не дёргается при перерисовке.
 */
export function activeEdgeIds(edges: GraphEdge[], phase: number): Set<string> {
  const share = 0.55;
  const scored = edges.map((edge, index) => {
    // Каждая связь дышит со своим периодом — простые множители не дают им совпасть и
    // выстроиться в общий такт.
    const own = Math.sin(phase / (5 + (index % 7)) + index * 1.7);
    return { id: edge.id, score: own * 0.5 + edge.weight };
  });
  const keep = Math.max(3, Math.round(edges.length * share));
  scored.sort((a, b) => b.score - a.score);
  return new Set(scored.slice(0, keep).map((item) => item.id));
}

/**
 * Несущие маршруты — те немногие, по которым система ведёт основной поток прямо сейчас.
 *
 * Их всего пара из всех открытых, и держатся они недолго: остальные остаются спокойными. Поднять
 * яркость у всех связей значило бы осветлить сцену целиком и потерять тишину; выделить пару —
 * значит показать, что у системы есть текущее направление работы.
 */
export function carrierEdgeIds(edges: GraphEdge[], phase: number): Set<string> {
  const open = activeEdgeIds(edges, phase);
  const candidates = edges.filter((edge) => open.has(edge.id));
  if (!candidates.length) return new Set();
  const scored = candidates.map((edge, index) => ({
    id: edge.id,
    // Своя, более длинная волна: несущие меняются реже, чем открытые.
    score: Math.sin(phase / 11 + index * 2.3) * 0.6 + edge.weight,
  }));
  scored.sort((a, b) => b.score - a.score);
  return new Set(scored.slice(0, Math.max(1, Math.round(candidates.length * 0.12))).map((item) => item.id));
}

/**
 * Намерение человека, прочитанное с левой половины экрана.
 *
 * Это не эффект и не подсветка «по кнопке»: система получает СМЫСЛ действия и отвечает тем, что
 * у неё для этого смысла есть. Поэтому граф ничего не знает ни о кнопках, ни о вёрстке героя —
 * он знает только, что человек сейчас думает про витрину или про своё рабочее место.
 */
export type SceneIntent = "explore" | "account";

const INTENT_FOCUS: Record<SceneIntent, CapabilityId[]> = {
  // «Открыть сайт» — это про то, как бизнес показывает себя миру.
  explore: ["website", "marketing", "reviews", "analytics", "payments"],
  // «Войти / Регистрация» — про своё рабочее место: клиенты, знания, расписание.
  account: ["crm", "knowledge", "calendar", "support", "automation"],
};

export function intentNodeIds(intent: SceneIntent | null): Set<string> {
  return new Set(intent ? INTENT_FOCUS[intent] : []);
}

/** Маршруты между теми, кого касается намерение: оживают связи, а не отдельные точки. */
export function intentEdgeIds(edges: GraphEdge[], intent: SceneIntent | null): Set<string> {
  if (!intent) return new Set();
  const focus = intentNodeIds(intent);
  return new Set(
    edges
      .filter((edge) => focus.has(String(edge.from.id)) && focus.has(String(edge.to.id)))
      .concat(edges.filter((edge) => edge.from.isCore && focus.has(String(edge.to.id))))
      .map((edge) => edge.id),
  );
}

/** Соседи узла — для подсветки при наведении и с клавиатуры. */
export function neighboursOf(edges: GraphEdge[], id: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const touched = new Set<string>();
  for (const edge of edges) {
    if (edge.from.id === id) {
      nodes.add(String(edge.to.id));
      touched.add(edge.id);
    } else if (edge.to.id === id) {
      nodes.add(String(edge.from.id));
      touched.add(edge.id);
    }
  }
  return { nodes, edges: touched };
}
