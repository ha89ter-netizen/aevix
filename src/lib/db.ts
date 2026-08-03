import { neon } from "@neondatabase/serverless";

/**
 * Единственная точка доступа к базе. Только для серверного кода — строка подключения содержит
 * пароль и в браузер попадать не должна.
 *
 * Драйвер Neon ходит по HTTP, а не держит TCP-соединение. Для Vercel это принципиально:
 * функция живёт доли секунды, обычный пул соединений не успевает окупиться и упирается в лимит
 * подключений Postgres при всплеске трафика.
 *
 * Клиент создаётся лениво и переиспользуется. Создавать его на уровне модуля нельзя: файл
 * импортируется и во время сборки, где DATABASE_URL может быть не задан, и падение сборки из-за
 * отсутствующей переменной окружения — не то поведение, которого мы хотим.
 */

type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;

/** Настроена ли база вообще. Позволяет маршрутам ответить честным 503, а не упасть с 500. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Sql {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL не задан — база не настроена. См. docs/database.md.");
  }
  client = neon(url);
  return client;
}
