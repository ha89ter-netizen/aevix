"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Car,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Command,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Loader2,
  Scissors,
  ShoppingBag,
  Sparkle,
  Stethoscope,
  Store,
  Layers3,
  Mail,
  Menu,
  MessageCircle,
  Play,
  Repeat2,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumModal } from "@/components/ui/premium-modal";
import { WebsiteConceptExperience } from "@/components/website-concept-experience";
import { EcosystemSceneLoader } from "@/components/ecosystem-scene/EcosystemSceneLoader";
import type { EcosystemDevice } from "@/components/ecosystem-scene/EcosystemScene";
import { EcosystemArrows, EcosystemDial, useEcosystemGestureNav } from "@/components/ecosystem-scene/EcosystemNav";
import { ecosystemProcesses } from "@/components/ecosystem-scene/data";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  getBusinessContent,
  heroPlaceholderExamples,
  type BusinessContent,
  type HeroBusinessCategory,
  type HeroBusinessProfile,
} from "@/lib/hero-analysis";
import { ANALYSIS_SEQUENCE, useBusiness } from "@/lib/business-context";
import {
  AEVIX_PRODUCTS,
  FIRST_PROJECT_DISCOUNT,
  PRODUCT_BY_ID,
  PRODUCT_KIND_LABEL,
  SUPPORT_POLICY,
  absorbedByScope,
  recommendCapabilities,
  withDependencies,
  type AevixProduct,
} from "@/lib/aevix-products";
import { resolveNiche } from "@/lib/niche";
import { motionTransition } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

type IconComponent = typeof Bot;

type Module = {
  id: string;
  icon: IconComponent;
  title: string;
  metric: string;
  intro: string;
  what: string[];
  channels: string[];
  prompt: string;
  answer: string;
  scenario: string[];
  result: string;
};

type AiMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
};

export type AnalysisResult = {
  shortAnswer: string;
  reasons: string[];
  recommendedSolution: string;
  summary: string;
  problems: string[];
  recommendations: string[];
  flow: string[];
  callToAction: string;
};

export type ServiceId = "ai" | "telegram" | "whatsapp" | "site" | "crm" | "automation" | "nfc";
export type BusinessType = "Барбершоп" | "Салон красоты" | "Магазин" | "Кофейня / ресторан" | "Локальная сеть" | "Другое";
export type BranchCount = "1" | "2–5" | "6–10" | "больше 10";

export type EstimateForm = {
  /** Свободная строка: пресеты — из businessTypeOptions, но контекст с лендинга может задать
   *  распознанную нишу (например «Агентство недвижимости»), которой нет среди 6 пресетов. */
  businessType: string;
  selectedServices: ServiceId[];
  branchCount: BranchCount;
  manualWork: string;
  currentServices: string;
  contactName: string;
  contactHandle: string;
  contactEmail: string;
};

export type EstimateResult = {
  summary: string;
  recommendedModules: string[];
  estimatedRange: string;
  implementationSteps: string[];
  risks: string[];
  callToAction: string;
};

export const contacts = {
  whatsapp: {
    label: "WhatsApp",
    value: "+7 707 500 6022",
    href: "https://wa.me/77075006022",
  },
  telegram: {
    label: "Telegram",
    value: "@ksalnww47",
    href: "https://t.me/ksalnww47",
  },
  email: {
    label: "Email",
    value: "ha89ter@gmail.com",
    href: "mailto:ha89ter@gmail.com",
  },
};

const businessTypeOptions: BusinessType[] = [
  "Барбершоп",
  "Салон красоты",
  "Магазин",
  "Кофейня / ресторан",
  "Локальная сеть",
  "Другое",
];

const branchOptions: BranchCount[] = ["1", "2–5", "6–10", "больше 10"];

// Иконки — единственное, что остаётся в презентационном слое. Всё остальное (title / description /
// price / kind / семантика цены) приходит из КАНОНИЧЕСКОЙ модели услуг (aevix-products.ts): один
// источник истины, без дублирования копий описаний и цен по компонентам (этап 7, Wave 4).
const serviceIcons: Record<ServiceId, IconComponent> = {
  ai: Bot,
  site: Globe2,
  telegram: Send,
  whatsapp: MessageCircle,
  crm: Layers3,
  automation: Workflow,
  nfc: CreditCard,
};

const serviceCatalog: Array<Omit<AevixProduct, "id"> & { id: ServiceId; icon: IconComponent }> =
  AEVIX_PRODUCTS.map((product) => ({
    ...product,
    id: product.id as ServiceId,
    icon: serviceIcons[product.id as ServiceId],
  }));

/** Честная подпись к цене: разное для «от / включено / по составу / бонус» — клиент не гадает. */
function priceLabel(product: { price: number; priceModel: string; priceNote: string }): string {
  if (product.priceModel === "included") return "Включено";
  if (product.priceModel === "bonus") return "Бонус";
  if (product.priceModel === "custom") return "По составу проекта";
  if (product.priceModel === "fixed") return formatKzt(product.price);
  return `от ${formatKzt(product.price)}`;
}

/** Границы политики сопровождения одной подсказкой — честно про что входит и что нет. */
const SUPPORT_SCOPE_TITLE = `Входит: ${SUPPORT_POLICY.includes.join(", ")}. Не входит: ${SUPPORT_POLICY.excludes.join(", ")}.`;

const initialEstimateForm: EstimateForm = {
  businessType: "Барбершоп",
  // Начинаем с ядра (AI-консультант). Каналы (Telegram включён, WhatsApp +50k) добавляются поверх —
  // выбор канала явно доопределяет ядро, а не заменяет его.
  selectedServices: ["ai"],
  branchCount: "1",
  manualWork: "",
  currentServices: "",
  contactName: "",
  contactHandle: "",
  contactEmail: "",
};

const modules: Module[] = [
  {
    id: "assistant",
    icon: Bot,
    title: "AI-консультант",
    metric: "Первичный диалог без постоянного участия команды",
    intro: "Отвечает клиенту, уточняет задачу и передает сотруднику уже понятное обращение.",
    what: [
      "Отвечает в Telegram и WhatsApp.",
      "Знает услуги, цены и правила записи.",
      "Принимает данные клиента.",
      "Передает сложный вопрос человеку.",
    ],
    channels: ["Telegram", "WhatsApp", "Сайт", "CRM"],
    prompt: "Клиент спрашивает, какая услуга ему подойдет",
    answer: "AI уточняет задачу, предлагает понятный вариант и передает обращение сотруднику.",
    scenario: [
      "Определяет намерение клиента и нужную услугу.",
      "Задает уточняющий вопрос простым языком.",
      "Фиксирует обращение и передает контекст сотруднику.",
    ],
    result: "Сотрудник подключается только там, где действительно нужен человек.",
  },
  {
    id: "booking",
    icon: Clock3,
    title: "Запись и заявки",
    metric: "Входящие обращения собираются в единый поток",
    intro: "Помогает клиенту выбрать услугу, время и удобный канал связи без длинной переписки.",
    what: [
      "Собирает имя, услугу и контакты.",
      "Показывает доступные варианты записи.",
      "Передает заявку в рабочий контур.",
      "Готовит подтверждение для клиента.",
    ],
    channels: ["Сайт", "Telegram", "WhatsApp", "CRM"],
    prompt: "Клиент хочет записаться, но не знает свободное время",
    answer: "Система уточняет услугу, предлагает доступное окно и сохраняет заявку.",
    scenario: [
      "Клиент пишет в удобный канал.",
      "AEVIX уточняет услугу и желаемое время.",
      "Заявка попадает в единый список для команды.",
    ],
    result: "Администратору проще контролировать поток обращений без ручного переноса данных.",
  },
  {
    id: "automation",
    icon: Workflow,
    title: "Автоматизация",
    metric: "Повторяющиеся действия выполняются автоматически",
    intro: "Убирает ручные шаги, которые каждый день повторяются одинаково.",
    what: [
      "Назначает следующий статус.",
      "Запускает напоминание.",
      "Создает задачу для сотрудника.",
      "Подсвечивает незавершенные действия.",
    ],
    channels: ["CRM", "Telegram", "Email", "Внутренний dashboard"],
    prompt: "Новая заявка без статуса и ответственного",
    answer: "AEVIX ставит следующий шаг, назначает ответственного и показывает владельцу отклонение.",
    scenario: [
      "Находит незакрытый шаг в процессе.",
      "Назначает понятное действие.",
      "Показывает владельцу только то, что требует внимания.",
    ],
    result: "Команда меньше держит процесс в голове и работает по ясному сценарию.",
  },
  {
    id: "site",
    icon: Globe2,
    title: "Сайт",
    metric: "Сайт становится рабочей точкой входа",
    intro: "Не просто витрина, а место, где клиент может понять услугу и оставить понятную заявку.",
    what: [
      "Объясняет услуги простым языком.",
      "Ведет к записи или заявке.",
      "Подключает AI-консультанта.",
      "Передает обращения в рабочий процесс.",
    ],
    channels: ["Сайт", "Форма", "AI-виджет", "Аналитика"],
    prompt: "Посетитель сайта не знает, с чего начать",
    answer: "Сайт объясняет варианты и предлагает оставить заявку или пройти AI-разбор.",
    scenario: [
      "Посетитель быстро понимает предложение.",
      "Выбирает услугу или задает вопрос.",
      "Заявка сохраняется с нужным контекстом.",
    ],
    result: "Сайт помогает начать диалог, а не просто показывает информацию.",
  },
  {
    id: "crm",
    icon: Layers3,
    title: "CRM",
    metric: "Заявки, статусы и история видны в одном месте",
    intro: "Связывает обращения, сотрудников и этапы работы в понятную операционную картину.",
    what: [
      "Сохраняет обращения и статусы.",
      "Показывает, где застряла заявка.",
      "Передает контекст между сотрудниками.",
      "Помогает владельцу видеть слабые места процесса.",
    ],
    channels: ["CRM", "Dashboard", "Telegram", "Email"],
    prompt: "Данные лежат в чатах, таблицах и личных заметках",
    answer: "AEVIX собирает обращения и статусы в одном рабочем контуре.",
    scenario: [
      "Заявка получает статус.",
      "Команда видит ответственного.",
      "Владелец понимает, где нужен контроль.",
    ],
    result: "Меньше ручного поиска информации и больше прозрачности в ежедневной работе.",
  },
  {
    id: "reminders",
    icon: Repeat2,
    title: "Напоминания",
    metric: "Клиенты получают понятные сообщения вовремя",
    intro: "Напоминает о записи, оплате, визите или следующем шаге без постоянного ручного контроля.",
    what: [
      "Отправляет подтверждение.",
      "Напоминает о визите.",
      "Возвращает к незавершенному действию.",
      "Фиксирует результат отправки.",
    ],
    channels: ["WhatsApp", "Telegram", "Email", "CRM"],
    prompt: "Клиент записался, но подтверждение отправляют вручную",
    answer: "Система отправляет понятное сообщение и отмечает статус в рабочем контуре.",
    scenario: [
      "Заявка получает нужный статус.",
      "AEVIX отправляет сообщение.",
      "Команда видит, что следующий шаг выполнен.",
    ],
    result: "Повторяющиеся сообщения уходят из ручной работы администратора.",
  },
  {
    id: "reviews",
    icon: Star,
    title: "Отзывы",
    metric: "Сбор обратной связи становится частью сценария",
    intro: "После визита или покупки система аккуратно просит отзыв и сохраняет обратную связь.",
    what: [
      "Отправляет просьбу оставить отзыв.",
      "Собирает оценку и комментарий.",
      "Передает проблему сотруднику.",
      "Помогает видеть повторяющиеся жалобы.",
    ],
    channels: ["WhatsApp", "Telegram", "Google review", "CRM"],
    prompt: "Отзывы просят нерегулярно и вручную",
    answer: "AEVIX запускает сообщение после визита и сохраняет обратную связь.",
    scenario: [
      "После услуги клиент получает короткое сообщение.",
      "Отзыв или проблема попадает в рабочий контур.",
      "Команда видит, что стоит улучшить.",
    ],
    result: "Обратная связь перестает зависеть от случайной инициативы сотрудника.",
  },
  {
    id: "nfc",
    icon: CreditCard,
    title: "NFC-карточки",
    metric: "Бонус к комплексному проекту",
    intro: "Физическая точка входа для записи, отзывов, меню, каталога или личной страницы.",
    what: [
      "Открывает нужную страницу касанием.",
      "Ведет к записи, отзыву или каталогу.",
      "Работает как понятный офлайн-мост.",
      "Дополняет сайт, бота и CRM.",
    ],
    channels: ["NFC", "Сайт", "Отзывы", "Каталог"],
    prompt: "Клиент на месте хочет быстро открыть запись или оставить отзыв",
    answer: "NFC-карточка ведет его на нужный сценарий без поиска ссылок.",
    scenario: [
      "Клиент касается карточки телефоном.",
      "Открывается нужный сценарий.",
      "Действие сохраняется в общей системе.",
    ],
    result: "Офлайн-точка становится частью цифрового процесса.",
  },
];

const aiQuickPrompts = [
  "Сколько это стоит?",
  "Сколько занимает разработка?",
  "Можно улучшить существующий сайт?",
  "Как работает AI?",
  "Покажи автоматизацию",
  "Создай концепт сайта",
  "У меня барбершоп",
  "Что если у меня несколько филиалов?",
] as const;

/**
 * Short, concrete answers for factual quick questions — no long "report" for a simple
 * question. Prompts not listed here fall through to the full AI analysis.
 */
