import type { Project } from "./projects";
import { normalizeProjects } from "./project-schema";

/**
 * The single seam between the app and wherever projects are stored.
 *
 * Everything else goes through `useProjects()`, so swapping the browser for a database means
 * writing one more implementation of `ProjectStore` and pointing the app at it — no page or
 * component changes.
 *
 * The methods are async even though the browser implementation answers instantly. That is the
 * whole point: a server round-trip cannot be made synchronous later, so the callers are written
 * to await from the start. Doing it the other way round would mean touching every caller on the
 * day the database arrives, which is exactly the migration this seam exists to avoid.
 *
 * Тот день настал, и оказалось, что реализация не одна, а две. Вошедший в аккаунт работает с
 * сервером, не вошедший — как и раньше, с браузером: Workspace никогда не требовал регистрации,
 * и требовать её теперь означало бы забрать у людей то, что уже работает. Отсюда `storeFor()`
 * вместо одной константы.
 */

/** Implement this to move projects off the device. See docs/database.md. */
export type ProjectStore = {
  load(): Promise<Project[]>;
  /** `signal` отменяет запрос, если сохранение вытеснено более новым состоянием (защита от
   *  устаревшего ответа, который иначе перезаписал бы актуальное состояние). */
  save(projects: Project[], signal?: AbortSignal): Promise<void>;
  /**
   * Досохранение при уходе со страницы: правка, которая ещё не доехала до хранилища.
   *
   * Отдельный метод, а не `save`, потому что у выгрузки другие правила. Локально запись обязана
   * лечь СИНХРОННО (иначе «правка → мгновенный reload» теряет последнее), а серверу нельзя
   * отправить весь набор: `keepalive`-запрос ограничен по размеру, и на большом наборе он не
   * уходит вовсе. Поэтому обеим реализациям нужен не только `pending`, но и `confirmed` — то,
   * что хранилище уже подтвердило: разница между ними и есть то немногое, что надо довезти.
   */
  flush(pending: Project[], confirmed: Project[]): Promise<void>;
  clear(): Promise<void>;
};

/** Что именно надо довезти: изменённые проекты и id тех, кого человек удалил. */
export type ProjectsDelta = { upsert: Project[]; remove: string[] };

/**
 * Разница между подтверждённым набором и текущим.
 *
 * Сравнение по ССЫЛКЕ, а не по содержимому, и это не экономия на спичках: каждая правка создаёт
 * новый объект проекта (`touch` в projects.tsx), а нетронутые проходят через `map` тем же самым
 * объектом. Сравнение по JSON пришлось бы делать в момент закрытия вкладки — ровно тогда, когда
 * времени на работу меньше всего. Ошибка сравнения по ссылке возможна только в безопасную
 * сторону: незамеченным изменение не останется, максимум уедет лишний проект.
 */
export function projectsDelta(confirmed: Project[], pending: Project[]): ProjectsDelta {
  const before = new Map(confirmed.map((project) => [project.id, project]));
  const kept = new Set(pending.map((project) => project.id));
  return {
    upsert: pending.filter((project) => before.get(project.id) !== project),
    remove: confirmed.filter((project) => !kept.has(project.id)).map((project) => project.id),
  };
}

export function isEmptyDelta(delta: ProjectsDelta): boolean {
  return delta.upsert.length === 0 && delta.remove.length === 0;
}

/**
 * Потолок для `keepalive`-запроса.
 *
 * Спецификация fetch даёт браузеру 64КБ на ВСЕ keepalive-запросы страницы разом; превышение
 * означает не медленную отправку, а отказ. Берём с запасом: на выгрузке рядом может уйти ещё
 * что-нибудь (например, аналитика), и лучше отправить обычным запросом, чем не отправить никак.
 */
const KEEPALIVE_BUDGET_BYTES = 48_000;

function byteLength(body: string): number {
  return new TextEncoder().encode(body).length;
}

const STORAGE_KEY = "aevix.projects";
const STORAGE_VERSION = 1;

type StoredEnvelope = {
  version: number;
  projects: Project[];
};

function parseEnvelope(raw: string): Project[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (typeof parsed !== "object" || parsed === null) return [];
  const envelope = parsed as Partial<StoredEnvelope>;
  if (!Array.isArray(envelope.projects)) return [];
  // No migration path exists yet for older/newer versions — an unexpected version is treated
  // like corrupt data (dropped) rather than risk shape mismatches from a future format.
  if (envelope.version !== STORAGE_VERSION) return [];

  return normalizeProjects(envelope.projects);
}

