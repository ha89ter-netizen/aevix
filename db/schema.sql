-- AEVIX: аккаунты и проекты.
--
-- Применяется командой `pnpm db:push` (см. scripts/db-push.mjs). Всё пишется через
-- `if not exists`, поэтому повторный запуск безопасен и на пустой, и на рабочей базе.

create table if not exists users (
  id          text primary key,
  -- Всегда в нижнем регистре: почта — это идентификатор входа, и «Ivan@» с «ivan@» обязаны
  -- быть одним человеком, иначе один и тот же адрес заведёт два аккаунта с разными проектами.
  email       text unique not null,
  -- Отображаемое имя. Пусто у аккаунтов, заведённых до регистрации с именем: интерфейс в этом
  -- случае показывает почту, а не пустоту.
  name        text,
  -- scrypt: соль и хеш в одной строке. Пусто у аккаунтов, заведённых до появления паролей —
  -- они входят по коду из письма и задают пароль в настройках.
  password    text,
  created_at  timestamptz not null default now()
);

-- Для баз, созданных до имени и пароля.
alter table users add column if not exists name text;
alter table users add column if not exists password text;

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

-- Одноразовые коды подтверждения для входа по почте.
--
-- Хранится не сам код, а HMAC от пары «почта:код» на ключе AUTH_SECRET. Именно HMAC, а не
-- обычный хеш: у шестизначного кода всего миллион значений, и SHA-256 от него подбирается по
-- дампу базы за секунды. Без серверного ключа такой перебор невозможен.
create table if not exists login_tokens (
  token_hash  text primary key,
  email       text not null,
  expires_at  timestamptz not null,
  -- Проставляется при использовании ИЛИ при исчерпании попыток. Строка не удаляется сразу:
  -- повторная попытка должна получить «код уже использован», а не «такого кода нет».
  used_at     timestamptz,
  -- Счётчик неверных вводов. Шесть цифр перебираются за миллион попыток, поэтому число попыток
  -- на код ограничено — без этого замена ссылки на код была бы ослаблением защиты.
  attempts    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Для баз, созданных до появления кодов.
alter table login_tokens add column if not exists attempts integer not null default 0;

-- Для регулярной уборки просроченных.
create index if not exists login_tokens_expires on login_tokens (expires_at);