const quickReplies: Record<string, string> = {
  "Сколько это стоит?":
    "Коротко: лендинг — от 100 000 ₸, боты и автоматизация — от 120 000 ₸. На первый проект — скидка 10%. Точная цена зависит от задач: откройте калькулятор или получите бесплатную консультацию.",
  "Сколько занимает разработка?":
    "Обычно первая версия — 1–3 недели, зависит от объёма и интеграций. Точный срок назовём после короткого разбора.",
  "Как работает AI?":
    "AI отвечает клиенту в WhatsApp и Telegram, уточняет задачу, собирает данные и передаёт сотруднику готовое обращение. Сложное сразу уходит человеку.",
  "Можно улучшить существующий сайт?":
    "Да. Разбираем текущую структуру и путь клиента, затем предлагаем точечные улучшения или новую версию — без переделки ради переделки.",
  "Покажи автоматизацию":
    "Автоматизация убирает ручные шаги: заявки, статусы, напоминания и типовые ответы идут по сценарию сами. Опишите бизнес одним сообщением — покажу сценарий под вас.",
  "Создай концепт сайта":
    "Нажмите «Получить концепт сайта» слева — за минуту соберём интерактивный макет с вашими услугами и примерными ценами.",
  "У меня барбершоп":
    "Для барбершопа обычно нужны онлайн-запись, выбор мастера, напоминания и ответы в WhatsApp. Опишите детали — соберу решение и назову цену.",
  "Что если у меня несколько филиалов?":
    "Каждый филиал ведём отдельно: своё расписание, заявки и статусы. Владелец видит все точки в одном месте.",
};

/**
 * Lightweight intent detection so the consultant answers a short question with a short reply,
 * and only produces the full structured analysis (вывод / проблемы / рекомендации / карта) after
 * a real business description. Kept deliberately simple and dependency-free.
 */
function classifyMessage(message: string): { mode: "full" | "quick"; setsTopic: boolean } {
  const m = message.trim().toLowerCase();
  const words = m.split(/\s+/).filter(Boolean);
  const isQuestion =
    m.includes("?") ||
    /^(а |и )?(есть|можно|как|что|сколько|когда|почему|какой|какие|какая|нужно|нужен|будет|вы |делаете|подойд|можете|реально|а есть|а что)/.test(m);
  const nicheWords =
    /(бизнес|салон|магазин|барбершоп|барбер|кофейн|ресторан|кафе|стоматолог|зуб|клиник|фитнес|тренаж|автосервис|доставк|отель|гостиниц|пекарн|цвет|аптек|студи|мастерск|шиномонтаж|автомойк|груминг)/;
  const mentionsBusiness = nicheWords.test(m) || /(^|\s)(у меня|мой|моя|моё|мои)\s/.test(m);
  const processWords =
    /(вручну|тетрад|блокнот|теряем|не успева|путаниц|excel|таблиц|напомина|отвеча|обраба|поток|очеред|переписк|звонк|заявк|запис|заказ|клиент)/;

  const isFull =
    (!isQuestion && mentionsBusiness && (words.length >= 9 || processWords.test(m))) || words.length >= 16;
  const setsTopic = isFull || (!isQuestion && mentionsBusiness && words.length <= 12);
  return { mode: isFull ? "full" : "quick", setsTopic };
}

/** Offline fallback for the most common short questions, so quick mode still works without AI. */
function localQuickAnswer(message: string, topic: string): string | null {
  const m = message.toLowerCase();
  const ctx = topic ? ` Под «${topic}» подберём оптимальный набор.` : "";
  if (/скидк/.test(m)) return `Да, на первый проект действует скидка 10%.${ctx} Точную цену покажет калькулятор.`;
  if (/(цена|стоит|стоимост|прайс|бюджет|сколько.*(стоит|цен|денег))/.test(m))
    return "Лендинг — от 100 000 ₸, боты и автоматизация — от 120 000 ₸. На первый проект скидка 10%. Точный расчёт — в калькуляторе или на бесплатной консультации.";
  if (/(срок|как долго|за сколько|сколько.*(врем|занима|дел|недел|дней))/.test(m))
    return "Обычно первая версия — 1–3 недели, зависит от объёма и интеграций.";
  if (/crm/.test(m)) return "Да, CRM подключаем: заявки, статусы и история в одном окне. Состав — по вашему процессу.";
  if (/(бот|telegram|whatsapp|ватсап|телеграм)/.test(m))
    return "Да, делаем ботов для Telegram и WhatsApp: ответы, заявки и сценарии. От 150 000 ₸, на первый проект скидка 10%.";
  return null;
}

const analysisStages = [
  "Изучаем описание бизнеса",
  "Находим повторяющиеся задачи",
  "Подбираем подходящие модули",
  "Формируем план решения",
];


const fallbackFlow = ["Клиент", "AI-консультант", "Заявка", "CRM", "Напоминание", "Отзыв"];

const flowNodeIcons: IconComponent[] = [
  UserRound,
  Bot,
  CalendarCheck,
  Layers3,
  Clock3,
  Star,
  Repeat2,
];

function getFlowNodeDescription(step: string) {
  const normalized = step.toLowerCase();

  if (normalized.includes("клиент") || normalized.includes("гость") || normalized.includes("покупатель")) {
    return "Человек обращается в привычный канал: сайт, Telegram или WhatsApp.";
  }
  if (normalized.includes("ai")) {
    return "AI уточняет задачу, отвечает простым языком и собирает нужные данные.";
  }
  if (normalized.includes("запис") || normalized.includes("заяв") || normalized.includes("заказ") || normalized.includes("бронь")) {
    return "Обращение превращается в понятный следующий шаг для команды.";
  }
  if (normalized.includes("crm") || normalized.includes("статус")) {
    return "Данные, статус и контекст сохраняются в общем рабочем контуре.";
  }
  if (normalized.includes("напомин")) {
    return "Клиент получает подтверждение или напоминание без ручной переписки.";
  }
  if (normalized.includes("отзыв") || normalized.includes("повтор")) {
    return "После услуги система помогает собрать обратную связь или вернуть клиента к следующему шагу.";
  }

  return "Этап помогает убрать ручной контроль и сделать процесс понятнее для команды.";
}

function formatFallbackAnalysis(text: string): AnalysisResult {
  return {
    shortAnswer: text,
    reasons: [
      "Ответ собран локально, без обращения к живому AI, поэтому опирается на общие паттерны малого бизнеса.",
      "Судя по сообщению, часть обращений сейчас обрабатывается вручную.",
      "Единая точка приёма заявок обычно снимает основную нагрузку с команды.",
    ],
    recommendedSolution: "Начните с AI-консультанта, который примет обращения в привычном канале и передаст команде только то, что действительно требует человека.",
    summary: text,
    problems: ["Повторяющиеся обращения занимают внимание команды."],
    recommendations: ["Собрать входящие заявки в один поток.", "Подключить AI-консультанта.", "Добавить напоминания и CRM-статусы."],
    flow: fallbackFlow,
    callToAction: "Можно обсудить подходящий сценарий через WhatsApp, Telegram или email.",
  };
}

function getQuickPromptFallback(message: string): AnalysisResult {
  const base = {
    reasons: [
      "Ответ дан по частому вопросу без обращения к живому AI — временный локальный режим.",
      "Цены и сроки соответствуют актуальному прайсу AEVIX.",
      "Точная конфигурация уточняется в переписке или калькуляторе.",
    ],
    recommendedSolution: "Опишите свой бизнес одним сообщением — соберём решение и точную цену именно под вашу задачу.",
    problems: ["Вопрос требует короткого разбора текущего процесса."],
    recommendations: ["Зафиксировать задачу и нужные каналы.", "Определить состав первой версии.", "Уточнить интеграции и роли команды."],
    flow: fallbackFlow,
    callToAction: "Обсудить конкретную конфигурацию можно через WhatsApp, Telegram или email.",
  };
  const withAnswer = (text: string): AnalysisResult => ({ ...base, shortAnswer: text, summary: text });

  if (message === "Сколько это стоит?") {
    return withAnswer("Базовая стоимость начинается от 120 000 ₸ за AI-консультанта. Итоговый диапазон зависит от модулей, филиалов и интеграций; прозрачный расчёт доступен в калькуляторе ниже.");
  }
  if (message === "Сколько занимает разработка?") {
    return withAnswer("Срок первой версии определяется после разбора задачи. Он зависит от количества сценариев, каналов и готовности интеграций.");
  }
  if (message === "Можно улучшить существующий сайт?") {
    return withAnswer("Да. Сначала AEVIX разбирает текущую структуру, путь клиента и технические ограничения, затем предлагает точечное улучшение или новую рабочую версию.");
  }
  if (message === "Как работает AI?") {
    return withAnswer("AI получает описание услуг и правил, понимает вопрос клиента, уточняет детали и передаёт результат в запись, CRM или сотруднику.");
  }
  if (message === "Покажи автоматизацию") {
    return withAnswer("Ниже на странице есть живая симуляция: сообщение клиента проходит через AI, расписание, запись, CRM, напоминание и подтверждение.");
  }
  if (message === "Создай концепт сайта") {
    return withAnswer("Нажмите «Получить концепт сайта» слева: мастер соберёт бизнес-контекст, стиль, палитру и интерактивный preview.");
  }
  if (message === "У меня барбершоп") {
    return withAnswer("Для барбершопа обычно полезны AI-ответы, онлайн-запись, выбор мастера, подтверждения, напоминания и CRM-статусы.");
  }
  return withAnswer("Для нескольких филиалов важно разделить расписания, роли и статусы по точкам, сохранив единый контроль для владельца. В калькуляторе предусмотрены отдельные коэффициенты масштаба.");
}