/** The device-local store: what ships today, and the offline fallback once a server exists. */
export const localProjectStore: ProjectStore = {
  /** Never called during SSR — callers only invoke this from an effect. */
  async load(): Promise<Project[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return parseEnvelope(raw);
    } catch {
      // Storage disabled (private mode, quota, etc.) — fail open with an empty list rather
      // than throw and break the app.
      return [];
    }
  },

  async save(projects: Project[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const envelope: StoredEnvelope = { version: STORAGE_VERSION, projects };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Same fail-open policy as load(): a write failure shouldn't crash the app, it just
      // means this change won't survive a refresh.
    }
  },

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Локально дифф не нужен: `localStorage` синхронен и не ограничен размером запроса, а вот
   * успеть до закрытия документа обязан. Поэтому здесь именно полная запись, и она происходит
   * ДО возврата из функции, а не в промисе — обещание отдаётся уже выполненным.
   */
  async flush(pending: Project[]): Promise<void> {
    if (typeof window === "undefined") return;
    const envelope: StoredEnvelope = { version: STORAGE_VERSION, projects: pending };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Та же политика fail-open, что у save().
    }
  },
};

/**
 * Серверное хранилище: ходит на свои же маршруты, а не в базу напрямую — строка подключения
 * не должна оказаться в браузере.
 *
 * Ошибка чтения возвращает пустой список, но НЕ приводит к записи: провайдер сохраняет только
 * то, что сам изменил, а «загрузилось пусто» изменением не считается. Иначе одна неудачная
 * загрузка стёрла бы человеку все проекты на сервере.
 */
export const serverProjectStore: ProjectStore = {
  async load(): Promise<Project[]> {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить проекты");
    const data = (await response.json()) as { projects?: unknown };
    return normalizeProjects(data.projects);
  },

  async save(projects: Project[], signal?: AbortSignal): Promise<void> {
    const response = await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects }),
      signal,
    });
    if (!response.ok) throw new Error("Не удалось сохранить проекты");
  },

  async clear(): Promise<void> {
    const response = await fetch("/api/projects", { method: "DELETE" });
    if (!response.ok) throw new Error("Не удалось очистить проекты");
  },

  /**
   * Выгрузка отправляет ТОЛЬКО разницу, и отправляет её `PATCH`'ем.
   *
   * Полный набор здесь не проходит по двум причинам сразу. Во-первых, `keepalive` — единственный
   * способ пережить закрытие документа — ограничен по размеру, и набор проектов с концептами
   * упирается в этот потолок молча: запрос не уходит, а человек уверен, что правка сохранена.
   * Во-вторых, полная замена на выгрузке — это ещё и чужая работа: вторая вкладка того же
   * человека успела создать проект, о котором эта не знает, и `PUT` стёр бы его. Дифф трогает
   * ровно то, к чему прикасались здесь.
   */
  async flush(pending: Project[], confirmed: Project[]): Promise<void> {
    const delta = projectsDelta(confirmed, pending);
    if (isEmptyDelta(delta)) return;

    const body = JSON.stringify(delta);
    // Если даже дифф не помещается в потолок — отправляем обычным запросом. Шанс невелик
    // (документ закрывается), но он есть: `pagehide` случается и при переходе в bfcache, откуда
    // страница возвращается живой. Отправить с заведомо превышенным keepalive — гарантированный
    // отказ, то есть потеря без единого шанса.
    const response = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: byteLength(body) <= KEEPALIVE_BUDGET_BYTES,
    });
    if (!response.ok) throw new Error("Не удалось сохранить проекты");
  },
};

/** Хранилище для текущего состояния входа. Единственное место, где делается этот выбор. */
export function storeFor(signedIn: boolean): ProjectStore {
  return signedIn ? serverProjectStore : localProjectStore;
}

/**
 * Reads whatever is on this device, for a one-time hand-off into an account on first sign-in.
 * Without this the day authentication ships is the day everyone's existing work disappears —
 * the migration matters more than the storage swap itself.
 */
export async function readLocalProjectsForMigration(): Promise<Project[]> {
  return localProjectStore.load();
}

/** Убирает локальную копию — вызывается ТОЛЬКО после подтверждённой записи на сервер. */
export async function clearLocalProjectsAfterMigration(): Promise<void> {
  return localProjectStore.clear();
}
