import { Bot, Gauge, Inbox, Layers3, PhoneMissed } from "lucide-react";
import type { EcosystemProcessData } from "./types";

/**
 * The five fixed business processes shown in the "До / После AEVIX" scene. Every position below
 * is a literal, hand-placed constant — never derived from Math.random() or per-frame time. Before
 * positions are a deliberately uneven pentagon (a designed asymmetry, not noise) so the toggle to
 * "after" has somewhere real to tidy up *to*: an evenly-spaced, clean pentagon.
 */
export const ecosystemProcesses: EcosystemProcessData[] = [
  {
    id: "replies",
    icon: Bot,
    title: { before: "Ручные ответы", after: "AI-консультант" },
    caption: { before: "Команда отвечает сама", after: "Отвечает мгновенно в любом канале" },
    description: {
      before:
        "Команда обрабатывает каждый запрос самостоятельно. Во время нагрузки сообщения копятся, клиенты ждут, а часть обращений остаётся без ответа.",
      after:
        "AI-консультант отвечает клиенту сразу в WhatsApp, Telegram или на сайте, уточняет задачу и передаёт сотруднику уже готовое, понятное обращение.",
    },
    highlight: {
      before: "Главный риск: скорость зависит от свободного сотрудника.",
      after: "Команда включается только там, где нужен человек.",
    },
    desktopPosition: {
      before: [-1.34, -1.49, 0.6],
      after: [-1.99, -1.15, 0.3],
    },
    mobilePosition: {
      before: [-4.5, 0.15, 0.35],
      after: [-4.4, 0, 0],
    },
  },
  {
    id: "lostRequests",
    icon: Inbox,
    title: { before: "Потерянные заявки", after: "Единая очередь обращений" },
    caption: { before: "Часть клиентов остаётся без ответа", after: "Ни одно обращение не теряется" },
    description: {
      before:
        "Заявки приходят в разные каналы одновременно — часть теряется между чатами и звонками, а клиент просто уходит к другому.",
      after:
        "Все обращения — из WhatsApp, Telegram, сайта и звонков — попадают в один рабочий поток с понятным статусом каждого.",
    },
    highlight: {
      before: "Главный риск: теряются именно те, кто уже готов купить.",
      after: "Видно, что уже обработано, а что ждёт ответа.",
    },
    desktopPosition: {
      before: [-0.61, -2.63, -0.5],
      after: [0.48, -2.25, -0.3],
    },
    mobilePosition: {
      before: [-2.0, -0.2, -0.3],
      after: [-2.2, 0, 0],
    },
  },
  {
    id: "scatteredSheets",
    icon: Layers3,
    title: { before: "Разрозненные таблицы", after: "Единая CRM" },
    caption: { before: "Информация хранится в разных местах", after: "Все данные в одном месте" },
    description: {
      before:
        "Данные о клиентах и заявках живут в разных таблицах, чатах и блокнотах — сложно понять полную картину без ручной сверки.",
      after: "Каждый клиент, заявка и статус — в одном рабочем контуре, видном всей команде без ручной сверки.",
    },
    highlight: {
      before: "Главный риск: данные расходятся, и решения принимаются вслепую.",
      after: "Одна версия правды вместо десяти файлов.",
    },
    desktopPosition: {
      before: [1.8, 0.13, 0.75],
      after: [2.29, -0.24, 0.3],
    },
    mobilePosition: {
      before: [0.15, 0.1, 0.4],
      after: [0, 0, 0],
    },
  },
  {
    id: "missedCalls",
    icon: PhoneMissed,
    title: { before: "Пропущенные звонки", after: "Автоматические сценарии" },
    caption: { before: "Клиент не дозвонился и ушёл к другому", after: "Система сама ведёт клиента дальше" },
    description: {
      before:
        "Звонок поступает, когда все заняты, — клиент не дозванивается и обращается к конкуренту, а бизнес даже не узнаёт об обращении.",
      after:
        "Пропущенный звонок автоматически запускает сценарий: обратный контакт, ссылка на запись или ответ в мессенджере — обращение не остаётся без реакции.",
    },
    highlight: {
      before: "Главный риск: часть спроса теряется незаметно.",
      after: "Ни один звонок не остаётся без последствия.",
    },
    desktopPosition: {
      before: [1.6, 1.98, -0.65],
      after: [0.94, 2.1, -0.3],
    },
    mobilePosition: {
      before: [2.35, -0.15, -0.35],
      after: [2.2, 0, 0],
    },
  },
  {
    id: "noControl",
    icon: Gauge,
    title: { before: "Отсутствие контроля", after: "Понятная аналитика" },
    caption: { before: "Никто не видит общую картину", after: "Видно всю картину бизнеса" },
    description: {
      before:
        "Владелец не видит, сколько обращений приходит, сколько теряется и на чём держится процесс — решения принимаются на глаз.",
      after: "Владелец видит поток обращений, узкие места и результат работы команды в одном понятном обзоре.",
    },
    highlight: {
      before: "Главный риск: проблема заметна только после того, как клиенты уже ушли.",
      after: "Решения принимаются на основе данных, а не ощущений.",
    },
    desktopPosition: {
      before: [-2.02, 0.74, 0.5],
      after: [-1.71, 1.54, 0.3],
    },
    mobilePosition: {
      before: [4.25, 0.2, 0.3],
      after: [4.4, 0, 0],
    },
  },
];
