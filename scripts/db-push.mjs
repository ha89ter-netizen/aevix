/**
 * Применяет db/schema.sql к базе из DATABASE_URL.
 *
 * Отдельным скриптом, а не «на первом запросе к приложению»: создание таблиц — операция уровня
 * развёртывания, и ей не место в горячем пути маршрута, где она выполнялась бы при каждом
 * холодном старте функции.
 *
 * Запуск: pnpm db:push
 */
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не задан. Строка подключения к Neon должна лежать в .env.local.");
  process.exit(1);
}

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const sql = neon(url);

// Neon HTTP выполняет по одному выражению за раз, поэтому файл разбивается на выражения.
// Разделитель — точка с запятой в конце строки; этого достаточно, пока в схеме нет функций
// с телом в $$ ... $$ (появятся — понадобится разбор поумнее, и это станет заметно сразу).
const statements = schema
  .split(/;\s*$/m)
  .map((statement) => statement.trim())
  .filter((statement) => statement && !statement.split("\n").every((line) => line.trim().startsWith("--")));

for (const statement of statements) {
  const title = statement.split("\n").find((line) => line.trim() && !line.trim().startsWith("--")) ?? statement;
  try {
    await sql.query(statement);
    console.log("  ✓", title.trim().slice(0, 70));
  } catch (error) {
    console.error("  ✗", title.trim().slice(0, 70), "\n   ", error.message);
    process.exit(1);
  }
}

console.log(`Схема применена: ${statements.length} выражений.`);