function formatKzt(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

function getServiceTitle(id: ServiceId) {
  return serviceCatalog.find((service) => service.id === id)?.title ?? id;
}

/**
 * Приводит конфигурацию к правилам продукта (Pricing pass §2). Нужна не только переключателю:
 * сохранённый в проекте расчёт мог быть собран ДО появления зависимостей и содержать «висячий»
 * канал без ядра — восстановление такой конфигурации вернуло бы состояние, которого не должно
 * существовать. Инвариант держится на входе, а не только в обработчике клика.
 */
function normalizeForm(form: EstimateForm): EstimateForm {
  const services = withDependencies(form.selectedServices) as ServiceId[];
  return services.length === form.selectedServices.length ? form : { ...form, selectedServices: services };
}

function calculateEstimate(form: EstimateForm) {
  const selected = serviceCatalog.filter((service) => form.selectedServices.includes(service.id));
  // Работа, которая уже входит в scope другого выбранного решения, не тарифицируется второй раз:
  // CRM внутри комплексной автоматизации — та же работа, а не 200k + 350k. Правило объявлено
  // ДАННЫМИ в канонической модели (`includesInScope`), здесь только считается.
  const absorbed = absorbedByScope(form.selectedServices);
  const crmInAutomation = absorbed.includes("crm");
  const baseTotal = selected.reduce(
    (sum, service) => (absorbed.includes(service.id) ? sum : sum + service.price),
    0,
  );
  const hasComplexity = form.selectedServices.includes("automation") || form.selectedServices.includes("crm");
  const branchMultiplier =
    form.branchCount === "2–5" ? 1.2 : form.branchCount === "6–10" ? 1.4 : 1;
  const requiresCustom = form.branchCount === "больше 10";
  const adjustedTotal = Math.round(baseTotal * branchMultiplier);
  const discount = Math.round(baseTotal * FIRST_PROJECT_DISCOUNT);
  const discountedTotal = adjustedTotal - discount;
  const rangeMin = Math.max(0, discountedTotal);
  const rangeMax = Math.max(rangeMin, adjustedTotal);
  const rangeText = requiresCustom
    ? "Индивидуальный расчет"
    : baseTotal === 0
      ? "Требуется уточнение"
    : `от ${formatKzt(rangeMin)} до ${formatKzt(rangeMax)}`;

  return {
    selected,
    baseTotal,
    branchMultiplier,
    adjustedTotal,
    discount,
    discountedTotal,
    rangeMin,
    rangeMax,
    rangeText,
    crmInAutomation,
    requiresCustom,
    requiresClarification: hasComplexity || form.currentServices.trim().length > 0,
  };
}

export function buildFallbackEstimate(form: EstimateForm): EstimateResult {
  const estimate = calculateEstimate(form);
  const modules = estimate.selected.map((service) => service.title);
  const includesAutomation = form.selectedServices.includes("automation");
  const includesBots = form.selectedServices.includes("telegram") || form.selectedServices.includes("whatsapp");

  return {
    summary: `${form.businessType}: предварительная конфигурация собрана по выбранным модулям и текущей ручной нагрузке.`,
    recommendedModules: modules,
    estimatedRange: estimate.rangeText,
    implementationSteps: [
      "Коротко разобрать текущий путь клиента и ручные действия команды.",
      includesBots
        ? "Собрать сценарии ответов и передачи заявки из Telegram / WhatsApp."
        : "Определить основной канал входящих обращений и правила обработки.",
      includesAutomation
        ? "Настроить статусы, напоминания и контрольные действия в рабочем контуре."
        : "Подготовить первую версию выбранных модулей и проверить на реальном сценарии.",
      "После проверки уточнить интеграции, права доступа и финальный состав проекта.",
    ],
    risks: [
      estimate.requiresClarification
        ? "Интеграции и текущие сервисы нужно уточнить перед финальной стоимостью."
        : "Финальная стоимость зависит от деталей сценариев и интеграций.",
      form.branchCount === "больше 10"
        ? "Для сети больше 10 точек нужен отдельный разбор структуры и ролей."
        : "Количество точек влияет на объем настройки и контрольных сценариев.",
    ],
    callToAction: "Точную стоимость лучше зафиксировать после короткого разбора задач и интеграций.",
  };
}

function buildRequestText(form: EstimateForm, result: EstimateResult) {
  const lines = [
    "Здравствуйте. Хочу обсудить предварительный расчет AEVIX.",
    "",
    `Тип бизнеса: ${form.businessType}`,
    `Модули: ${result.recommendedModules.join(", ")}`,
    `Количество точек: ${form.branchCount}`,
    `Ориентир стоимости: ${result.estimatedRange}`,
    form.manualWork ? `Что сейчас вручную: ${form.manualWork}` : null,
    form.currentServices ? `Текущие сервисы: ${form.currentServices}` : null,
    form.contactName ? `Имя: ${form.contactName}` : null,
    form.contactHandle ? `Контакт: ${form.contactHandle}` : null,
    form.contactEmail ? `Email: ${form.contactEmail}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function buildContactHref(kind: "whatsapp" | "telegram" | "email", text: string) {
  const encoded = encodeURIComponent(text);

  if (kind === "whatsapp") return `${contacts.whatsapp.href}?text=${encoded}`;
  if (kind === "telegram") return contacts.telegram.href;
  return `${contacts.email.href}?subject=${encodeURIComponent("Предварительный расчет AEVIX")}&body=${encoded}`;
}

function usePremiumMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches;
    let activeMagneticControl: HTMLElement | null = null;
    const lenis = reduceMotion
      ? null
      : new Lenis({
          duration: 1,
          smoothWheel: true,
          wheelMultiplier: 0.82,
        });

    const raf = (time: number) => {
      lenis?.raf(time);
      requestAnimationFrame(raf);
    };
    const frame = requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        if (element.closest(".card-field")) return;
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: reduceMotion ? 0 : 24, filter: reduceMotion ? "none" : "blur(4px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: reduceMotion ? 0.01 : 0.72,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".card-field").forEach((group) => {
        const items = Array.from(group.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: reduceMotion ? 0 : 20 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduceMotion ? 0.01 : 0.62,
            stagger: reduceMotion ? 0 : 0.07,
            ease: "power2.out",
            scrollTrigger: { trigger: group, start: "top 86%" },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-heading-line]").forEach((line, index) => {
        gsap.fromTo(
          line,
          { yPercent: reduceMotion ? 0 : 44, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: reduceMotion ? 0.01 : 0.72,
            delay: reduceMotion ? 0 : (index % 2) * 0.06,
            ease: "power3.out",
            scrollTrigger: { trigger: line.parentElement ?? line, start: "top 86%" },
          },
        );
      });

      if (!reduceMotion) {
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          gsap.to(element, {
            yPercent: Number(element.dataset.parallax) || -10,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              scrub: true,
            },
          });
        });
      }
    });

    // Writing to documentElement invalidates style for the whole document, so it is coalesced
    // to at most one write per frame. Previously it ran on every pointermove event — and nothing
    // in CSS read the result, so it was pure cost; the ambient glow below now consumes it.
    let cursorFrame = 0;
    let pendingCursor: { x: number; y: number } | null = null;
    const flushCursor = () => {
      cursorFrame = 0;
      if (!pendingCursor) return;
      document.documentElement.style.setProperty("--cursor-x", `${pendingCursor.x}px`);
      document.documentElement.style.setProperty("--cursor-y", `${pendingCursor.y}px`);
      pendingCursor = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer || reduceMotion) return;
      pendingCursor = { x: event.clientX, y: event.clientY };
      if (!cursorFrame) cursorFrame = requestAnimationFrame(flushCursor);

      const target = event.target instanceof HTMLElement ? event.target : null;
      const surface = target?.closest<HTMLElement>(
        ".interactive-surface, .glass-panel, .dark-glass, .founder-note, .pricing-compact-cta, .cases-scene article",
      );
      if (surface) {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--surface-x", `${event.clientX - rect.left}px`);
        surface.style.setProperty("--surface-y", `${event.clientY - rect.top}px`);
      }

      const magneticControl = target?.closest<HTMLElement>(".aevix-button") ?? null;
      if (activeMagneticControl && activeMagneticControl !== magneticControl) {
        activeMagneticControl.style.setProperty("--magnetic-x", "0px");
        activeMagneticControl.style.setProperty("--magnetic-y", "0px");
      }
      activeMagneticControl = magneticControl;
      if (magneticControl) {
        const rect = magneticControl.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 3;
        magneticControl.style.setProperty("--magnetic-x", `${x}px`);
        magneticControl.style.setProperty("--magnetic-y", `${y}px`);
      }
    };

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(frame);
      if (cursorFrame) cancelAnimationFrame(cursorFrame);
      window.removeEventListener("pointermove", onPointerMove);
      activeMagneticControl?.style.removeProperty("--magnetic-x");
      activeMagneticControl?.style.removeProperty("--magnetic-y");
      ctx.revert();
      lenis?.destroy();
    };
  }, []);
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function MagneticShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -4;
    const ry = ((x / rect.width) - 0.5) * 5;
    event.currentTarget.style.setProperty("--rx", `${rx}deg`);
    event.currentTarget.style.setProperty("--ry", `${ry}deg`);
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("perspective-card transition-transform duration-300", className)}
    >
      {children}
    </div>
  );
}

function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("aevix-loading-dots", className)} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/** Counts up to `value` on mount so personalised metrics visibly "roll" into place. */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  // Start at 0 and roll up; starting at `value` would flash the final number for one frame.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let startTime = 0;
    const duration = 850;
    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <span className={className}>{display}</span>;
}


/**
 * Drives the Hero placeholder as a soft cross-fade between whole example phrases. While
 * `active` (field unfocused and empty) it advances the index on a calm interval; the visible
 * fade is handled by the ghost overlay via AnimatePresence. When inactive it holds the current
 * phrase, so focusing or typing stops the motion without ever touching the user's value.
 * Reduced-motion users see a single static phrase.
 */
function useFadePlaceholder(examples: readonly string[], active: boolean) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % examples.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [active, reduced, examples]);

  return { text: examples[index], index };
}

const categoryIcons: Record<HeroBusinessCategory, IconComponent> = {
  barbershop: Scissors,
  beauty: Sparkle,
  food: Coffee,
  ecommerce: ShoppingBag,
  dental: Stethoscope,
  auto: Car,
  generic: Store,
};

function HeroAnalysisResult({
  profile,
  content,
  summary,
  summaryPending,
  degraded,
  onRetry,
  onReset,
  onContinue,
}: {
  profile: HeroBusinessProfile;
  content: BusinessContent;
  summary: string | null;
  /** Подробный разбор ещё едет с сервера; всё остальное на карточке — уже известное локально. */
  summaryPending: boolean;
  degraded: boolean;
  onRetry: () => void;
  onReset: () => void;
  onContinue: () => void;
}) {
  const CategoryIcon = categoryIcons[profile.category];
  // Честность только когда ниша НЕ распознана. Распознанная ниша без rich display-категории
  // (legal/pet/…) показывает настоящее имя, а не «Малый бизнес» (этап 7, Wave 5, §5).
  const isGeneric = !profile.recognized;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={motionTransition.slower}
      className="hero-result glass-panel relative mx-auto w-full max-w-xl overflow-hidden p-5 md:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink/8 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet/12 text-violet">
            <CategoryIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet">
              {isGeneric ? "Тип бизнеса не распознан" : "AEVIX понял"}
            </p>
            <p className="truncate text-lg font-semibold leading-tight text-ink">{profile.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:border-violet/24 hover:text-ink"
        >
          Изменить
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-ink/68">
        {isGeneric
          ? "Не удалось уверенно определить тип бизнеса. Уточните нишу или задачу — и разбор станет конкретнее. Пока показываем нейтральный сценарий."
          : (summary ?? `${profile.descriptor}.`)}
      </p>

      {/* Единственное, чего мы ещё не знаем, — и об этом сказано прямо. Всё, что выше и ниже,
          получено локальным резолвером и базой знаний ниши, поэтому ждать ради него нечего.
          Строка исчезает сама, когда ответ приходит или когда честно не приходит (degraded). */}
      {summaryPending ? (
        <p className="hero-enriching" role="status" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          Готовим подробный разбор — он дополнит эту карточку
        </p>
      ) : null}

      {/* Known / Inferred / Proposed — три РАЗНЫЕ категории уверенности, смешивать нельзя (Wave 4).
          Никаких процентов автоматизации, часов и «выручки +N%»: это были выдуманные числа без
          источника — убраны. Здесь только то, что понято, что ОБЫЧНО полезно (inference из ниши,
          с явной оговоркой), и что AEVIX предлагает построить. */}
      <div className="hero-understanding mt-4 space-y-3">
        {!isGeneric ? (
          <div className="hero-understanding-row">
            <p className="hero-understanding-label">Что поняли</p>
            <p className="hero-understanding-text">{profile.descriptor}</p>
          </div>
        ) : null}
        <div className="hero-understanding-row">
          <p className="hero-understanding-label">Обычно вручную</p>
          <p className="hero-understanding-text">{content.caseBefore}</p>
        </div>
        <div className="hero-understanding-row">
          <p className="hero-understanding-label">AEVIX предлагает</p>
          <p className="hero-understanding-text">{content.caseAutomated}</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-ink/40">
        Что предлагаем построить
      </p>
      <ol className="hero-roadmap mt-3">
        {content.roadmap.map((phase, index) => (
          <motion.li
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTransition.slow, delay: 0.16 + index * 0.06 }}
            className="hero-roadmap-step"
          >
            <span className="hero-roadmap-dot">{index + 1}</span>
            {phase}
          </motion.li>
        ))}
      </ol>

      {degraded ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-amber-300/40 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-700">
          <span className="flex-1 min-w-[12rem]">AI-сервис временно недоступен — показан базовый разбор AEVIX.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 font-semibold text-amber-800 underline-offset-2 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Повторить с AI
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button type="button" onClick={onContinue} className="w-full sm:w-auto">
          Продолжить полный разбор
          <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
        </Button>
      </div>
    </motion.div>
  );
}

function HeroAnalysisSequence({ stage }: { stage: number }) {
  return (
    <div
      className="hero-result glass-panel relative mx-auto flex w-full max-w-xl flex-col justify-center gap-5 p-7 md:p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="hero-loading-mark flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/12 text-violet">
          <BrainCircuit className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet">AEVIX анализ</p>
          <p className="text-base font-semibold text-ink">{ANALYSIS_SEQUENCE[stage]}…</p>
        </div>
      </div>
      <ol className="grid gap-2.5">
        {ANALYSIS_SEQUENCE.map((label, index) => {
          const state = index < stage ? "done" : index === stage ? "active" : "todo";
          return (
            <li key={label} className={cn("hero-sequence-step", `is-${state}`)}>
              <span className="hero-sequence-dot">
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      <span className="sr-only">Идёт анализ, пожалуйста подождите.</span>
    </div>
  );
}

export function HeroAnalyzer() {
  const { status, stage, profile, content, summary, summaryPending, degraded, analyze, retry, reset } = useBusiness();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [emptyHint, setEmptyHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = input.trim();
  const isAnalyzing = status === "analyzing";
  const showGhost = trimmed.length === 0;
  const cyclingActive = !focused && showGhost && status === "idle";
  const { text: placeholderText, index: placeholderIndex } = useFadePlaceholder(
    heroPlaceholderExamples,
    cyclingActive,
  );
  const canSubmit = trimmed.length > 0 && !isAnalyzing;

  // Auto-grow the textarea up to a sensible ceiling so long descriptions stay readable.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const submit = () => {
    if (isAnalyzing) return; // guard against double submit
    if (!trimmed) {
      setEmptyHint(true);
      textareaRef.current?.focus();
      return;
    }
    setEmptyHint(false);
    void analyze(input);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleReset = () => {
    reset();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const continueToFullAnalysis = () => {
    // The consultant reads the described business straight from context, so this only needs
    // to bring it into view.
    document.getElementById("ai-анализ")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const personalized = status === "ready" && profile && content;
  const BadgeIcon = personalized ? categoryIcons[profile.category] : BrainCircuit;

  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
      <div data-reveal className="relative z-10">
        <div className="hero-badge mb-7 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/46 px-3 py-2 text-sm text-ink/62 backdrop-blur-xl">
          <BadgeIcon className="h-4 w-4 text-violet" />
          {personalized ? content.persona : "AEVIX · AI-платформа для малого бизнеса"}
        </div>
        <h1 className="hero-title text-balance font-semibold text-ink">
          <span data-heading-line className="heading-line">Опишите бизнес —</span>{" "}
          <span data-heading-line className="heading-line">AEVIX подберёт</span>{" "}
          <span data-heading-line className="heading-line">автоматизацию.</span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg leading-8 text-ink/64 md:text-xl md:leading-9">
          Не вы изучаете сайт — сайт изучает ваш бизнес и предлагает решения под него.
        </p>

        <form
          className="hero-analyzer-form mt-7 md:mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="hero-business-input" className="sr-only">
            Опишите ваш бизнес для анализа AEVIX
          </label>
          <div className={cn("hero-field", focused && "is-focused")}>
            <div className="hero-field-input-wrap">
              <textarea
                id="hero-business-input"
                ref={textareaRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (event.target.value.trim()) setEmptyHint(false);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={onKeyDown}
                rows={1}
                aria-label="Опишите ваш бизнес для анализа AEVIX"
                aria-describedby="hero-input-hint"
                className="hero-field-input"
                spellCheck={false}
              />
              {showGhost ? (
                <div className="hero-placeholder-ghost" aria-hidden="true">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={motionTransition.slower}
                    >
                      {placeholderText}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-label="Проанализировать бизнес"
              className="hero-field-submit shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <LoadingDots className="mr-2" />
                  Анализ
                </>
              ) : (
                <>
                  Анализировать
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </div>
          <p
            id="hero-input-hint"
            aria-live="polite"
            className={cn("hero-input-hint", emptyHint && "is-error")}
          >
            {emptyHint
              ? "Введите описание бизнеса — хотя бы одно предложение."
              : "Enter — анализ, Shift+Enter — новая строка."}
          </p>
        </form>

        <ul className="hero-trust mt-6">
          {[
            [ShieldCheck, "Без обязательств"],
            [Zap, "Первый разбор за секунды"],
            [Bot, "AI под ваш бизнес"],
          ].map(([Icon, label]) => (
            <li key={label as string}>
              <Icon className="h-4 w-4 text-violet" />
              {label as string}
            </li>
          ))}
        </ul>
      </div>

      {/* Not a [data-reveal] target: this column swaps content (dashboard → sequence →
          result), and a scroll-reveal's ResizeObserver refresh would reset it to hidden on
          each height change. The dashboard and result carry their own entrance animations. */}
      <div data-parallax="-4" className="relative">
        {status === "idle" ? (
          <HeroDashboard />
        ) : isAnalyzing ? (
          <HeroAnalysisSequence stage={stage} />
        ) : profile && content ? (
          <HeroAnalysisResult
            profile={profile}
            content={content}
            summary={summary}
            summaryPending={summaryPending}
            degraded={degraded}
            onRetry={() => void retry()}
            onReset={handleReset}
            onContinue={continueToFullAnalysis}
          />
        ) : null}
      </div>
    </div>
  );
}

function HeroDashboard() {
  return (
    <MagneticShell className="relative mx-auto w-full max-w-xl">
      <div className="dark-glass relative overflow-hidden rounded-[2rem] p-5 text-porcelain">
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">AEVIX OS</p>
              <p className="text-xs text-porcelain/48">Демонстрация процесса</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-porcelain/72">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            сценарий
          </div>
        </div>
        <div className="relative grid gap-3 py-4 sm:grid-cols-3">
          {[
            ["Входящие обращения", "единый поток"],
            ["Рутинные задачи", "автоматизированы"],
            ["Контроль процессов", "в одном интерфейсе"],
          ].map(([title, sub]) => (
            <div key={title} className="rounded-3xl border border-white/8 bg-white/[0.06] p-4">
              <p className="text-lg font-semibold leading-tight text-porcelain">{title}</p>
              <p className="mt-2 text-xs text-porcelain/46">{sub}</p>
            </div>
          ))}
        </div>
        <div className="relative rounded-[1.5rem] border border-white/8 bg-black/22 p-4">
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-porcelain/38">
            Как работает сценарий
          </p>
          <div className="grid gap-3">
            {[
              ["Клиент написал", "Хочу записаться на стрижку сегодня"],
              ["AI понял запрос", "Нужна услуга, время и контакт"],
              ["Предложил действие", "Уточнить мастера и доступное окно"],
              ["Передал заявку", "Команда видит статус и контекст"],
              ["Запустил напоминание", "Клиент получает подтверждение"],
            ].map(([title, text], index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.055] p-3"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-porcelain/48">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MagneticShell>
  );
}

function HeroScene() {
  return (
    <section id="главная" className="scene hero-scene relative flex items-center overflow-hidden pt-28">
      <div className="absolute inset-x-0 top-24 mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-ink/18 to-transparent" />
      <div className="mx-auto w-full max-w-7xl">
        <HeroAnalyzer />
      </div>
      <div className="hero-scroll-cue absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink/42 md:flex">
        <span className="h-8 w-px bg-gradient-to-b from-ink/5 to-ink/35" />
        <ChevronDown className="h-4 w-4" />
      </div>
    </section>
  );
}

function getSafeFlow(result: AnalysisResult | null, input: string) {
  if (result?.flow?.length) return result.flow.slice(0, 7);
  const normalized = input.toLowerCase();
  if (normalized.includes("кофе") || normalized.includes("ресторан")) {
    return ["Гость", "AI-консультант", "Бронь / меню", "CRM", "Напоминание", "Отзыв"];
  }
  if (normalized.includes("магазин")) {
    return ["Покупатель", "AI-консультант", "Заказ", "CRM", "Статус", "Повторное обращение"];
  }
  return fallbackFlow;
}

export function AiConsultantScene({
  initialAnalysis = null,
  onAnalysisSaved,
}: {
  /** Seeds the panel with a previously-saved result (e.g. reopening a project) instead of
   * starting from a blank chat. */
  initialAnalysis?: AnalysisResult | null;
  /** Fired whenever a real analysis lands — success or local fallback — so a project can persist
   * it. The component keeps working exactly the same with no props at all (used standalone on
   * the landing page). */
  onAnalysisSaved?: (analysis: AnalysisResult) => void;
} = {}) {
  const { input: businessInput, openConsultation } = useBusiness();
  const [input, setInput] = useState("");
  const lastSyncedRef = useRef("");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "intro",
      role: "ai",
      text: "Опишите бизнес, и AI-консультант AEVIX покажет, какие процессы можно автоматизировать: ответы клиентам, запись, напоминания, CRM, боты и сбор отзывов.",
    },
  ]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialAnalysis);
  const [isThinking, setThinking] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<"full" | "quick">("full");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedNode, setExpandedNode] = useState<number | null>(null);
  // Remembered business context so a follow-up like "есть скидки?" stays about the same
  // business the visitor already described. Also the target of the "repeat analysis" button.
  const businessTopicRef = useRef("");
  const lastFullRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const canSend = input.trim().length > 0 && input.trim().length <= 1500 && !isThinking;
  const flow = getSafeFlow(analysis, input);
  // Услуги от дорогих к дешёвым (по запросу — сначала более дорогие).
  const servicesByPrice = [...serviceCatalog].sort((a, b) => (b.price || 0) - (a.price || 0));
  const fullThinking = isThinking && thinkingMode === "full";
  const progress =
    analysis || fullThinking
      ? ((analysis ? analysisStages.length - 1 : stageIndex) / (analysisStages.length - 1)) * 100
      : 0;

  useEffect(() => {
    if (!isThinking || thinkingMode !== "full") {
      if (!analysis) setStageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [analysis, isThinking, thinkingMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedNode(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reports every real result upward (success or local fallback) — covers every setAnalysis()
  // call site uniformly instead of threading the save call through each one individually.
  useEffect(() => {
    if (analysis) onAnalysisSaved?.(analysis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  // Prefill from the business the visitor described in the Hero (single source of truth:
  // the context). Syncs only when that description changes, so manual edits here are kept
  // and nothing auto-submits — the visitor decides when to run the deeper analysis.
  useEffect(() => {
    if (businessInput && businessInput !== lastSyncedRef.current) {
      lastSyncedRef.current = businessInput;
      setInput(businessInput);
      // The Hero description becomes the remembered context for follow-up questions.
      businessTopicRef.current = businessInput;
    }
  }, [businessInput]);

  // Pin a just-sent message to the top of the chat so its answer reads top-down —
  // instead of slamming the view to the very bottom of a long reply.
  const scrollMessageToTop = (id: string) => {
    window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      const target = element?.querySelector<HTMLElement>(`[data-mid="${id}"]`);
      if (!element || !target) return;
      element.scrollTo({
        top: Math.max(0, target.offsetTop - 8),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  const pushAi = (text: string) =>
    setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: "ai", text }]);

  // Full structured analysis — only after a real business description.
  const runFullAnalysis = async (message: string) => {
    if (!message) return;
    lastFullRef.current = message;
    businessTopicRef.current = message;
    setError(null);
    setAnalysis(null);
    setExpandedNode(null);
    setThinkingMode("full");
    setThinking(true);

    try {
      const response = await fetch("/api/business-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as { analysis?: string; result?: AnalysisResult; error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить анализ. Попробуйте еще раз.");

      const result = data.result;
      const text =
        data.analysis ||
        [result?.shortAnswer, result?.summary, result?.callToAction].filter(Boolean).join("\n\n");
      if (!text) throw new Error("AI-консультант не вернул ответ. Попробуйте переформулировать запрос.");

      setAnalysis(result ?? formatFallbackAnalysis(text));
      setExpandedNode(0);
      pushAi("Разобрал ваш бизнес — короткий ответ, причины и ваш процесс ниже.");
    } catch (requestError) {
      if (aiQuickPrompts.some((prompt) => prompt === message)) {
        setAnalysis(getQuickPromptFallback(message));
        setExpandedNode(0);
        pushAi("OpenAI временно недоступен. Показываю проверенный локальный ответ AEVIX.");
        setError(null);
      } else {
        setError(
          requestError instanceof Error ? requestError.message : "Не удалось выполнить анализ. Попробуйте еще раз.",
        );
      }
    } finally {
      setThinking(false);
    }
  };

  // Short, concrete answer for a simple question — no report, keeps the business context.
  const runQuickAnswer = async (message: string) => {
    setError(null);
    setThinkingMode("quick");
    setThinking(true);
    const topic = businessTopicRef.current;

    try {
      const response = await fetch("/api/business-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickQuestion: message, businessContext: topic }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || "no answer");
      pushAi(data.answer);
    } catch {
      pushAi(
        localQuickAnswer(message, businessTopicRef.current) ??
          "Коротко ответить не вышло — сеть недоступна. Опишите бизнес одним сообщением или получите бесплатную консультацию.",
      );
    } finally {
      setThinking(false);
    }
  };

  // Single entry point for a typed message: classify intent, then route to full vs quick.
  const handleUserMessage = async (rawText: string) => {
    const message = rawText.trim();
    if (isThinking) return;
    if (!message) {
      setError("Опишите бизнес или задачу, чтобы AI-консультант смог провести анализ.");
      return;
    }
    if (message.length > 1500) {
      setError("Сообщение слишком длинное. Максимум — 1500 символов.");
      return;
    }

    setInput(""); // clear the composer after sending
    const userMessageId = `user-${Date.now()}`;
    setMessages((current) => [...current, { id: userMessageId, role: "user", text: message }]);
    scrollMessageToTop(userMessageId);

    const { mode, setsTopic } = classifyMessage(message);
    if (setsTopic) businessTopicRef.current = message;
    if (mode === "full") await runFullAnalysis(message);
    else await runQuickAnswer(message);
  };

  // Quick-prompt buttons: factual ones get an instant canned reply; the rest go through the
  // normal intent router (so "У меня барбершоп" sets context, etc.).
  const handleQuickPrompt = (prompt: string) => {
    if (isThinking) return;
    const reply = quickReplies[prompt];
    if (!reply) {
      void handleUserMessage(prompt);
      return;
    }
    setError(null);
    const userMessageId = `user-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text: prompt },
      { id: `reply-${Date.now()}`, role: "ai", text: reply },
    ]);
    scrollMessageToTop(userMessageId);
  };

  return (
    <section
      id="ai-анализ"
      className="scene ai-scene relative flex items-center overflow-hidden text-ink"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Настоящий AI-анализ
          </p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Опишите бизнес.</span>{" "}
            <span data-heading-line className="heading-line">AEVIX предложит понятный сценарий автоматизации.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/62">
            Опишите задачу — AEVIX разберёт процесс и предложит подходящие модули.
          </p>
          <WebsiteConceptExperience />
          <div className="mt-8 rounded-[1.75rem] border border-ink/8 bg-white/54 p-4 shadow-object backdrop-blur-2xl">
            <div className="relative mb-5 h-1 overflow-hidden rounded-full bg-ink/8">
              <motion.div
                className="h-full rounded-full bg-violet"
                animate={{ width: `${progress}%` }}
                transition={motionTransition.slow}
              />
            </div>
            <div className="grid gap-3">
            {analysisStages.map((stage, index) => (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 transition",
                  analysis || (fullThinking && index < stageIndex)
                    ? "border-emerald-500/16 bg-emerald-50/70 text-ink"
                    : fullThinking && index === stageIndex
                      ? "border-violet/24 bg-violet/10 text-ink"
                      : "border-ink/8 bg-white/48 text-ink/52",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow-[0_8px_20px_rgba(9,8,7,0.06)]">
                  {analysis || (fullThinking && index < stageIndex) ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : fullThinking && index === stageIndex ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-violet" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-sm font-medium">{stage}</span>
              </div>
            ))}
            </div>
          </div>
        </div>
        <div
          data-reveal
          className="aevix-ai-panel aevix-chat-shell relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/58 p-3 shadow-[0_32px_110px_rgba(76,63,118,0.18)] backdrop-blur-2xl md:p-5"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="relative mb-3 flex items-center justify-between rounded-[1.5rem] border border-ink/6 bg-white/72 px-4 py-3 shadow-[0_18px_45px_rgba(9,8,7,0.05)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-[10px] font-semibold text-porcelain">
                AX
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">AI-консультант</p>
                <p className="text-xs text-ink/46">анализ бизнеса</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/16 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
              <span className="aevix-status-dot h-2 w-2 rounded-full bg-emerald-500" />
              онлайн
            </div>
          </div>
          <div
            ref={scrollRef}
            tabIndex={0}
            aria-label="История диалога с AI-консультантом"
            data-lenis-prevent
            className="aevix-ai-scroll aevix-chat-conversation relative flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth rounded-[1.65rem] border border-ink/6 bg-gradient-to-b from-white/78 to-white/42 p-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            {messages.slice(-5).map((message) => (
              <motion.div
                key={message.id}
                data-mid={message.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={motionTransition.slow}
                className={cn(
                  "max-w-[94%] shrink-0 whitespace-pre-line break-words rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-[0_14px_38px_rgba(9,8,7,0.06)]",
                  message.role === "user"
                    ? "ml-auto border border-violet/10 bg-violet/10 text-ink"
                    : "border border-ink/6 bg-white/78 text-ink/72",
                )}
              >
                {message.text}
              </motion.div>
            ))}
            {isThinking ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={motionTransition.slow}
                className="aevix-thinking-pill flex w-fit shrink-0 items-center gap-2 rounded-full border border-violet/14 bg-violet/8 px-4 py-3 text-xs font-medium text-ink/62"
              >
                <span className="flex items-center gap-1">
                  <span className="aevix-thinking-dot h-1.5 w-1.5 rounded-full bg-violet" />
                  <span className="aevix-thinking-dot h-1.5 w-1.5 rounded-full bg-violet/70 [animation-delay:160ms]" />
                  <span className="aevix-thinking-dot h-1.5 w-1.5 rounded-full bg-violet/45 [animation-delay:320ms]" />
                </span>
                <span key={thinkingMode === "quick" ? "quick" : stageIndex} className="aevix-thinking-label">
                  {thinkingMode === "quick" ? "Печатает ответ…" : analysisStages[stageIndex]}
                </span>
              </motion.div>
            ) : null}
            {analysis ? (
              <motion.article
                initial={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                transition={motionTransition.slower}
                className="shrink-0 overflow-hidden rounded-[1.75rem] border border-ink/7 bg-white/86 p-4 text-ink shadow-[0_22px_60px_rgba(76,63,118,0.12)]"
              >
                <div className="flex flex-col gap-3 border-b border-ink/7 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-violet">AI-ответ</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">План решения</h3>
                  </div>
                  <Button
                    onClick={openConsultation}
                    size="sm"
                    className="aevix-ai-action bg-ink text-porcelain hover:bg-ink"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Обсудить это решение
                  </Button>
                </div>
                <div className="ai-analysis mt-4 grid gap-5">
                  <section className="ai-short-answer">
                    <p className="ai-block-title ai-block-title-highlight">💡 Короткий ответ</p>
                    <p className="mt-2 text-lg font-medium leading-8 text-ink">{analysis.shortAnswer}</p>
                  </section>

                  {analysis.reasons.length ? (
                    <section>
                      <p className="ai-block-title">Почему именно так</p>
                      <ul className="mt-2 grid gap-1.5">
                        {analysis.reasons.map((item, index) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...motionTransition.slow, delay: 0.08 + index * 0.05 }}
                            className="flex gap-2.5 text-sm leading-6 text-ink/68"
                          >
                            <span className="ai-dot" />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section>
                    <p className="ai-block-title">Рекомендованное решение</p>
                    <p className="mt-2 text-base leading-7 text-ink/74">{analysis.recommendedSolution}</p>
                  </section>

                  <p className="ai-report-divider">
                    <span>Подробный разбор</span>
                  </p>

                  {analysis.problems.length ? (
                    <section>
                      <p className="ai-block-title">Что мешает</p>
                      <ul className="mt-2 grid gap-1.5">
                        {analysis.problems.map((item, index) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...motionTransition.slow, delay: 0.16 + index * 0.05 }}
                            className="flex gap-2.5 text-sm leading-6 text-ink/68"
                          >
                            <span className="ai-dot" />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {analysis.recommendations.length ? (
                    <section>
                      <p className="ai-block-title">Что поможет</p>
                      <ul className="mt-2 grid gap-1.5">
                        {analysis.recommendations.map((item, index) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...motionTransition.slow, delay: 0.2 + index * 0.05 }}
                            className="flex gap-2.5 text-sm leading-6 text-ink/68"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <p className="ai-block-title">Услуги и цены</p>
                      <button type="button" onClick={() => scrollToSection("стоимость")} className="ai-calc-link">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Калькулятор
                      </button>
                    </div>
                    <ul className="mt-3 grid gap-2">
                      {servicesByPrice.map((service) => {
                        const ServiceIcon = service.icon;
                        return (
                          <li key={service.id} className="ai-service-row">
                            <span className="ai-service-icon">
                              <ServiceIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <strong className="block text-sm font-semibold text-ink">{service.title}</strong>
                              <span className="block text-xs leading-5 text-ink/52">{service.description}</span>
                            </span>
                            <span className="ai-service-price">{priceLabel(service)}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-[0.72rem] leading-4 text-ink/40">
                      Стартовые цены. Персональный расчёт — в калькуляторе.
                    </p>
                  </section>

                  <section>
                    <p className="ai-block-title">Практический эффект</p>
                    <p className="mt-2 text-base leading-7 text-ink/68">{analysis.callToAction}</p>
                  </section>
                  <div className="rounded-[1.5rem] border border-violet/10 bg-gradient-to-br from-white via-[#f8f4ff] to-[#eef1f7] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-violet">Ваш процесс</p>
                        <p className="mt-1 text-sm text-ink/52">Это шаги решения, которое вы только что прочитали. Нажмите на шаг, чтобы раскрыть детали.</p>
                      </div>
                      <SlidersHorizontal className="h-5 w-5 text-violet" />
                    </div>
                    <div className="aevix-flow-map group/map" role="list">
                      {flow.map((step, index) => {
                        const NodeIcon = flowNodeIcons[index % flowNodeIcons.length];
                        const isExpanded = expandedNode === index;
                        const isFirst = index === 0;
                        const isLast = index === flow.length - 1;

                        return (
                          <div key={`${step}-${index}`} className="aevix-flow-row" role="listitem">
                            <div className="aevix-flow-rail" aria-hidden="true">
                              <span className={cn("aevix-flow-marker", isFirst && "is-start", isLast && "is-end")}>
                                <NodeIcon className="h-4 w-4" />
                              </span>
                              {!isLast ? (
                                <motion.span
                                  initial={{ scaleY: 0, opacity: 0 }}
                                  animate={{ scaleY: 1, opacity: 1 }}
                                  transition={{ ...motionTransition.slow, delay: index * 0.08 }}
                                  className={cn(
                                    "aevix-flow-rail-line origin-top",
                                    expandedNode === index || expandedNode === index + 1 ? "bg-violet/45" : "bg-ink/12",
                                  )}
                                />
                              ) : null}
                            </div>
                            <motion.button
                              type="button"
                              aria-label={`Раскрыть этап: ${step}`}
                              onClick={() => setExpandedNode((current) => (current === index ? null : index))}
                              whileHover={{ y: -3, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "aevix-flow-node interactive-surface group/node w-full cursor-pointer rounded-[1.25rem] border bg-white/82 p-3 text-left shadow-[0_18px_42px_rgba(76,63,118,0.11)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40",
                                isExpanded
                                  ? "border-violet/35 bg-white shadow-[0_24px_60px_rgba(122,92,255,0.18)]"
                                  : "border-ink/8 hover:border-violet/28 hover:bg-white",
                                expandedNode !== null && !isExpanded ? "opacity-62" : "opacity-100",
                              )}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-violet/70">
                                    {isFirst ? "Точка входа" : isLast ? "Результат" : `Шаг ${index + 1}`}
                                  </span>
                                  <span className="mt-0.5 block text-sm font-semibold leading-5 text-ink">{step}</span>
                                </span>
                              </span>
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                    {expandedNode !== null ? (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-[1.2rem] border border-violet/14 bg-white/84 p-4 shadow-[0_18px_44px_rgba(76,63,118,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-violet">
                              {flow[expandedNode]}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-ink/66">
                              {getFlowNodeDescription(flow[expandedNode])}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="Закрыть описание этапа"
                            onClick={() => setExpandedNode(null)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/8 bg-white text-ink/54 transition hover:border-violet/22 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            ) : null}
            <div ref={endRef} />
          </div>
          {error ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </motion.p>
          ) : null}
          <div className="aevix-chat-composer z-10 mt-3 rounded-[1.65rem] border border-ink/8 bg-white/82 p-2 shadow-[0_-16px_48px_rgba(255,250,242,0.74)] backdrop-blur-2xl">
            <div className="flex items-end gap-2 rounded-[1.35rem] border border-ink/8 bg-white/70 p-1.5">
            <textarea
              aria-label="Описание бизнеса для AI-консультанта"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleUserMessage(input);
                }
              }}
              maxLength={1500}
              rows={2}
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/32"
              placeholder="Например: у меня кофейня, гости пишут в WhatsApp"
            />
            {input ? (
              <button
                type="button"
                aria-label="Очистить ввод"
                onClick={() => setInput("")}
                disabled={isThinking}
                className="aevix-icon-action mb-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/8 bg-white text-ink/56 transition hover:border-violet/22 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            {analysis ? (
              <button
                type="button"
                aria-label="Повторить анализ"
                onClick={() => void runFullAnalysis(lastFullRef.current)}
                disabled={isThinking || !lastFullRef.current}
                className="aevix-icon-action mb-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/8 bg-white text-ink/56 transition hover:border-violet/22 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
            <Button
              onClick={() => void handleUserMessage(input)}
              aria-label="Проанализировать бизнес"
              aria-disabled={!canSend}
              disabled={!canSend}
              title={canSend ? "Проанализировать" : "Введите описание бизнеса"}
              className="aevix-ai-action h-10 min-w-[3rem] shrink-0 bg-ink px-4 text-porcelain hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/36 disabled:shadow-none"
            >
              {isThinking ? (
                <LoadingDots />
              ) : (
                <>
                  <span className="hidden text-xs sm:inline">Проанализировать</span>
                  <Send className="h-4 w-4 sm:ml-2" />
                </>
              )}
            </Button>
            </div>
            <div className="ai-quick-prompts" aria-label="Быстрые вопросы AI-консультанту">
              {aiQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isThinking}
                  onClick={() => handleQuickPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          </div>
      </div>
    </section>
  );
}

/** Same fine-pointer/desktop convention used by usePremiumMotion/MagneticShell elsewhere in
 * this file — the 3D scene renders fewer sphere segments and skips a few expensive layers below
 * this breakpoint rather than running two separate rendering paths. */
function useEcosystemQuality(): "high" | "low" {
  const [quality, setQuality] = useState<"high" | "low">("high");
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const update = () => setQuality(query.matches ? "high" : "low");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return quality;
}

/** A separate signal from quality: this decides which of the three fixed compositions (and which
 * camera rig) the 3D scene uses — a real breakpoint, not the fine-pointer heuristic quality
 * relies on, since a touch tablet at a wide viewport should still get the wide layout. Each
 * band has its own ellipse and sphere scale in composition.ts, because a phone is not a small
 * desktop: there the binding constraint is label width, not available height. */
function useEcosystemDevice(): EcosystemDevice {
  const [device, setDevice] = useState<EcosystemDevice>("desktop");
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 599px)");
    const tablet = window.matchMedia("(min-width: 600px) and (max-width: 1023px)");
    const update = () => setDevice(phone.matches ? "mobile" : tablet.matches ? "tablet" : "desktop");
    update();
    phone.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      phone.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);
  return device;
}

const recognitionSymptoms = [
  "Обращения в разных каналах",
  "Потерянные заявки",
  "Ручные ответы",
  "Отсутствие единого контроля",
  "Зависимость от отдельных сотрудников",
];

const aevixFlowSteps = [
  ["Клиент обращается", "В WhatsApp, Telegram или на сайте — в удобном для него канале."],
  ["AEVIX понимает запрос", "AI разбирает сообщение и уточняет, что именно нужно клиенту."],
  ["Система выполняет действие", "Запись, ответ, статус или напоминание — без ручного шага."],
  ["Команда видит результат", "Всё обращение и его статус — в одном рабочем контуре."],
];

/** Replaces the old three-in-a-row sections (recognition / "what is AEVIX" / results intro),
 * which repeated the same underlying idea. One compact section now carries all of it: the
 * familiar symptoms as a tag row, the single "not a chatbot" claim, and the 4-step flow. */
function WhatIsAevixScene() {
  return (
    <section id="что-такое-aevix" className="scene what-is-scene flex items-center">
      <div className="mx-auto w-full max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">Что такое AEVIX</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Не отдельный чат-бот —</span>{" "}
            <span data-heading-line className="heading-line">единый рабочий контур бизнеса</span>
          </h2>
          <ul className="recognition-list mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {recognitionSymptoms.map((item) => (
              <li key={item} className="recognition-tag">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal className="what-is-flow mt-12 grid gap-4 md:grid-cols-4">
          {aevixFlowSteps.map(([title, text], index) => (
            <div key={title} className="what-is-flow-step">
              <span className="what-is-flow-index">{String(index + 1).padStart(2, "0")}</span>
              <p className="what-is-flow-title">{title}</p>
              <p className="what-is-flow-text">{text}</p>
              {index < aevixFlowSteps.length - 1 ? <ArrowRight className="what-is-flow-arrow h-4 w-4" /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemsScene() {
  const [mode, setMode] = useState<"before" | "after">("before");
  const [activeId, setActiveId] = useState<string | null>(null);
  const quality = useEcosystemQuality();
  const device = useEcosystemDevice();
  const visualColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId]);

  const activeIndex = ecosystemProcesses.findIndex((node) => node.id === activeId);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  const navigate = (direction: 1 | -1) => {
    const count = ecosystemProcesses.length;
    const base = activeIndex >= 0 ? activeIndex : direction === 1 ? -1 : 0;
    const nextIndex = ((base + direction) % count + count) % count;
    setActiveId(ecosystemProcesses[nextIndex].id);
  };

  useEcosystemGestureNav(visualColRef, navigate);

  const currentLabel =
    mode === "before" ? ecosystemProcesses[currentIndex].title.before : ecosystemProcesses[currentIndex].title.after;

  return (
    <section id="проблемы" className="scene problems-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div className="ecosystem-layout">
          <div data-reveal className="ecosystem-heading-col">
            <p className="mb-4 text-sm font-medium uppercase text-violet">До и после AEVIX</p>
            <h2 className="ecosystem-heading-title text-balance font-semibold">
              <span data-heading-line className="heading-line">Переключите рабочий процесс.</span>{" "}
              <span data-heading-line className="heading-line">Посмотрите, что меняется внутри.</span>
            </h2>
            <div className="before-after-switch ecosystem-switch-prominent" aria-label="Режим сравнения">
              <button type="button" aria-pressed={mode === "before"} onClick={() => setMode("before")}>До AEVIX</button>
              <button type="button" aria-pressed={mode === "after"} onClick={() => setMode("after")}>После AEVIX</button>
            </div>
            <p className="ecosystem-heading-note">
              {mode === "before"
                ? "Переключитесь на «После AEVIX», чтобы собрать процесс, или нажмите на сферу — подробности рядом."
                : "AI, CRM, запись и статусы работают как одна последовательность. Нажмите на сферу, чтобы увидеть детали."}
            </p>
          </div>

          <div data-reveal className="ecosystem-visual-col" ref={visualColRef} tabIndex={-1}>
            <EcosystemSceneLoader
              processes={ecosystemProcesses}
              mode={mode}
              activeId={activeId}
              onSelect={setActiveId}
              quality={quality}
              device={device}
            />
            <EcosystemArrows onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            <EcosystemDial
              count={ecosystemProcesses.length}
              activeIndex={currentIndex}
              currentLabel={currentLabel}
              onSelectIndex={(index) => setActiveId(ecosystemProcesses[index].id)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScenarioModal({
  module,
  onClose,
}: {
  module: Module;
  onClose: () => void;
}) {
  const Icon = module.icon;

  return (
    <PremiumModal
      open
      onClose={onClose}
      titleId="scenario-title"
      panelClassName="!bg-[#0d1013] !border-white/10 md:h-auto md:max-h-[92svh] md:max-w-4xl"
    >
      <div className="scenario-modal-body flex min-h-0 flex-1 flex-col overflow-y-auto p-5 text-porcelain md:p-7">
        <div className="flex flex-col gap-5 pr-12 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-porcelain text-ink shadow-glow">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet">Интерактивный модуль</p>
            <h3 id="scenario-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              {module.title}
            </h3>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-porcelain/62">{module.intro}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-porcelain/32">Что делает</p>
            <div className="grid gap-3">
              {module.what.map((item) => (
                <p key={item} className="flex gap-3 text-base leading-7 text-porcelain/76">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-violet" />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-porcelain p-5 text-ink">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-ink/42">Каналы</p>
            <div className="flex flex-wrap gap-2">
              {module.channels.map((channel) => (
                <span key={channel} className="rounded-full border border-ink/10 bg-ink/[0.035] px-3 py-2 text-sm">
                  {channel}
                </span>
              ))}
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-ink/42">Практический эффект</p>
            <p className="mt-3 text-xl font-medium leading-8 tracking-[-0.02em]">{module.result}</p>
          </div>
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-porcelain/32">Пример сценария</p>
          <div className="grid gap-3">
            {module.scenario.map((step, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * index }}
                className="flex gap-4 rounded-[1.2rem] border border-white/10 bg-black/18 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet/18 text-sm font-semibold text-violet">
                  {index + 1}
                </span>
                <p className="text-base leading-7 text-porcelain/76">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => {
              onClose();
              window.setTimeout(() => scrollToSection("ai-анализ"), 40);
            }}
            className="bg-porcelain text-ink hover:bg-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Разобрать мой бизнес
          </Button>
          <Button asChild variant="glass" className="border-white/12 bg-white/8 text-porcelain hover:bg-white/12">
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          <Button asChild variant="glass" className="border-white/12 bg-white/8 text-porcelain hover:bg-white/12">
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer">
              <Send className="mr-2 h-4 w-4" />
              Telegram
            </a>
          </Button>
        </div>
      </div>
    </PremiumModal>
  );
}

/** Which richer `modules` entry (with its "what it does" bullets and demo scenario) best
 * matches each priced `serviceCatalog` line — hand-mapped once, not fuzzy-matched, since the two
 * catalogues don't share ids and only partially overlap by title. Kept deliberately real: every
 * bullet shown still comes verbatim from an existing modules[] entry, never invented copy. */
const catalogModuleMatch: Partial<Record<ServiceId, string>> = {
  ai: "assistant",
  telegram: "assistant",
  whatsapp: "assistant",
  site: "site",
  crm: "crm",
  automation: "automation",
};

/** Replaces the old "Возможности" (modules, no price) and "Услуги и стоимость" (price, no
 * detail) sections — they showed the same modules from two angles back to back. Now each module
 * is a single card: what it does + what it costs, positioned right before the calculator so the
 * flow reads Pricing -> Calculator -> Final cost -> CTA instead of Calculator -> Pricing. */
function ModulesPricingScene() {
  const { status, profile, content, input } = useBusiness();
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioModule = modules.find((module) => module.id === scenarioId) ?? null;
  const personalized = status === "ready" && profile && content;
  const focusModules = content?.focusModules ?? [];
  // Причина рекомендации — из ОДНОГО детерминированного источника (recommendCapabilities), не из AI.
  // Показываем один раз рядом с предложением, а не дублируем на каждой карточке. У generic ниши
  // нишевой причины НЕТ — не выдумываем (честность как на карточке анализа).
  const recommendedNiche = personalized && input ? resolveNiche(input).id : null;
  const recommendationReason =
    recommendedNiche && recommendedNiche !== "generic" ? recommendCapabilities(recommendedNiche).reason : null;

  return (
    <section id="стоимость" className="scene pricing-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Возможности и стоимость
          </p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Открытая стоимость</span>{" "}
            <span data-heading-line className="heading-line">без скрытых коэффициентов.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/62">
            {personalized
              ? `Отмечены модули, с которых стоит начать для «${profile.label}». Персональный расчёт — ниже.`
              : "Каждый модуль — понятный участок автоматизации со своей ценой. Персональный расчёт — ниже."}
          </p>
          {recommendationReason ? (
            <p className="pricing-recommend-reason mt-4 max-w-2xl" role="note">
              <span className="pricing-recommend-reason-label">Почему</span>
              {recommendationReason}
            </p>
          ) : null}
        </div>

        <div data-reveal className="card-field grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceCatalog.map((service) => {
            const Icon = service.icon;
            const recommended = personalized && focusModules.includes(service.title);
            const linkedModule = modules.find((module) => module.id === catalogModuleMatch[service.id]);
            return (
              <article
                key={service.id}
                className={cn(
                  "interactive-surface glass-panel relative rounded-[1.75rem] p-5",
                  recommended && "is-recommended",
                )}
              >
                {/* Плашка «Рекомендуем» стоит В ПОТОКЕ, а не абсолютом в правом верхнем углу.
                    Абсолют накладывался на кнопку «Сценарий», которая живёт в том же углу, и
                    два слова читались как одна нечитаемая надпись. Ряд переносится, поэтому
                    длинный текст уходит на вторую строку вместо наложения. */}
                <div className="card-head flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <Icon className="h-6 w-6 shrink-0 text-violet" />
                  <div className="card-head-tags flex min-w-0 flex-wrap items-center justify-end gap-2">
                    {/* Ярлык категории: канал ≠ возможность ≠ основа — устраняет прежнюю ошибку,
                        когда AI/Telegram/WhatsApp читались как три равных продукта. */}
                    <span className={cn("product-kind", `product-kind-${service.kind}`)}>
                      {PRODUCT_KIND_LABEL[service.kind]}
                    </span>
                    {recommended ? <span className="hero-recommend-badge">Рекомендуем</span> : null}
                    {linkedModule ? (
                      <button type="button" className="capability-demo" onClick={() => setScenarioId(linkedModule.id)}>
                        <Zap className="h-3.5 w-3.5" /> Сценарий
                      </button>
                    ) : null}
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-base leading-7 text-ink/58">{service.description}</p>
                <p className="mt-2 text-sm leading-6 text-ink/44">{service.forWhom}</p>
                {linkedModule ? (
                  <ul className="mt-4 grid gap-1.5">
                    {linkedModule.what.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-6 text-ink/70">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                        {item.replace(/\.$/, "")}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="price-display mt-6 text-xl font-semibold">{priceLabel(service)}</p>
                {/* Семантика цены: разово / +50k / включено / по составу — клиент не гадает. */}
                <p className="mt-1 text-xs leading-5 text-ink/44">{service.priceNote}</p>
              </article>
            );
          })}
        </div>

        {/* ОДИН policy-блок сопровождения на всю поверхность (Pricing pass): относится ко ВСЕМ
            оплачиваемым решениям, а не повторяется строкой на каждой карточке. Единый источник —
            SUPPORT_POLICY. Никакого 24/7. */}
        <div data-reveal className="pricing-support-policy" title={SUPPORT_SCOPE_TITLE}>
          <ShieldCheck className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
          <p>
            <strong>{SUPPORT_POLICY.summary}.</strong>{" "}
            Входит: {SUPPORT_POLICY.includes.join(", ")}. Не входит: {SUPPORT_POLICY.excludes.join(", ")}.
          </p>
        </div>
      </div>
      {scenarioModule ? (
        <ScenarioModal module={scenarioModule} onClose={() => setScenarioId(null)} />
      ) : null}
    </section>
  );
}

export function PricingCalculatorScene({
  initialForm,
  onPricingChange,
}: {
  /** Restores a previously-saved selection (e.g. reopening a project) instead of starting the
   * wizard from scratch. */
  initialForm?: EstimateForm;
  /** Fired with the current form + calculated result whenever the user has selected at least
   * one service — not on the untouched default, so opening the tab alone doesn't record a
   * "priced" project. Works exactly the same with no props (used standalone on the landing page). */
  onPricingChange?: (form: EstimateForm, result: EstimateResult) => void;
} = {}) {
  // Уже известный business context с лендинга: не спрашиваем сферу второй раз (Pricing pass §4).
  // Ниша — из единого источника (resolveNiche/detectBusiness внутри business-context), здесь только
  // читаем распознанную метку. Явный выбор в калькуляторе всегда сильнее автоопределения.
  const { status: businessStatus, profile: businessProfile } = useBusiness();
  const contextBusiness =
    businessStatus === "ready" && businessProfile?.recognized ? businessProfile.label : null;

  const [form, setForm] = useState<EstimateForm>(() =>
    normalizeForm(
      initialForm ?? { ...initialEstimateForm, businessType: contextBusiness ?? initialEstimateForm.businessType },
    ),
  );
  const [step, setStep] = useState(0);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const localEstimate = calculateEstimate(form);
  // Калькулятор, а не AI-продавец (§3): считаем ВЫБРАННУЮ конфигурацию детерминированно, без сетевого
  // запроса за «рекомендованной ценой для вашего бизнеса». Memo — чтобы ссылка менялась только при
  // смене form (иначе onPricingChange-эффект зациклил бы родителя).
  const finalEstimate = useMemo(() => buildFallbackEstimate(form), [form]);
  const requestText = buildRequestText(form, finalEstimate);
  const wizardSteps = ["Бизнес", "Решения", "Масштаб", "Задача", "Результат"];
  const canShowResult = form.selectedServices.length > 0;
  const canSendRequest = Boolean(form.contactName.trim() && form.contactHandle.trim());

  useEffect(() => {
    if (canShowResult) onPricingChange?.(form, finalEstimate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, finalEstimate, canShowResult]);

  const openCalculator = () => {
    // Если сферу уже знаем из контекста — подставляем её и начинаем со «Решений», пропуская
    // повторный вопрос. Пользователь может вернуться на шаг «Бизнес» и изменить выбор.
    if (!initialForm && contextBusiness) {
      setForm((current) => ({ ...current, businessType: contextBusiness }));
      setStep(1);
    }
    setCalculatorOpen(true);
  };

  const updateForm = (patch: Partial<EstimateForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  // Короткое объяснение, почему нельзя снять ядро при активном канале (§2). Гасится сам через таймер.
  const [dependencyHint, setDependencyHint] = useState<string | null>(null);

  const toggleService = (serviceId: ServiceId) => {
    setForm((current) => {
      const exists = current.selectedServices.includes(serviceId);

      // Двусторонняя зависимость: нельзя снять продукт, от которого зависит выбранный канал —
      // иначе остался бы «висячий» WhatsApp/Telegram без ядра. Явно не даём и объясняем причину,
      // никаких скрытых изменений конфигурации (§2).
      if (exists) {
        const dependents = current.selectedServices.filter(
          (id) => PRODUCT_BY_ID.get(id)?.dependsOn === serviceId,
        );
        if (dependents.length) {
          const names = dependents.map((id) => PRODUCT_BY_ID.get(id)?.title ?? id).join(", ");
          const self = PRODUCT_BY_ID.get(serviceId)?.title ?? serviceId;
          setDependencyHint(`«${self}» нужен для канала ${names} — сначала снимите канал.`);
          return current; // конфигурацию не меняем
        }
      }

      let nextServices = exists
        ? current.selectedServices.filter((id) => id !== serviceId)
        : [...current.selectedServices, serviceId];

      // Каналы (Telegram/WhatsApp) работают ПОВЕРХ ядра: выбор канала явно включает AI-консультанта,
      // а не притворяется самостоятельным дешёвым «ботом» (§8). Никаких скрытых добавлений — Core
      // виден в списке позиций.
      if (!exists) nextServices = withDependencies(nextServices) as ServiceId[];
      setDependencyHint(null);

      return {
        ...current,
        selectedServices: nextServices.length ? nextServices : current.selectedServices,
      };
    });
  };

  // Просто переход к следующему шагу: никакого AI-запроса за «рекомендованной ценой» (§3). Итог —
  // детерминированный расчёт выбранной конфигурации (finalEstimate) — считается синхронно.
  const nextStep = () => {
    setStep((current) => Math.min(current + 1, wizardSteps.length - 1));
  };

  const oldPrice = localEstimate.requiresCustom ? null : localEstimate.adjustedTotal;
  const newPrice = localEstimate.requiresCustom ? null : localEstimate.discountedTotal;

  return (
    <section className="scene pricing-cta-scene relative flex items-center overflow-hidden" aria-labelledby="pricing-cta-title">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="pricing-compact-cta interactive-surface">
          <div>
            <p>Следующий шаг</p>
            <h2 id="pricing-cta-title">Рассчитать стоимость проекта</h2>
            <span>Выберите нужные решения и получите предварительный диапазон стоимости.</span>
            <small>Точная стоимость определяется после короткого разбора задачи.</small>
          </div>
          <div className="pricing-compact-summary">
            <span>{form.selectedServices.length} модулей</span>
            <strong>{localEstimate.rangeText}</strong>
          </div>
          <Button type="button" onClick={openCalculator}>
            Открыть калькулятор <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <PremiumModal
          open={calculatorOpen}
          onClose={() => setCalculatorOpen(false)}
          titleId="estimate-modal-title"
          panelClassName="md:h-[90svh] md:max-w-5xl"
        >
          <div className="estimate-modal-shell">
          <div className="aevix-ai-panel estimate-modal-panel border border-white/70 bg-white/58 p-5 shadow-object backdrop-blur-2xl md:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-ink/8 pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-violet">Получить персональный расчёт</p>
                <h3 id="estimate-modal-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                  Соберите предварительный план проекта
                </h3>
              </div>
              <div className="rounded-2xl border border-ink/8 bg-white/70 p-4 text-sm text-ink/58">
                <p>Прогресс</p>
                <p className="mt-1 font-semibold text-ink">{step + 1} / {wizardSteps.length}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {wizardSteps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                    index === step
                      ? "border-ink bg-ink text-porcelain"
                      : index < step
                        ? "border-violet/25 bg-violet/10 text-ink"
                        : "border-ink/8 bg-white/54 text-ink/50 hover:bg-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6 min-h-[24rem]">
              {step === 0 ? (
                <div className="grid gap-4">
                  {/* Если сферу распознали из описания — показываем это, а не спрашиваем заново. Явный
                      выбор ниже всегда сильнее автоопределения (§4/§5). */}
                  {contextBusiness ? (
                    <p className="rounded-2xl border border-violet/14 bg-violet/8 px-4 py-3 text-sm text-ink/64">
                      Определили по вашему описанию: <strong className="text-ink">{form.businessType}</strong>. Можно оставить или выбрать другую сферу.
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {businessTypeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={form.businessType === option}
                        onClick={() => updateForm({ businessType: option })}
                        className={cn(
                          "interactive-surface rounded-[1.35rem] border p-4 text-left text-lg font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                          form.businessType === option ? "border-violet/32 bg-violet/10 shadow-object" : "border-ink/8 bg-white/56 hover:bg-white",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {/* Другая сфера: свободный ввод. Отдельного словаря ниш в калькуляторе нет —
                      identity, если понадобится, берётся каноническим resolveNiche над этим текстом. */}
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-ink/62">Другая сфера — впишите свою</span>
                    <input
                      value={businessTypeOptions.includes(form.businessType as BusinessType) ? "" : form.businessType}
                      onChange={(event) => updateForm({ businessType: event.target.value })}
                      className="rounded-2xl border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                      placeholder="Например: агентство недвижимости, стоматология, автосервис"
                    />
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {serviceCatalog.map((service) => {
                    const checked = form.selectedServices.includes(service.id);
                    const Icon = service.icon;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleService(service.id)}
                        className={cn(
                          "interactive-surface rounded-[1.35rem] border p-4 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                          checked ? "border-violet/32 bg-violet/10 shadow-object" : "border-ink/8 bg-white/56 hover:bg-white",
                        )}
                      >
                        <Icon className="h-5 w-5 text-violet" />
                        <span className="mt-5 block text-lg font-semibold">{service.title}</span>
                        <span className="mt-2 block text-sm leading-6 text-ink/54">{service.description}</span>
                      </button>
                    );
                  })}
                  {/* Почему нельзя снять ядро при активном канале (§2). */}
                  {dependencyHint ? (
                    <p className="calc-note sm:col-span-2" role="status">{dependencyHint}</p>
                  ) : null}
                  {/* CRM входит в scope автоматизации — отдельно не суммируется (§3). */}
                  {localEstimate.crmInAutomation ? (
                    <p className="calc-note sm:col-span-2">
                      CRM входит в комплексную автоматизацию — отдельно её стоимость не добавляем.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {branchOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={form.branchCount === option}
                      onClick={() => updateForm({ branchCount: option })}
                      className={cn(
                        "interactive-surface rounded-[1.35rem] border p-5 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                        form.branchCount === option ? "border-violet/32 bg-violet/10 shadow-object" : "border-ink/8 bg-white/56 hover:bg-white",
                      )}
                    >
                      <span className="block text-2xl font-semibold tracking-[-0.03em]">{option}</span>
                      <span className="mt-2 block text-sm text-ink/54">
                        {option === "2–5" ? "+20% к базовой стоимости" : option === "6–10" ? "+40% к базовой стоимости" : option === "больше 10" ? "индивидуальный расчет" : "без филиальной поправки"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-ink/62">Что сейчас отнимает больше всего времени</span>
                    <textarea
                      value={form.manualWork}
                      onChange={(event) => updateForm({ manualWork: event.target.value })}
                      rows={4}
                      maxLength={900}
                      className="min-h-28 resize-none rounded-[1.35rem] border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                      placeholder="Например: запись клиентов, ответы в WhatsApp, напоминания, перенос заявок в таблицу"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-ink/62">Какие сервисы уже используются</span>
                    <textarea
                      value={form.currentServices}
                      onChange={(event) => updateForm({ currentServices: event.target.value })}
                      rows={3}
                      maxLength={900}
                      className="min-h-24 resize-none rounded-[1.35rem] border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                      placeholder="Например: Google Sheets, amoCRM, Yclients, Instagram, WhatsApp"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-ink/62">Имя</span>
                      <input
                        value={form.contactName}
                        onChange={(event) => updateForm({ contactName: event.target.value })}
                        className="rounded-2xl border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                        placeholder="Алан"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-ink/62">WhatsApp или Telegram</span>
                      <input
                        value={form.contactHandle}
                        onChange={(event) => updateForm({ contactHandle: event.target.value })}
                        className="rounded-2xl border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                        placeholder="+7... или @username"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-ink/62">Email необязателен</span>
                      <input
                        value={form.contactEmail}
                        onChange={(event) => updateForm({ contactEmail: event.target.value })}
                        className="rounded-2xl border border-ink/8 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-violet/35"
                        placeholder="mail@example.com"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="grid gap-4">
                  <div className="rounded-[1.5rem] border border-violet/14 bg-violet/[0.055] p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-violet">Выбранная конфигурация</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {finalEstimate.recommendedModules.map((module) => (
                        <span key={module} className="rounded-full border border-ink/8 bg-white/74 px-3 py-2 text-sm text-ink/72">
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="rounded-[1.5rem] border border-ink/8 bg-white/74 p-5">
                      <p className="text-sm text-ink/46">Стоимость выбранной конфигурации</p>
                      <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{finalEstimate.estimatedRange}</p>
                      {oldPrice && newPrice ? (
                        <div className="mt-5 grid gap-2 text-sm text-ink/58">
                          <p>Скидка на базовую стоимость первых проектов: {Math.round(FIRST_PROJECT_DISCOUNT * 100)}%.</p>
                          <p>Старая цена: <span className="line-through">{formatKzt(oldPrice)}</span></p>
                          <p>Новая цена: <span className="font-semibold text-ink">{formatKzt(newPrice)}</span></p>
                          <p>Экономия: <span className="font-semibold text-violet">{formatKzt(localEstimate.discount)}</span></p>
                        </div>
                      ) : null}
                      <p className="mt-5 text-sm leading-6 text-ink/54">
                        Точная стоимость определяется после короткого разбора задач и интеграций.
                      </p>
                      {localEstimate.requiresClarification ? (
                        <p className="mt-3 rounded-2xl border border-violet/14 bg-violet/8 px-4 py-3 text-sm text-ink/62">
                          По интеграциям требуется уточнение.
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-[1.5rem] border border-ink/8 bg-white/74 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-ink/38">Предварительный план</p>
                      <p className="mt-3 text-base leading-7 text-ink/68">{finalEstimate.summary}</p>
                      <div className="mt-4 grid gap-2">
                        {finalEstimate.implementationSteps.map((item) => (
                          <p key={item} className="flex gap-2 text-sm leading-6 text-ink/64">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-ink/8 bg-white/74 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-ink/38">Отправить расчёт</p>
                    <p className="mt-3 text-sm leading-6 text-ink/58">
                      Заявка сформируется из введённых данных.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {canSendRequest ? (
                        <Button asChild>
                          <a href={buildContactHref("whatsapp", requestText)} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            WhatsApp
                          </a>
                        </Button>
                      ) : (
                        <Button type="button" disabled className="disabled:cursor-not-allowed disabled:opacity-45">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </Button>
                      )}
                      {canSendRequest ? (
                        <Button asChild variant="glass">
                          <a href={buildContactHref("telegram", requestText)} target="_blank" rel="noreferrer">
                            <Send className="mr-2 h-4 w-4" />
                            Telegram
                          </a>
                        </Button>
                      ) : (
                        <Button type="button" variant="glass" disabled className="disabled:cursor-not-allowed disabled:opacity-45">
                          <Send className="mr-2 h-4 w-4" />
                          Telegram
                        </Button>
                      )}
                      {canSendRequest ? (
                        <Button asChild variant="glass">
                          <a href={buildContactHref("email", requestText)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                          </a>
                        </Button>
                      ) : (
                        <Button type="button" variant="glass" disabled className="disabled:cursor-not-allowed disabled:opacity-45">
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </Button>
                      )}
                    </div>
                    {!canSendRequest ? (
                      <p className="mt-3 text-sm text-ink/46">Для отправки укажите имя и WhatsApp или Telegram.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-ink/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="glass"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0}
                className="disabled:cursor-not-allowed disabled:opacity-45"
              >
                Назад
              </Button>
              <div className="text-sm text-ink/52">
                {localEstimate.requiresCustom ? "Для сети больше 10 точек нужен индивидуальный расчёт." : `Расчёт выбранной конфигурации: ${localEstimate.rangeText}`}
              </div>
              {step < wizardSteps.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canShowResult}>
                  {step === wizardSteps.length - 2 ? "Показать результат" : "Далее"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" variant="glass" onClick={() => setCalculatorOpen(false)}>
                  Готово
                </Button>
              )}
            </div>
          </div>
        </div>
        </PremiumModal>
      </div>
    </section>
  );
}

/** Replaces the old industry-picker ("Сценарии применения" tabs for coffee shop/salon/clinic) —
 * that block is explicitly excluded from the rebuilt site structure. What's kept is the
 * genuinely useful part: a personalized, honest "as it was / what we automated / what we got"
 * breakdown driven by the visitor's own described business (never a fabricated client story,
 * consistent with FounderScene's own "no invented clients" principle). Paired directly with the
 * calculator right after it — proof of value immediately before the price. */
function ResultsScene() {
  const { status, profile, content } = useBusiness();
  const personalized = status === "ready" && profile && content;

  const genericCards: Array<[string, string, string]> = [
    ["01", "Как было", "Команда вручную отвечает в нескольких чатах, часть заявок и звонков теряется в потоке."],
    ["02", "Что автоматизировали", "AI-консультант, единая очередь обращений и CRM с понятными статусами."],
    ["03", "Что получилось", "Ни одно обращение не теряется, а владелец видит всю картину в одном месте."],
  ];

  return (
    <section id="результаты" className="scene results-scene flex items-center text-ink">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">Результаты</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Как это выглядит на практике</span>
          </h2>
          {!personalized ? (
            <p className="mt-4 text-lg leading-7 text-ink/52">
              Иллюстративный пример, а не результат конкретного клиента — опишите свой бизнес выше, чтобы увидеть
              персональный сценарий.
            </p>
          ) : null}
        </div>

        {personalized ? (
          <motion.div
            key={profile.category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTransition.slower}
            className="hero-personal-case mb-6 rounded-[2rem] border border-violet/18 bg-gradient-to-br from-white via-[#f8f4ff] to-[#eef1f7] p-6"
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-violet">
              <Sparkles className="h-4 w-4" /> Ваш сценарий · {profile.label}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {(
                [
                  ["01", "Как было", content.caseBefore],
                  ["02", "Что автоматизировали", content.caseAutomated],
                  ["03", "Что получилось", content.caseResult],
                ] as Array<[string, string, string]>
              ).map(([index, title, text]) => (
                <div key={title} className="interactive-surface glass-panel relative rounded-2xl border border-ink/8 bg-white/70 p-5">
                  <span className="price-display text-sm font-semibold text-violet/70">{index}</span>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-violet">{title}</p>
                  <p className="mt-3 text-base leading-7 text-ink/74">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="card-field grid gap-4 lg:grid-cols-3">
            {genericCards.map(([index, title, text]) => (
              <div key={title} className="interactive-surface glass-panel relative overflow-hidden rounded-[2rem] border border-ink/8 bg-white/62 p-6">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet/30 to-transparent" />
                <span className="price-display text-sm font-semibold text-violet/70">{index}</span>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-violet">{title}</p>
                <p className="mt-3 text-xl leading-8 text-ink/78">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FounderScene() {
  return (
    <section id="кто-мы" className="scene founder-scene flex items-center">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div data-reveal className="dark-glass rounded-lg p-7 text-porcelain">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-porcelain text-ink">
            <UserRound className="h-8 w-8" />
          </div>
          <p className="mt-10 text-sm uppercase tracking-[0.28em] text-violet">Founder & CEO</p>
          <h2 className="founder-name mt-3 font-semibold">Kossybayev Alan</h2>
          <p className="mt-5 text-lg leading-8 text-porcelain/58">
            AEVIX превращает повторяющиеся действия бизнеса в понятные цифровые системы.
          </p>
        </div>
        <div data-reveal className="card-field grid gap-4 md:grid-cols-2">
          {[
            ["Фокус", "Малый бизнес: салоны, магазины, кофейни, рестораны и локальные сети."],
            ["Подход", "Разбор процесса, понятные сценарии и аккуратная автоматизация без лишней сложности."],
            ["Честность", "Без выдуманных клиентов, фальшивых логотипов и неподтвержденных результатов."],
            ["Связь", "Обсудить задачу можно через WhatsApp, Telegram или email."],
          ].map(([title, text]) => (
            <div key={title} className="founder-note rounded-lg border border-ink/8 bg-white/58 p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-violet">{title}</p>
              <p className="mt-7 text-xl leading-8 text-ink/68">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const onboardingSteps = [
  ["Диагностика", "Разбираем текущий процесс, каналы обращений и ручные шаги команды."],
  ["Проектирование", "Собираем сценарий: какие модули нужны и как они связаны друг с другом."],
  ["Сборка", "Настраиваем AI, CRM, запись и сценарии под конкретный бизнес."],
  ["Запуск", "Проверяем на реальных обращениях и подключаем команду."],
  ["Поддержка и развитие", "Донастраиваем сценарии по мере роста и новых задач."],
];

/** The onboarding path — five fixed, numbered steps, not a long feature grid. */
function OnboardingProcessScene() {
  return (
    <section id="процесс" className="scene onboarding-scene flex items-center">
      <div className="mx-auto w-full max-w-6xl">
        <div data-reveal className="mb-10 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">Как проходит подключение</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Понятный путь от разбора до запуска</span>
          </h2>
        </div>
        <div data-reveal className="onboarding-steps grid gap-4 md:grid-cols-5">
          {onboardingSteps.map(([title, text], index) => (
            <div key={title} className="onboarding-step interactive-surface glass-panel">
              <span className="onboarding-step-index">{index + 1}</span>
              <p className="onboarding-step-title">{title}</p>
              <p className="onboarding-step-text">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqScene() {
  const { status, profile, content } = useBusiness();
  const personalized = status === "ready" && profile && content;
  const faq = personalized ? content.faq : getBusinessContent("generic").faq;
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="scene faq-scene flex items-center">
      <div className="mx-auto w-full max-w-4xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            {personalized ? `FAQ · ${profile.label}` : "Частые вопросы"}
          </p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">
              {personalized ? "Ответы под ваш бизнес." : "Короткие ответы на частые вопросы."}
            </span>
          </h2>
        </div>
        <div data-reveal className="grid gap-2.5">
          {faq.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q} className={cn("faq-item", isOpen && "is-open")}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="faq-question"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={cn("faq-chevron h-4 w-4 shrink-0", isOpen && "rotate-180")} />
                </button>
                <div className="faq-answer" aria-hidden={!isOpen}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type LeadStatus = "idle" | "sending" | "sent" | "error";

function ContactScene() {
  const { status, profile, content, input } = useBusiness();
  const personalized = status === "ready" && profile && content;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [business, setBusiness] = useState("");
  const [task, setTask] = useState("");
  // Honeypot: люди этого поля не видят и не заполняют; заполненное = бот (см. api/lead).
  const [company, setCompany] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  const syncedRef = useRef("");

  // Prefill the business field with what the visitor already described in the Hero.
  useEffect(() => {
    if (input && input !== syncedRef.current) {
      syncedRef.current = input;
      setBusiness(input);
    }
  }, [input]);

  const canSend = name.trim().length > 0 && contact.trim().length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Защита от двойного submit: пока запрос в полёте, повторный клик игнорируется — иначе двойной
    // клик отправил бы два одинаковых письма.
    if (!canSend || leadStatus === "sending") return;
    setLeadStatus("sending");
    const niche = personalized ? profile.label : "";
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          business: business.trim(),
          task: task.trim(),
          niche,
          company, // honeypot
        }),
      });
      // Success ТОЛЬКО после реального подтверждения сервера — не оптимистично. При любой неудаче
      // остаёмся в error, а введённые данные в полях сохраняются для Retry.
      const data = response.ok ? ((await response.json().catch(() => null)) as { ok?: boolean } | null) : null;
      setLeadStatus(data?.ok ? "sent" : "error");
    } catch {
      setLeadStatus("error");
    }
  };

  return (
    <section id="контакты" className="scene contact-scene flex items-center">
      <div className="mx-auto w-full max-w-6xl">
        <div data-reveal className="dark-glass overflow-hidden rounded-[2.2rem] p-7 text-porcelain md:p-10">
          <div className="mb-10 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.32em] text-porcelain/42">AEVIX</span>
            <ShieldCheck className="h-6 w-6 text-violet" />
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <h2 className="contact-title text-balance font-semibold">
                <span data-heading-line className="heading-line">Оставьте заявку —</span>{" "}
                <span data-heading-line className="heading-line">вернёмся с планом.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-porcelain/58">
                {personalized
                  ? `Соберём систему под «${profile.label}»: ${profile.automations[0]?.toLowerCase()}, CRM и напоминания в одном контуре.`
                  : "Опишите бизнес — вернёмся с первым сценарием автоматизации, ориентиром по цене и срокам."}
              </p>
              <ul className="contact-assurances mt-7">
                {[
                  [Clock3, "Отвечаем в течение рабочего дня"],
                  [ShieldCheck, "Без обязательств и предоплаты за разбор"],
                  [Workflow, "Этапы и цена — до старта работ"],
                ].map(([Icon, label]) => (
                  <li key={label as string}>
                    <Icon className="h-4 w-4 text-violet" />
                    {label as string}
                  </li>
                ))}
              </ul>
            </div>

            <div className="contact-form-card">
              {leadStatus === "sent" ? (
                <div className="contact-sent" role="status">
                  <span className="contact-sent-mark">
                    <Check className="h-6 w-6" />
                  </span>
                  <p className="text-lg font-semibold text-porcelain">Заявка отправлена</p>
                  <p className="mt-2 text-sm text-porcelain/58">
                    Мы получили ваши данные и свяжемся с вами.
                  </p>
                  <button
                    type="button"
                    className="contact-sent-again"
                    onClick={() => {
                      setLeadStatus("idle");
                      setName("");
                      setContact("");
                      setTask("");
                    }}
                  >
                    Отправить ещё одну заявку
                  </button>
                </div>
              ) : (
                <form className="lead-form" onSubmit={submit}>
                  <label className="lead-field">
                    <span>Имя</span>
                    <input
                      className="lead-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Как к вам обращаться"
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className="lead-field">
                    <span>Телефон, Telegram или WhatsApp</span>
                    <input
                      className="lead-input"
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      placeholder="+7… или @username"
                      required
                    />
                  </label>
                  <label className="lead-field">
                    <span>Ваш бизнес</span>
                    <textarea
                      className="lead-input lead-textarea"
                      value={business}
                      onChange={(event) => setBusiness(event.target.value)}
                      placeholder="Например: барбершоп на 3 мастера, запись вручную"
                      rows={2}
                    />
                  </label>
                  <label className="lead-field">
                    <span>Что хотите автоматизировать <span className="lead-optional">(необязательно)</span></span>
                    <input
                      className="lead-input"
                      value={task}
                      onChange={(event) => setTask(event.target.value)}
                      placeholder="Запись, ответы клиентам, напоминания…"
                    />
                  </label>
                  {/* Honeypot: вне потока, скрыт от людей и скринридеров, ловит ботов. */}
                  <input
                    className="lead-hp"
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                  {leadStatus === "error" ? (
                    <p className="lead-error" role="alert">
                      Не удалось отправить заявку. Попробуйте ещё раз.
                    </p>
                  ) : null}
                  <Button type="submit" disabled={!canSend || leadStatus === "sending"} className="lead-submit w-full">
                    {leadStatus === "sending"
                      ? "Отправляем…"
                      : leadStatus === "error"
                        ? "Попробовать снова"
                        : personalized && content
                          ? content.ctaLabel
                          : "Отправить заявку"}
                    {leadStatus === "sending" ? null : <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                  <p className="lead-note">
                    Заявка придёт нам на почту. Или напишите напрямую:{" "}
                    <a href={contacts.telegram.href} target="_blank" rel="noreferrer">Telegram</a>
                    {" · "}
                    <a href={contacts.email.href}>почта</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterScene() {
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);

  return (
    <footer className="premium-footer">
      <div className="mx-auto max-w-7xl">
        <div className="premium-footer-grid">
          <div className="premium-footer-brand">
            <span>AX</span>
            <strong>AEVIX</strong>
            <p>Интерактивные цифровые системы для малого бизнеса.</p>
          </div>
          <nav aria-label="Продукты AEVIX">
            <p>Продукты</p>
            <Link href="/app">Workspace</Link>
            <a href="#ai-анализ">AI</a>
            <a href="#стоимость">Сайты</a>
            <a href="#стоимость">Автоматизация</a>
            <a href="#стоимость">Telegram</a>
            <a href="#ai-анализ">Концепты сайтов</a>
          </nav>
          <nav aria-label="Ресурсы AEVIX">
            <p>Ресурсы</p>
            <a href="#faq">FAQ</a>
            <button type="button" onClick={() => setLegal("privacy")}>Privacy Policy</button>
            <button type="button" onClick={() => setLegal("terms")}>Terms</button>
          </nav>
          <nav aria-label="Контакты AEVIX">
            <p>Контакты</p>
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer">Telegram</a>
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={contacts.email.href}>Email</a>
          </nav>
        </div>
        <div className="premium-footer-bottom">
          <span>© 2026 AEVIX</span>
          <span>Built by Alan Kossybayev</span>
        </div>
      </div>
      <LegalModal document={legal} onClose={() => setLegal(null)} />
    </footer>
  );
}

const PRIVACY_SECTIONS: Array<{ title: string; body: ReactNode }> = [
  {
    title: "Какие данные собираются",
    body: (
      <p>
        Через форму заявки и AI-консультанта мы получаем то, что вы сами вводите: имя, контакт
        (телефон, Telegram или WhatsApp), необязательные email, описание бизнеса и задачи.
        Никакие данные не собираются автоматически и без вашего ввода.
      </p>
    ),
  },
  {
    title: "Для чего используются",
    body: (
      <p>
        Только чтобы ответить на обращение, подготовить предварительный расчёт и обсудить проект.
        Мы не продаём и не передаём данные третьим лицам для маркетинга.
      </p>
    ),
  },
  {
    title: "Какие внешние сервисы участвуют",
    body: (
      <ul>
        <li>
          <strong>OpenAI</strong> — получает только описание бизнеса и задачи (для AI-анализа и
          генерации концепта сайта). Имя, телефон, Telegram, WhatsApp и email в OpenAI не
          передаются.
        </li>
        <li>
          <strong>Resend</strong> — используется только чтобы продублировать заявку с формы на
          рабочую почту студии; данные обрабатывает исключительно для этой доставки.
        </li>
      </ul>
    ),
  },
  {
    title: "Cookies и аналитика",
    body: <p>Сайт не использует рекламные cookies и системы отслеживания посетителей.</p>,
  },
  {
    title: "Хранение и удаление",
    body: (
      <p>
        Данные заявки хранятся ровно столько, сколько нужно, чтобы обсудить и завершить проект.
        Чтобы запросить удаление или уточнить, какие данные о вас есть, напишите на{" "}
        <a href={contacts.email.href}>{contacts.email.value}</a>.
      </p>
    ),
  },
];

const TERMS_SECTIONS: Array<{ title: string; body: ReactNode }> = [
  {
    title: "Предварительный характер расчётов",
    body: (
      <p>
        Стоимость, сроки и состав работ на сайте — ориентировочные и основаны на введённых вами
        данных. Это не окончательная оферта: финальные условия фиксируются после разбора задачи.
      </p>
    ),
  },
  {
    title: "AI-анализ и концепты сайтов",
    body: (
      <p>
        Ответы AI-консультанта и сгенерированные концепты сайтов — иллюстративные сценарии
        автоматизации и предварительные визуальные макеты, а не готовый продукт и не гарантия
        конкретного результата, роста выручки или сроков.
      </p>
    ),
  },
  {
    title: "Связь и обращения",
    body: (
      <p>
        Отправляя заявку через сайт, WhatsApp, Telegram или email, вы соглашаетесь, что мы можем
        связаться с вами по указанному контакту, чтобы обсудить проект.
      </p>
    ),
  },
];

function LegalModal({ document: activeDocument, onClose }: { document: "privacy" | "terms" | null; onClose: () => void }) {
  const sections = activeDocument === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <PremiumModal
      open={activeDocument !== null}
      onClose={onClose}
      titleId="legal-modal-title"
      panelClassName="md:h-auto md:max-h-[85svh] md:max-w-2xl"
    >
      <div className="legal-modal">
        <h2 id="legal-modal-title">{activeDocument === "privacy" ? "Privacy Policy" : "Terms"}</h2>
        <div className="legal-modal-body">
          {sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </PremiumModal>
  );
}

function StructuredData() {
  const data = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: "AEVIX",
      url: "https://aevix.vercel.app",
      founder: {
        "@type": "Person",
        name: "Kossybayev Alan",
        jobTitle: "Founder & CEO",
      },
      email: contacts.email.value,
      sameAs: [contacts.telegram.href, contacts.whatsapp.href],
      areaServed: "Kazakhstan",
      description:
        "AEVIX создает цифровые системы для малого бизнеса: AI-консультанты, боты, сайты, CRM-интеграции, запись, напоминания и сбор отзывов.",
      serviceType: [
        "AI-консультанты",
        "Telegram и WhatsApp-боты",
        "Автоматизация записи и заявок",
        "Сайты",
        "CRM-интеграции",
      ],
    }),
    [],
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Owns the live accent. When a business is recognised, its accent RGB is written to the
 * shell's registered `--accent-*` channels and the whole product re-themes with a smooth,
 * inherited transition (see globals.css). Idle falls back to the AEVIX violet.
 */

/**
 * Free-consultation popup. Opened by every generic "get in touch" CTA (header, Navigation
 * Center, analysis result) so those never scroll or jump — they surface a channel picker.
 * The direct WhatsApp/Telegram/email links at the end of the page stay direct.
 */
export function ConsultationModal() {
  const { consultationOpen, closeConsultation, input, status, profile } = useBusiness();
  const personalized = status === "ready" && profile;
  const intro = "Здравствуйте! Хочу записаться на бесплатную консультацию AEVIX.";
  const message = input.trim() ? `${intro}\nМой бизнес: ${input.trim()}` : intro;
  const whatsappHref = `${contacts.whatsapp.href}?text=${encodeURIComponent(message)}`;

  return (
    <PremiumModal
      open={consultationOpen}
      onClose={closeConsultation}
      titleId="consultation-title"
      panelClassName="md:h-auto md:max-w-md"
    >
      <div className="consult">
        <span className="consult-mark">
          <Sparkles className="h-6 w-6" />
        </span>
        <h2 id="consultation-title" className="consult-title">Бесплатная консультация</h2>
        <p className="consult-sub">
          Разберём {personalized ? `«${profile.label}»` : "ваш бизнес"} и предложим первый сценарий
          автоматизации. Без обязательств и предоплаты.
        </p>
        <div className="consult-options">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            onClick={closeConsultation}
            className="consult-option consult-wa"
          >
            <span className="consult-option-icon"><MessageCircle className="h-5 w-5" /></span>
            <span className="consult-option-body">
              <strong>WhatsApp</strong>
              <span>Ответим в рабочее время</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
          </a>
          <a
            href={contacts.telegram.href}
            target="_blank"
            rel="noreferrer"
            onClick={closeConsultation}
            className="consult-option consult-tg"
          >
            <span className="consult-option-icon"><Send className="h-5 w-5" /></span>
            <span className="consult-option-body">
              <strong>Telegram</strong>
              <span>{contacts.telegram.value}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        </div>
        <p className="consult-note">Сообщение уже готово — просто отправьте его в чат.</p>
      </div>
    </PremiumModal>
  );
}

export function LandingExperience() {
  usePremiumMotion();

  // BusinessProvider and MotionConfig now live in the root layout (shared with the Workspace
  // at /app so a described business carries over); this page only owns its own scene tree.
  return (
    <>
      <main>
        <StructuredData />
        <HeroScene />
        <WhatIsAevixScene />
        <AiConsultantScene />
        <ProblemsScene />
        <ModulesPricingScene />
        <PricingCalculatorScene />
        <ResultsScene />
        <FounderScene />
        <OnboardingProcessScene />
        <FaqScene />
        <ContactScene />
        <FooterScene />
      </main>
    </>
  );
}
