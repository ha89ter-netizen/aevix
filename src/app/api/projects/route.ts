import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { normalizeProjects } from "@/lib/project-schema";
import type { Project } from "@/lib/projects";

export const runtime = "nodejs";

/** Один проект — несколько килобайт. Мегабайт на весь набор — потолок с большим запасом,
 * который при этом не даст превратить аккаунт в файлохранилище. */
const MAX_BODY_BYTES = 1_000_000;
const MAX_PROJECTS = 200;

function unauthorized() {
  return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
}

function unavailable() {
  return NextResponse.json({ error: "Хранилище недоступно." }, { status: 503 });
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return unavailable();
  const user = currentUser(request);
  if (!user) return unauthorized();

  try {
    const rows = (await db()`
      select data from projects where user_id = ${user.id} order by updated_at desc
    `) as Array<{ data: Project }>;
    return NextResponse.json({ projects: rows.map((row) => row.data) });
  } catch (error) {
    console.error("[projects] Чтение не удалось", error);
    return NextResponse.json({ error: "Не удалось загрузить проекты." }, { status: 500 });
  }
}

/**
 * Полная замена набора проектов пользователя.
 *
 * PUT, а не PATCH по одному проекту, потому что клиент и держит в состоянии весь набор целиком:
 * так у сервера не может остаться проекта, который человек уже удалил у себя.
 */
export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) return unavailable();
  const user = currentUser(request);
  if (!user) return unauthorized();

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Слишком большой объём данных." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  }

  // Нормализуем присланное вместо того, чтобы верить клиенту: он может прислать что угодно,
  // а форму проекта мы знаем сами.
  const projects = normalizeProjects((body as { projects?: unknown })?.projects).slice(0, MAX_PROJECTS);

  try {
    const sql = db();
    const ids = projects.map((project) => project.id);

    // Одной транзакцией, иначе между удалением и вставкой существует момент, в который у
    // человека нет проектов вообще — и именно в него может прийти чтение с другой вкладки.
    const results = await sql.transaction((tx) => [
      ids.length
        ? tx`delete from projects where user_id = ${user.id} and id <> all(${ids})`
        : tx`delete from projects where user_id = ${user.id}`,
      ...projects.map(
        (project) => tx`
          insert into projects (id, user_id, data, updated_at)
          values (${project.id}, ${user.id}, ${JSON.stringify(project)}::jsonb, now())
          on conflict (id) do update
            set data = excluded.data, updated_at = now()
            -- Проверка владельца: если проект с таким id уже принадлежит другому человеку,
            -- условие не выполняется и запись просто не происходит. Без него подобранным id
            -- можно было бы перезаписать чужой проект.
            where projects.user_id = ${user.id}
          returning id
        `,
      ),
    ]);

    // Считаем то, что действительно записалось, а не то, что прислали. Расхождение означает,
    // что id уже занят другим аккаунтом и запись отбита проверкой владельца выше. Случай
    // практически невозможный (id — UUID), но ответить на него «сохранено» было бы враньём:
    // человек продолжил бы работать над проектом, который не сохраняется.
    const written = results.slice(1).reduce((total, rows) => total + (rows as unknown[]).length, 0);
    if (written < projects.length) {
      console.error(`[projects] Записано ${written} из ${projects.length}: часть id принадлежит другому аккаунту`);
      return NextResponse.json(
        { error: "Часть проектов не удалось сохранить.", saved: written },
        { status: 409 },
      );
    }

    return NextResponse.json({ saved: written });
  } catch (error) {
    console.error("[projects] Запись не удалась", error);
    return NextResponse.json({ error: "Не удалось сохранить проекты." }, { status: 500 });
  }
}

/**
 * Частичное обновление: довезти изменённое, не трогая остального.
 *
 * Нужен ровно одному вызывающему — досохранению при закрытии вкладки. Там нельзя отправить весь
 * набор: `keepalive`-запрос ограничен по размеру, и на большом наборе он молча не уходит. Дифф
 * помещается всегда, когда правка одна, а правка при закрытии вкладки почти всегда одна.
 *
 * PUT при этом остаётся главным путём и не заменяется на PATCH: полная замена — единственное,
 * что гарантирует, что на сервере не останется проекта, удалённого у человека. PATCH называет
 * удаление явным списком `remove`, поэтому и он ничего не теряет, — но доверять «клиент
 * перечислил всё, что удалил» можно только там, где клиент только что это и сделал.
 */
export async function PATCH(request: Request) {
  if (!isDatabaseConfigured()) return unavailable();
  const user = currentUser(request);
  if (!user) return unauthorized();

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Слишком большой объём данных." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  }

  const payload = (body ?? {}) as { upsert?: unknown; remove?: unknown };
  const upsert = normalizeProjects(payload.upsert).slice(0, MAX_PROJECTS);
  const remove = Array.isArray(payload.remove)
    ? payload.remove.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, MAX_PROJECTS)
    : [];

  // Пустой дифф — не ошибка: вкладка закрылась, когда всё уже сохранено.
  if (!upsert.length && !remove.length) return NextResponse.json({ saved: 0, removed: 0 });

  try {
    const sql = db();
    const upsertIds = upsert.map((project) => project.id);
    const touched = [...new Set([...upsertIds, ...remove])];

    // Потолок на размер аккаунта живёт и здесь: иначе частичный путь стал бы дырой в нём.
    // Считаем то, чего этот запрос не касается, и прибавляем то, что он добавит.
    const [untouched] = (await sql`
      select count(*)::int as total from projects where user_id = ${user.id} and id <> all(${touched})
    `) as Array<{ total: number }>;
    if ((untouched?.total ?? 0) + upsert.length > MAX_PROJECTS) {
      return NextResponse.json({ error: "Слишком много проектов." }, { status: 413 });
    }

    // Одной транзакцией: удаление и запись — одно изменение набора, а не два состояния,
    // между которыми может прийти чтение с другой вкладки.
    const results = await sql.transaction((tx) => [
      remove.length
        ? tx`delete from projects where user_id = ${user.id} and id = any(${remove})`
        : tx`select 1 where false`,
      ...upsert.map(
        (project) => tx`
          insert into projects (id, user_id, data, updated_at)
          values (${project.id}, ${user.id}, ${JSON.stringify(project)}::jsonb, now())
          on conflict (id) do update
            set data = excluded.data, updated_at = now()
            -- Та же проверка владельца, что и в PUT: подобранным id нельзя переписать чужой проект.
            where projects.user_id = ${user.id}
          returning id
        `,
      ),
    ]);

    const written = results.slice(1).reduce((total, rows) => total + (rows as unknown[]).length, 0);
    if (written < upsert.length) {
      console.error(`[projects] PATCH записал ${written} из ${upsert.length}: часть id принадлежит другому аккаунту`);
      return NextResponse.json(
        { error: "Часть проектов не удалось сохранить.", saved: written },
        { status: 409 },
      );
    }

    return NextResponse.json({ saved: written, removed: remove.length });
  } catch (error) {
    console.error("[projects] Частичная запись не удалась", error);
    return NextResponse.json({ error: "Не удалось сохранить проекты." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isDatabaseConfigured()) return unavailable();
  const user = currentUser(request);
  if (!user) return unauthorized();

  try {
    await db()`delete from projects where user_id = ${user.id}`;
    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("[projects] Очистка не удалась", error);
    return NextResponse.json({ error: "Не удалось очистить проекты." }, { status: 500 });
  }
}
