# AEVIX

Премиальный Next.js сайт AEVIX с AI-консультантом для анализа малого бизнеса.

## Установка

```bash
pnpm install
pnpm dev
```

Проект использует Next.js App Router, TypeScript, TailwindCSS, Framer Motion, GSAP, Lenis и официальный OpenAI Node.js SDK.

## Локальный OPENAI_API_KEY

1. Создайте файл `.env.local` в корне проекта.
2. Добавьте ключ:

```bash
OPENAI_API_KEY=sk-...
```

Ключ читается только на сервере через `process.env.OPENAI_API_KEY`. Не добавляйте `.env.local` в git.

## OPENAI_API_KEY в Vercel

1. Откройте проект в Vercel.
2. Перейдите в `Settings` → `Environment Variables`.
3. Добавьте переменную `OPENAI_API_KEY`.
4. Вставьте значение ключа OpenAI.
5. Выберите нужные окружения: `Production`, `Preview`, `Development`.
6. Сохраните переменную и redeploy проекта.

## Проверка AI-консультанта

1. Запустите проект локально.
2. Откройте главную страницу.
3. В окне `AI-демо` введите описание бизнеса, например:

```text
У меня барбершоп, запись клиентов ведется вручную
```

4. Нажмите кнопку отправки или `Enter`.
5. `Shift+Enter` добавляет новую строку.
6. Ответ должен появиться в окне анализа. Кнопка `Обсудить это решение` прокручивает страницу к контактам.

API endpoint:

```text
POST /api/business-analysis
```

Тело запроса:

```json
{
  "message": "У меня барбершоп, запись клиентов ведется вручную"
}
```

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm build
```
