-- AEVIX: аккаунты и проекты.
--
-- Применяется командой `pnpm db:push` (см. scripts/db-push.mjs). Всё пишется через
-- `if not exists`, поэтому повторный запуск безопасен и на пустой, и на рабочей базе.

create table if not exists users (
  id          text primary key,
  -- Всегда в нижнем регистре: почта — это идентификатор входа, и «Ivan@» с «ivan@» обязаны
  -- быть одним человеком, иначе один и тот же адрес заведёт два аккаунта с разными проектами.
  email       text unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists projects (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  -- Весь проект одним JSON: структура описана типом Project в коде и меняется от этапа к этапу.
  -- Раскладывать её по колонкам сейчас — значит переписывать схему при каждой правке модели.
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Список проектов всегда запрашивается по пользователю и сортируется по дате изменения.
create index if not exists projects_user_updated on projects (user_id, updated_at desc);

-- Одноразовые ссылки для входа по почте.
--
-- Хранится не сам токен, а его SHA-256: у того, кто получит дамп базы, не должно оказаться
-- набора действующих ссылок для входа в чужие аккаунты. При проверке хешируется предъявленный
-- токен и сравнивается с этим значением — так же, как поступают с паролями.
create table if not exists login_tokens (
  token_hash  text primary key,
  email       text not null,
  expires_at  timestamptz not null,
  -- Проставляется при первом использовании. Строка не удаляется сразу: повторный переход по
  -- той же ссылке должен отвечать «ссылка уже использована», а не «ссылки не существует».
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Для регулярной уборки просроченных.
create index if not exists login_tokens_expires on login_tokens (expires_at);
