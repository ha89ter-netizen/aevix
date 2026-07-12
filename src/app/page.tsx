"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  Command,
  CreditCard,
  Globe2,
  Layers3,
  Mail,
  Menu,
  MessageCircle,
  MousePointer2,
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
import { cn } from "@/lib/utils";

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

type AnalysisResult = {
  summary: string;
  problems: string[];
  recommendations: string[];
  flow: string[];
  callToAction: string;
};

type ServiceId = "ai" | "telegram" | "whatsapp" | "site" | "crm" | "automation" | "nfc";
type BusinessType = "Барбершоп" | "Салон красоты" | "Магазин" | "Кофейня / ресторан" | "Локальная сеть" | "Другое";
type BranchCount = "1" | "2–5" | "6–10" | "больше 10";

type EstimateForm = {
  businessType: BusinessType;
  selectedServices: ServiceId[];
  branchCount: BranchCount;
  manualWork: string;
  currentServices: string;
  contactName: string;
  contactHandle: string;
  contactEmail: string;
};

type EstimateResult = {
  summary: string;
  recommendedModules: string[];
  estimatedRange: string;
  implementationSteps: string[];
  risks: string[];
  callToAction: string;
};

const navItems = [
  { label: "Главная", href: "#главная" },
  { label: "AI-анализ", href: "#ai-анализ" },
  { label: "Проблемы", href: "#проблемы" },
  { label: "Возможности", href: "#возможности" },
  { label: "Стоимость", href: "#стоимость" },
  { label: "Сценарии", href: "#сценарии" },
  { label: "Экосистема", href: "#торговый-бот" },
  { label: "Контакты", href: "#контакты" },
];

const contacts = {
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

const serviceCatalog: Array<{
  id: ServiceId;
  title: string;
  price: number;
  description: string;
  icon: IconComponent;
}> = [
  {
    id: "ai",
    title: "AI-консультант",
    price: 120_000,
    description: "Диалог, уточнение задачи и передача обращения команде.",
    icon: Bot,
  },
  {
    id: "telegram",
    title: "Telegram-бот",
    price: 150_000,
    description: "Заявки, ответы и сценарии внутри Telegram.",
    icon: Send,
  },
  {
    id: "whatsapp",
    title: "WhatsApp-бот",
    price: 180_000,
    description: "Ответы и сбор данных в привычном канале.",
    icon: MessageCircle,
  },
  {
    id: "site",
    title: "Сайт компании",
    price: 200_000,
    description: "Сайт, который объясняет услуги и собирает заявки.",
    icon: Globe2,
  },
  {
    id: "crm",
    title: "CRM",
    price: 0,
    description: "Заявки и статусы в одном рабочем контуре.",
    icon: Layers3,
  },
  {
    id: "automation",
    title: "Комплексная автоматизация",
    price: 350_000,
    description: "CRM-flow, напоминания и контроль процесса.",
    icon: Workflow,
  },
  {
    id: "nfc",
    title: "NFC",
    price: 0,
    description: "Бонус: быстрый вход в запись, каталог или отзывы.",
    icon: CreditCard,
  },
];

const initialEstimateForm: EstimateForm = {
  businessType: "Барбершоп",
  selectedServices: ["ai", "whatsapp"],
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

const automationScenarios = [
  {
    label: "Салон",
    customer: "Здравствуйте. Хочу записаться завтра после 17:00.",
    steps: ["AI понял запрос", "Проверил расписание", "Нашёл свободное окно", "Создал запись", "Обновил CRM", "Запланировал напоминание", "Отправил подтверждение"],
  },
  {
    label: "Ресторан",
    customer: "Добрый вечер. Нужен столик на четверых сегодня.",
    steps: ["AI уточнил время", "Проверил доступные столы", "Зафиксировал бронь", "Передал детали залу", "Обновил список гостей", "Подготовил напоминание", "Подтвердил бронь"],
  },
  {
    label: "Магазин",
    customer: "Есть ли этот аромат в наличии и можно ли забрать сегодня?",
    steps: ["AI распознал товар", "Проверил наличие", "Уточнил точку выдачи", "Создал заявку", "Обновил статус", "Передал заказ сотруднику", "Отправил подтверждение"],
  },
  {
    label: "Стоматология",
    customer: "Нужна консультация врача на этой неделе.",
    steps: ["AI уточнил задачу", "Подобрал специалиста", "Проверил расписание", "Предложил время", "Создал запись", "Обновил CRM", "Отправил памятку"],
  },
  {
    label: "Автосервис",
    customer: "Нужно проверить тормоза и записаться на диагностику.",
    steps: ["AI определил услугу", "Собрал данные автомобиля", "Проверил загрузку", "Предложил слот", "Создал заказ", "Назначил мастера", "Отправил подтверждение"],
  },
] as const;

const beforeAfterItems = {
  before: ["Ручные ответы", "Excel и таблицы", "Записи в блокноте", "Пропущенные сообщения", "Звонки без контекста"],
  after: ["AI-консультант", "Единая CRM", "Автоматические сценарии", "Понятные статусы", "Онлайн-запись"],
} as const;

const ecosystemModules = [
  { label: "Сайт", icon: Globe2, related: ["CRM", "Аналитика", "Платежи"] },
  { label: "Telegram", icon: Send, related: ["CRM", "Календарь", "AI"] },
  { label: "WhatsApp", icon: MessageCircle, related: ["CRM", "Календарь", "AI"] },
  { label: "Instagram", icon: Star, related: ["CRM", "AI", "Аналитика"] },
  { label: "CRM", icon: Layers3, related: ["Сайт", "Telegram", "WhatsApp", "Email", "Аналитика"] },
  { label: "Календарь", icon: CalendarCheck, related: ["Telegram", "WhatsApp", "CRM"] },
  { label: "Email", icon: Mail, related: ["CRM", "Аналитика"] },
  { label: "Аналитика", icon: TrendingUp, related: ["Сайт", "CRM", "Email", "Платежи"] },
  { label: "Платежи", icon: CreditCard, related: ["Сайт", "CRM", "Аналитика"] },
] as const;

const applicationScenarios = [
  {
    label: "Барбершоп / салон",
    now: "Клиенты пишут в разные чаты, администратор отвечает вручную и сверяет свободное время.",
    aevix: "AEVIX отвечает, уточняет услугу, предлагает время, фиксирует запись и запускает напоминание.",
    owner: "Владельцу проще видеть входящие обращения, загрузку команды и повторяющиеся вопросы.",
  },
  {
    label: "Магазин",
    now: "Покупатели уточняют наличие, цену, доставку и детали заказа в переписке.",
    aevix: "Система отвечает на типовые вопросы, собирает данные заказа и передает сложные случаи сотруднику.",
    owner: "Команда меньше отвлекается на одинаковые сообщения и быстрее понимает, что нужно клиенту.",
  },
  {
    label: "Кофейня / ресторан",
    now: "Гости спрашивают меню, бронь, адрес, доставку и акции в разных каналах.",
    aevix: "AEVIX помогает выбрать сценарий: бронь, меню, вопрос по заказу или обратная связь.",
    owner: "Повторяющиеся вопросы уходят в понятный сценарий, а команда остается в операционной работе.",
  },
  {
    label: "Локальная сеть",
    now: "Каждая точка работает по-своему, а обращения и статусы сложно собрать в одну картину.",
    aevix: "Система объединяет входящие обращения, статусы и контрольные действия в одном интерфейсе.",
    owner: "Проще сравнивать процессы между точками и видеть, где нужен управленческий фокус.",
  },
];

const roadmapStages = [
  ["Исследование", "Разбираем задачи, роли и текущий путь клиента."],
  ["Планирование", "Фиксируем модули, интеграции и границы первой версии."],
  ["Дизайн", "Проектируем интерфейс и понятные пользовательские сценарии."],
  ["Разработка", "Собираем рабочие модули и соединяем их с бизнес-процессом."],
  ["Тестирование", "Проверяем реальные обращения, роли и крайние ситуации."],
  ["Запуск", "Подключаем систему к рабочим каналам и данным."],
  ["Поддержка", "Наблюдаем за процессом и уточняем сценарии по реальной работе."],
] as const;

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

const principles = [
  "Сначала понятный процесс, потом AI.",
  "Никаких выдуманных результатов и фальшивых историй.",
  "Клиент должен понимать следующий шаг без технического словаря.",
  "Система должна помогать команде, а не создавать новую ручную работу.",
];

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
    summary: text,
    problems: ["Повторяющиеся обращения занимают внимание команды."],
    recommendations: ["Собрать входящие заявки в один поток.", "Подключить AI-консультанта.", "Добавить напоминания и CRM-статусы."],
    flow: fallbackFlow,
    callToAction: "Можно обсудить подходящий сценарий через WhatsApp, Telegram или email.",
  };
}

function getQuickPromptFallback(message: string): AnalysisResult {
  const base = {
    problems: ["Вопрос требует короткого разбора текущего процесса."],
    recommendations: ["Зафиксировать задачу и нужные каналы.", "Определить состав первой версии.", "Уточнить интеграции и роли команды."],
    flow: fallbackFlow,
    callToAction: "Обсудить конкретную конфигурацию можно через WhatsApp, Telegram или email.",
  };

  if (message === "Сколько это стоит?") {
    return { ...base, summary: "Базовая стоимость начинается от 120 000 ₸ за AI-консультанта. Итоговый диапазон зависит от модулей, филиалов и интеграций; прозрачный расчёт доступен в калькуляторе ниже." };
  }
  if (message === "Сколько занимает разработка?") {
    return { ...base, summary: "Срок первой версии определяется после разбора задачи. Он зависит от количества сценариев, каналов и готовности интеграций." };
  }
  if (message === "Можно улучшить существующий сайт?") {
    return { ...base, summary: "Да. Сначала AEVIX разбирает текущую структуру, путь клиента и технические ограничения, затем предлагает точечное улучшение или новую рабочую версию." };
  }
  if (message === "Как работает AI?") {
    return { ...base, summary: "AI получает описание услуг и правил, понимает вопрос клиента, уточняет детали и передаёт результат в запись, CRM или сотруднику." };
  }
  if (message === "Покажи автоматизацию") {
    return { ...base, summary: "Ниже на странице есть живая симуляция: сообщение клиента проходит через AI, расписание, запись, CRM, напоминание и подтверждение." };
  }
  if (message === "Создай концепт сайта") {
    return { ...base, summary: "Нажмите «Получить концепт сайта» слева: мастер соберёт бизнес-контекст, стиль, палитру и интерактивный preview." };
  }
  if (message === "У меня барбершоп") {
    return { ...base, summary: "Для барбершопа обычно полезны AI-ответы, онлайн-запись, выбор мастера, подтверждения, напоминания и CRM-статусы." };
  }
  return { ...base, summary: "Для нескольких филиалов важно разделить расписания, роли и статусы по точкам, сохранив единый контроль для владельца. В калькуляторе предусмотрены отдельные коэффициенты масштаба." };
}

function formatKzt(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

function getServiceTitle(id: ServiceId) {
  return serviceCatalog.find((service) => service.id === id)?.title ?? id;
}

function calculateEstimate(form: EstimateForm) {
  const selected = serviceCatalog.filter((service) => form.selectedServices.includes(service.id));
  const baseTotal = selected.reduce((sum, service) => sum + service.price, 0);
  const hasComplexity = form.selectedServices.includes("automation") || form.selectedServices.includes("crm");
  const branchMultiplier =
    form.branchCount === "2–5" ? 1.2 : form.branchCount === "6–10" ? 1.4 : 1;
  const requiresCustom = form.branchCount === "больше 10";
  const adjustedTotal = Math.round(baseTotal * branchMultiplier);
  const discount = Math.round(baseTotal * 0.1);
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
    requiresCustom,
    requiresClarification: hasComplexity || form.currentServices.trim().length > 0,
  };
}

function buildFallbackEstimate(form: EstimateForm): EstimateResult {
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

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer || reduceMotion) return;
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);

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

function TopNav() {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#главная");

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveHref(`#${visible.target.id}`);
      },
      { rootMargin: "-32% 0px -56% 0px", threshold: [0, 0.15, 0.35, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="site-header fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6"
    >
      <nav className="site-nav mx-auto flex max-w-[74rem] items-center justify-between rounded-full border border-ink/10 bg-porcelain/72 px-3 py-2 shadow-[0_14px_44px_rgba(9,8,7,0.08)] backdrop-blur-2xl">
        <a
          href="#главная"
          aria-label="AEVIX, перейти к началу страницы"
          className="group flex items-center gap-3 rounded-full px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-porcelain transition group-hover:rotate-6">
            AX
          </span>
          <span className="text-sm font-semibold text-ink">AEVIX</span>
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.slice(0, 6).map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={cn(
                "site-nav-link rounded-full px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                activeHref === item.href ? "is-active text-ink" : "text-ink/56 hover:text-ink",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="glass" size="sm" className="hidden sm:inline-flex">
            <a href="#контакты">
              <Sparkles className="mr-2 h-4 w-4" />
              Обсудить систему
            </a>
          </Button>
          <button
            type="button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/56 text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="site-mobile-menu mx-auto mt-3 grid max-w-[74rem] gap-2 rounded-lg border border-ink/10 bg-porcelain/94 p-3 shadow-object backdrop-blur-2xl lg:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={cn(
                "rounded-md px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                activeHref === item.href ? "bg-ink text-porcelain" : "text-ink/72 hover:bg-ink/5",
              )}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#контакты"
            onClick={() => setOpen(false)}
            className="rounded-md bg-ink px-4 py-3 text-sm font-medium text-porcelain"
          >
            Обсудить систему
          </a>
        </motion.div>
      ) : null}
    </motion.header>
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
      <div className="mx-auto grid w-full max-w-7xl items-center gap-5 md:gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div data-reveal className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/46 px-3 py-2 text-sm text-ink/62 backdrop-blur-xl">
            <MousePointer2 className="h-4 w-4 text-violet" />
            Цифровые системы для малого бизнеса
          </div>
          <h1 className="hero-title text-balance font-semibold text-ink">
            <span data-heading-line className="heading-line">Пока вы ведете</span>{" "}
            <span data-heading-line className="heading-line">бизнес, система</span>{" "}
            <span data-heading-line className="heading-line">выполняет рутину.</span>
          </h1>
          <p className="mt-5 max-w-xl text-balance text-xl leading-8 text-ink/66 md:mt-7 md:text-2xl md:leading-9">
            AEVIX объединяет заявки, запись, напоминания и CRM-сценарии в один рабочий контур.
          </p>
          <div className="mt-7 flex flex-col gap-3 md:mt-9 sm:flex-row">
            <Button asChild>
              <a href="#ai-анализ">
                Подобрать решение
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </a>
            </Button>
            <Button asChild variant="glass">
              <a href="#возможности">
                <Play className="mr-2 h-4 w-4" />
                Посмотреть возможности
              </a>
            </Button>
          </div>
        </div>
        <div data-reveal data-parallax="-4">
          <HeroDashboard />
        </div>
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

function AiConsultantScene() {
  const [input, setInput] = useState("У меня барбершоп, запись клиентов ведется вручную");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "intro",
      role: "ai",
      text: "Опишите бизнес, и AI-консультант AEVIX покажет, какие процессы можно автоматизировать: ответы клиентам, запись, напоминания, CRM, боты и сбор отзывов.",
    },
  ]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isThinking, setThinking] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedNode, setExpandedNode] = useState<number | null>(null);
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const canSend = input.trim().length > 0 && input.trim().length <= 1500 && !isThinking;
  const flow = getSafeFlow(analysis, input);
  const progress =
    analysis || isThinking
      ? ((analysis ? analysisStages.length - 1 : stageIndex) / (analysisStages.length - 1)) * 100
      : 0;

  useEffect(() => {
    if (!isThinking) {
      if (!analysis) setStageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [analysis, isThinking]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedNode(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (userScrolledAway) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [analysis, isThinking, messages, stageIndex, userScrolledAway]);

  const onMessagesScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setUserScrolledAway(distanceFromBottom > 96);
  };

  const sendAnalysis = async (messageOverride?: string) => {
    const message = (messageOverride ?? input).trim();
    if (isThinking) return;
    if (!message) {
      setError("Опишите бизнес или задачу, чтобы AI-консультант смог провести анализ.");
      return;
    }
    if (message.length > 1500) {
      setError("Сообщение слишком длинное. Максимум — 1500 символов.");
      return;
    }

    setError(null);
    if (messageOverride) setInput(messageOverride);
    setAnalysis(null);
    setExpandedNode(null);
    setUserScrolledAway(false);
    setThinking(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: message },
    ]);

    try {
      const response = await fetch("/api/business-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as {
        analysis?: string;
        result?: AnalysisResult;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Не удалось выполнить анализ. Попробуйте еще раз.");
      }

      const result = data.result;
      const text =
        data.analysis ||
        [
          result?.summary,
          result?.problems?.length ? `Что мешает: ${result.problems.join("; ")}.` : null,
          result?.recommendations?.length ? `Что можно автоматизировать: ${result.recommendations.join("; ")}.` : null,
          result?.callToAction,
        ]
          .filter(Boolean)
          .join("\n\n");

      if (!text) {
        throw new Error("AI-консультант не вернул ответ. Попробуйте переформулировать запрос.");
      }

      setAnalysis(result ?? formatFallbackAnalysis(text));
      setMessages((current) => [
        ...current,
        { id: `analysis-${Date.now()}`, role: "ai", text: "Готово. Я разложил ответ на вывод, проблемы, рекомендации и карту решения ниже." },
      ]);
    } catch (requestError) {
      if (aiQuickPrompts.some((prompt) => prompt === message)) {
        setAnalysis(getQuickPromptFallback(message));
        setMessages((current) => [
          ...current,
          { id: `fallback-${Date.now()}`, role: "ai", text: "OpenAI временно недоступен. Показываю проверенный локальный ответ AEVIX." },
        ]);
        setError(null);
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось выполнить анализ. Попробуйте еще раз.",
        );
      }
    } finally {
      setThinking(false);
    }
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
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <div className="grid gap-3">
            {analysisStages.map((stage, index) => (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 transition",
                  analysis || (isThinking && index < stageIndex)
                    ? "border-emerald-500/16 bg-emerald-50/70 text-ink"
                    : isThinking && index === stageIndex
                      ? "border-violet/24 bg-violet/10 text-ink"
                      : "border-ink/8 bg-white/48 text-ink/52",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow-[0_8px_20px_rgba(9,8,7,0.06)]">
                  {analysis || (isThinking && index < stageIndex) ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : isThinking && index === stageIndex ? (
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
          className="aevix-ai-panel relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/58 p-3 shadow-[0_32px_110px_rgba(76,63,118,0.18)] backdrop-blur-2xl md:p-5"
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
            onScroll={onMessagesScroll}
            className="aevix-ai-scroll relative flex max-h-[min(58dvh,40rem)] min-h-[24rem] flex-col gap-3 overflow-y-auto overscroll-contain scroll-smooth rounded-[1.65rem] border border-ink/6 bg-gradient-to-b from-white/78 to-white/42 p-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] max-md:max-h-[calc(100dvh-22rem)] max-md:min-h-[19rem]"
          >
            {messages.slice(-5).map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "max-w-[94%] whitespace-pre-line break-words rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-[0_14px_38px_rgba(9,8,7,0.06)]",
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex w-fit items-center gap-2 rounded-full border border-violet/12 bg-violet/8 px-4 py-3 text-xs text-ink/62"
              >
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet/70 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet/45 [animation-delay:240ms]" />
                </span>
                {analysisStages[stageIndex]}
              </motion.div>
            ) : null}
            {analysis ? (
              <motion.article
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                className="overflow-hidden rounded-[1.75rem] border border-ink/7 bg-white/86 p-4 text-ink shadow-[0_22px_60px_rgba(76,63,118,0.12)]"
              >
                <div className="flex flex-col gap-3 border-b border-ink/7 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-violet">AI-ответ</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">План решения</h3>
                  </div>
                  <Button
                    onClick={() => scrollToSection("контакты")}
                    size="sm"
                    className="aevix-ai-action bg-ink text-porcelain hover:bg-ink"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Обсудить это решение
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.3rem] border border-violet/10 bg-violet/[0.055] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/38">Краткий вывод</p>
                    <p className="mt-2 text-base leading-7 text-ink/72">{analysis.summary}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.3rem] border border-ink/7 bg-white/72 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/38">Найденные проблемы</p>
                      <div className="mt-3 grid gap-2">
                        {analysis.problems.map((item) => (
                          <p key={item} className="flex gap-2 text-sm leading-6 text-ink/66">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[1.3rem] border border-ink/7 bg-white/72 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/38">Рекомендации</p>
                      <div className="mt-3 grid gap-2">
                        {analysis.recommendations.map((item) => (
                          <p key={item} className="flex gap-2 text-sm leading-6 text-ink/66">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.3rem] border border-ink/7 bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/38">Практический эффект</p>
                    <p className="mt-2 text-base leading-7 text-ink/68">{analysis.callToAction}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-violet/10 bg-gradient-to-br from-white via-[#f8f4ff] to-[#eef1f7] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-violet">Карта решения</p>
                        <p className="mt-1 text-sm text-ink/52">Нажмите на узел, чтобы раскрыть этап.</p>
                      </div>
                      <SlidersHorizontal className="h-5 w-5 text-violet" />
                    </div>
                    <div className="aevix-flow-map group/map">
                      {flow.map((step, index) => {
                        const NodeIcon = flowNodeIcons[index % flowNodeIcons.length];
                        const isExpanded = expandedNode === index;

                        return (
                          <div key={`${step}-${index}`} className="aevix-flow-item">
                            <motion.button
                              type="button"
                              aria-label={`Раскрыть этап: ${step}`}
                              onClick={() => setExpandedNode((current) => (current === index ? null : index))}
                              whileHover={{ y: -5, scale: 1.045 }}
                              whileTap={{ scale: 0.97 }}
                              className={cn(
                                "aevix-flow-node interactive-surface group/node w-full cursor-pointer rounded-[1.25rem] border bg-white/82 p-3 text-left shadow-[0_18px_42px_rgba(76,63,118,0.11)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40",
                                isExpanded
                                  ? "border-violet/35 bg-white shadow-[0_24px_60px_rgba(122,92,255,0.18)]"
                                  : "border-ink/8 hover:border-violet/28 hover:bg-white",
                                expandedNode !== null && !isExpanded ? "opacity-62" : "opacity-100",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet transition duration-300 group-hover/node:rotate-3 group-hover/node:scale-110">
                                  <NodeIcon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold leading-5 text-ink">{step}</span>
                                  <span className="mt-1 block text-xs leading-5 text-ink/44">этап {index + 1}</span>
                                </span>
                              </span>
                            </motion.button>
                            {index < flow.length - 1 ? (
                              <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: index * 0.08, duration: 0.34 }}
                                className={cn(
                                  "aevix-flow-line origin-left",
                                  expandedNode === index || expandedNode === index + 1 ? "bg-violet/45" : "bg-ink/12",
                                )}
                              />
                            ) : null}
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
          <div className="sticky bottom-0 z-10 mt-3 rounded-[1.65rem] border border-ink/8 bg-white/82 p-2 shadow-[0_-16px_48px_rgba(255,250,242,0.74)] backdrop-blur-2xl">
            <div className="flex items-end gap-2 rounded-[1.35rem] border border-ink/8 bg-white/70 p-1.5">
            <textarea
              aria-label="Описание бизнеса для AI-консультанта"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendAnalysis();
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
                onClick={() => void sendAnalysis()}
                disabled={!canSend}
                className="aevix-icon-action mb-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/8 bg-white text-ink/56 transition hover:border-violet/22 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
            <Button
              onClick={() => void sendAnalysis()}
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
                  onClick={() => void sendAnalysis(prompt)}
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

function ProblemsScene() {
  const [mode, setMode] = useState<"before" | "after">("before");
  const items = beforeAfterItems[mode];

  return (
    <section id="проблемы" className="scene problems-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase text-violet">До и после AEVIX</p>
            <h2 className="section-title text-balance font-semibold">
              <span data-heading-line className="heading-line">Переключите рабочий процесс.</span>{" "}
              <span data-heading-line className="heading-line">Посмотрите, что меняется внутри.</span>
            </h2>
          </div>
          <div className="before-after-switch" aria-label="Режим сравнения">
            <button type="button" aria-pressed={mode === "before"} onClick={() => setMode("before")}>До AEVIX</button>
            <button type="button" aria-pressed={mode === "after"} onClick={() => setMode("after")}>После AEVIX</button>
          </div>
        </div>
        <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("before-after-stage mt-10", mode === "after" && "is-after")}>
          <div className="before-after-flow">
            {items.map((item, index) => (
              <div key={item} className="before-after-item">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
                {index < items.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <div className="before-after-result">
            <span>{mode === "before" ? "Разрозненный процесс" : "Единый рабочий контур"}</span>
            <strong>{mode === "before" ? "Команда держит систему в голове" : "AEVIX ведёт следующий шаг автоматически"}</strong>
            <p>{mode === "before" ? "Переключитесь на «После AEVIX», чтобы собрать процесс." : "AI, CRM, запись и статусы работают как одна последовательность."}</p>
          </div>
        </motion.div>
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-title"
      className="fixed inset-0 z-50 flex items-end bg-ink/48 p-0 backdrop-blur-xl md:items-center md:justify-center md:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="dark-glass relative max-h-[92svh] w-full overflow-y-auto rounded-t-[2rem] p-5 text-porcelain md:max-w-4xl md:rounded-[2rem] md:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Закрыть демонстрацию сценария"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-porcelain/70 transition hover:bg-white/14 hover:text-porcelain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
        >
          <X className="h-5 w-5" />
        </button>
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
      </motion.div>
    </motion.div>
  );
}

function FeatureModules() {
  const [active, setActive] = useState(modules[0].id);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const selected = modules.find((module) => module.id === active) ?? modules[0];
  const SelectedIcon = selected.icon;

  return (
    <section id="возможности" className="scene capabilities-scene relative flex items-center">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.68fr_1fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Возможности
          </p>
          <h2 className="section-title text-balance font-semibold text-ink">
            <span data-heading-line className="heading-line">Не набор функций.</span>{" "}
            <span data-heading-line className="heading-line">Модули, которые закрывают конкретные участки работы.</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink/62">
            Выберите модуль и посмотрите, как он работает в реальном процессе.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="card-field grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = module.id === active;
              return (
                <button
                  key={module.id}
                  onClick={() => setActive(module.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "interactive-surface group rounded-[1.5rem] border p-4 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                    isActive
                      ? "border-ink/14 bg-ink text-porcelain shadow-object"
                      : "border-ink/10 bg-white/42 text-ink hover:-translate-y-1 hover:border-violet/20 hover:bg-white/76 hover:shadow-object",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-violet" : "text-ink/52 group-hover:text-violet")} />
                  <p className="mt-7 text-base font-medium">{module.title}</p>
                  <p className={cn("mt-2 text-sm leading-6", isActive ? "text-porcelain/56" : "text-ink/52")}>
                    {module.metric}
                  </p>
                </button>
              );
            })}
          </div>
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="glass-panel overflow-hidden rounded-[2rem] p-5 md:p-7"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-porcelain shadow-glow">
                  <SelectedIcon className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-semibold tracking-[-0.03em]">{selected.title}</h3>
                <p className="mt-3 max-w-xl text-lg leading-7 text-ink/62">{selected.intro}</p>
              </div>
              <Button variant="glass" size="sm" onClick={() => setScenarioOpen(true)}>
                <Zap className="mr-2 h-4 w-4" />
                Запустить сценарий
              </Button>
            </div>
            <div className="module-output-chain" aria-label={`Результаты модуля ${selected.title}`}>
              {selected.what.slice(0, 5).map((item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.replace(/\.$/, "")}</strong>
                  {index < Math.min(selected.what.length, 5) - 1 ? <ArrowRight aria-hidden="true" /> : null}
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-ink/8 bg-white/45 p-5">
                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-ink/42">Сигнал</p>
                <p className="text-lg leading-7 text-ink/76">{selected.prompt}</p>
              </div>
              <div className="rounded-[1.5rem] bg-ink p-5 text-porcelain">
                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-porcelain/36">
                  Действие AEVIX
                </p>
                <p className="text-lg leading-7 text-porcelain/82">{selected.answer}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      {scenarioOpen ? (
        <ScenarioModal module={selected} onClose={() => setScenarioOpen(false)} />
      ) : null}
    </section>
  );
}

function ServicePricingScene() {
  return (
    <section id="стоимость" className="scene pricing-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Услуги и стоимость
          </p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Открытая стоимость</span>{" "}
            <span data-heading-line className="heading-line">без скрытых коэффициентов.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/62">
            Изучите базовые модули. Персональный расчёт доступен перед финальным обращением.
          </p>
        </div>

        <div data-reveal className="card-field grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceCatalog.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.id} className="interactive-surface glass-panel rounded-[1.75rem] p-5">
                <Icon className="h-6 w-6 text-violet" />
                <h3 className="mt-8 text-2xl font-semibold">{service.title}</h3>
                <p className="mt-3 text-base leading-7 text-ink/58">{service.description}</p>
                <p className="price-display mt-6 text-xl font-semibold">
                  {service.price ? `от ${formatKzt(service.price)}` : service.id === "nfc" ? "бонус" : "по составу проекта"}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingCalculatorScene() {
  const [form, setForm] = useState<EstimateForm>(initialEstimateForm);
  const [step, setStep] = useState(0);
  const [aiEstimate, setAiEstimate] = useState<EstimateResult | null>(null);
  const [isEstimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const localEstimate = calculateEstimate(form);
  const finalEstimate = aiEstimate ?? buildFallbackEstimate(form);
  const requestText = buildRequestText(form, finalEstimate);
  const wizardSteps = ["Бизнес", "Решения", "Масштаб", "Задача", "Результат"];
  const canShowResult = form.selectedServices.length > 0;
  const canSendRequest = Boolean(form.contactName.trim() && form.contactHandle.trim());

  const updateForm = (patch: Partial<EstimateForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setAiEstimate(null);
    setEstimateError(null);
  };

  const toggleService = (serviceId: ServiceId) => {
    setForm((current) => {
      const exists = current.selectedServices.includes(serviceId);
      const nextServices = exists
        ? current.selectedServices.filter((id) => id !== serviceId)
        : [...current.selectedServices, serviceId];

      return {
        ...current,
        selectedServices: nextServices.length ? nextServices : current.selectedServices,
      };
    });
    setAiEstimate(null);
    setEstimateError(null);
  };

  const requestAiEstimate = async () => {
    if (!canShowResult || isEstimating) return;

    setEstimating(true);
    setEstimateError(null);
    const fallback = buildFallbackEstimate(form);

    try {
      const response = await fetch("/api/business-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateContext: {
            businessType: form.businessType,
            selectedServices: form.selectedServices.map(getServiceTitle),
            branchCount: form.branchCount,
            manualWork: form.manualWork,
            currentServices: form.currentServices,
            localRange: localEstimate.rangeText,
          },
        }),
      });
      const data = (await response.json()) as {
        estimate?: EstimateResult;
        error?: string;
      };

      if (!response.ok || !data.estimate) {
        throw new Error(data.error || "AI-рекомендация временно недоступна.");
      }

      setAiEstimate(data.estimate);
    } catch (error) {
      setAiEstimate(fallback);
      setEstimateError(
        error instanceof Error
          ? `${error.message} Показан локальный расчет по прозрачной логике.`
          : "Показан локальный расчет по прозрачной логике.",
      );
    } finally {
      setEstimating(false);
    }
  };

  const nextStep = () => {
    if (step === wizardSteps.length - 2) {
      void requestAiEstimate();
    }
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
          <Button type="button" onClick={() => setCalculatorOpen(true)}>
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
                    <p className="text-sm uppercase tracking-[0.22em] text-violet">Предварительная конфигурация</p>
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
                      <p className="text-sm text-ink/46">Ориентировочная стоимость</p>
                      <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{finalEstimate.estimatedRange}</p>
                      {oldPrice && newPrice ? (
                        <div className="mt-5 grid gap-2 text-sm text-ink/58">
                          <p>Скидка на базовую стоимость первых проектов: 10%.</p>
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
                  {estimateError ? (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      {estimateError}
                    </p>
                  ) : null}
                  <div className="rounded-[1.5rem] border border-ink/8 bg-white/74 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-ink/38">Отправить расчёт</p>
                    <p className="mt-3 text-sm leading-6 text-ink/58">
                      Заявка сформируется из введенных данных. Контакты не передаются в AI-рекомендацию.
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
                {localEstimate.requiresCustom ? "Для сети больше 10 точек нужен индивидуальный расчет." : `Локальный ориентир: ${localEstimate.rangeText}`}
              </div>
              {step < wizardSteps.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={!canShowResult || isEstimating}>
                  {isEstimating ? <LoadingDots className="mr-2" /> : null}
                  {step === wizardSteps.length - 2 ? "Показать результат" : "Далее"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={() => void requestAiEstimate()} disabled={isEstimating}>
                  {isEstimating ? <LoadingDots className="mr-2" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Обновить план
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

function StoryScene() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scenario = automationScenarios[scenarioIndex];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= scenario.steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 760);
    return () => window.clearInterval(timer);
  }, [playing, scenario.steps.length]);

  const selectScenario = (index: number) => {
    setScenarioIndex(index);
    setActiveStep(0);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  const replay = () => {
    setActiveStep(0);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  return (
    <section id="автоматизация-демо" className="scene story-scene flex items-center">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
          <p className="mb-4 text-sm font-medium uppercase text-violet">Живая автоматизация</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Посмотрите, как работает</span>{" "}
            <span data-heading-line className="heading-line">ваш будущий AI.</span>
          </h2>
          </div>
          <Button type="button" variant="glass" onClick={replay}>
            <RotateCcw className="mr-2 h-4 w-4" /> Повторить
          </Button>
        </div>
        <div data-reveal className="automation-demo mt-9">
          <div className="automation-tabs" aria-label="Сценарии автоматизации">
            {automationScenarios.map((item, index) => (
              <button key={item.label} type="button" aria-pressed={scenarioIndex === index} onClick={() => selectScenario(index)}>{item.label}</button>
            ))}
          </div>
          <div className="automation-customer">
            <span>Клиент</span>
            <p>{scenario.customer}</p>
          </div>
          <div className="automation-flow" aria-live="polite">
            {scenario.steps.map((step, index) => {
              const complete = index <= activeStep;
              return (
                <div key={step} className={cn("automation-step", complete && "is-complete", index === activeStep && playing && "is-active")}>
                  <span>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <strong>{step}</strong>
                  {index < scenario.steps.length - 1 ? <i aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
          <div className={cn("automation-success", activeStep === scenario.steps.length - 1 && "is-visible")}>
            <Check className="h-5 w-5" /> Сценарий завершён. Клиент и команда получили следующий шаг.
          </div>
        </div>
      </div>
    </section>
  );
}

function CasesScene() {
  const [active, setActive] = useState(0);
  const scenario = applicationScenarios[active];

  return (
    <section id="сценарии" className="scene cases-scene flex items-center text-ink">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
              Сценарии применения
            </p>
            <h2 className="section-title max-w-3xl text-balance font-semibold">
              <span data-heading-line className="heading-line">Как AEVIX может изменить</span>{" "}
              <span data-heading-line className="heading-line">ежедневную работу бизнеса</span>
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-7 text-ink/52">
            Возможные сценарии применения, а не результаты реальных клиентов.
          </p>
        </div>
        <div data-reveal className="flex gap-2 overflow-x-auto pb-3">
          {applicationScenarios.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={active === index}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40",
                active === index
                  ? "border-ink bg-ink text-porcelain"
                  : "border-ink/10 bg-white/56 text-ink/58 hover:bg-white hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <motion.div
          key={scenario.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-field mt-5 grid gap-4 lg:grid-cols-3"
        >
          {[
            ["Сейчас", scenario.now],
            ["Что делает AEVIX", scenario.aevix],
            ["Для владельца", scenario.owner],
          ].map(([title, text]) => (
            <article
              key={title}
              className="relative overflow-hidden rounded-[2rem] border border-ink/8 bg-white/62 p-6"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet/30 to-transparent" />
              <p className="text-sm uppercase tracking-[0.22em] text-violet">{title}</p>
              <p className="mt-10 text-2xl font-semibold leading-9 tracking-[-0.03em] text-ink/78">
                {text}
              </p>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TradingBotScene() {
  const [active, setActive] = useState<string | null>("CRM");
  const selected = ecosystemModules.find((module) => module.label === active);
  const relatedModules: readonly string[] = selected?.related ?? [];

  return (
    <section id="торговый-бот" className="scene technical-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase text-violet">Экосистема AEVIX</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Один центр.</span>{" "}
            <span data-heading-line className="heading-line">Все каналы работают вместе.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/62">
            Наведите или нажмите на модуль, чтобы увидеть связанные потоки данных.
          </p>
        </div>
        <div data-reveal className="ecosystem-stage mt-10">
          <div className="ecosystem-center">
            <span>AX</span>
            <strong>AEVIX</strong>
            <small>единый контур</small>
          </div>
          <div className="ecosystem-nodes">
            {ecosystemModules.map((module, index) => {
              const Icon = module.icon;
              const highlighted = !active || module.label === active || relatedModules.includes(module.label);
              return (
              <button
                key={module.label}
                type="button"
                style={{ "--node-index": index } as React.CSSProperties}
                onPointerEnter={() => setActive(module.label)}
                onFocus={() => setActive(module.label)}
                onClick={() => setActive(module.label)}
                aria-pressed={active === module.label}
                className={cn("ecosystem-node interactive-surface", highlighted ? "is-related" : "is-muted", active === module.label && "is-active")}
              >
                <Icon className="h-5 w-5" />
                <span>{module.label}</span>
                <i aria-hidden="true" />
              </button>
              );
            })}
          </div>
          <div className="ecosystem-status" aria-live="polite">
            <span>{selected?.label ?? "AEVIX"}</span>
            <p>{selected ? `Связанные модули: ${selected.related.join(", ")}.` : "Выберите модуль, чтобы увидеть поток."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessScene() {
  const [active, setActive] = useState(0);
  const progress = (active / (roadmapStages.length - 1)) * 100;

  return (
    <section id="процесс" className="scene process-scene relative flex items-center overflow-hidden">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase text-violet">Интерактивный roadmap</p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">От разбора задачи</span>{" "}
            <span data-heading-line className="heading-line">до работающей системы.</span>
          </h2>
        </div>
        <div data-reveal className="roadmap mt-10">
          <div className="roadmap-track" aria-hidden="true"><motion.span animate={{ width: `${progress}%` }} /></div>
          <div className="roadmap-stages">
            {roadmapStages.map(([title], index) => (
              <button key={title} type="button" aria-pressed={active === index} onClick={() => setActive(index)} className={cn(index <= active && "is-complete", active === index && "is-active")}>
                <span>{index < active ? <Check className="h-4 w-4" /> : index + 1}</span>
                <strong>{title}</strong>
              </button>
            ))}
          </div>
          <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="roadmap-detail">
            <span>Этап {active + 1} из {roadmapStages.length}</span>
            <h3>{roadmapStages[active][0]}</h3>
            <p>{roadmapStages[active][1]}</p>
            {active < roadmapStages.length - 1 ? (
              <Button type="button" variant="glass" onClick={() => setActive((current) => Math.min(current + 1, roadmapStages.length - 1))}>
                Следующий этап <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={() => scrollToSection("контакты")}>Обсудить запуск</Button>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PrinciplesScene() {
  return (
    <section className="scene principles-scene flex items-center">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Принципы
          </p>
          <h2 className="section-title text-balance font-semibold">
            <span data-heading-line className="heading-line">Мы не продаем бота.</span>{" "}
            <span data-heading-line className="heading-line">Мы убираем повторяющуюся работу.</span>
          </h2>
        </div>
        <div className="card-field grid gap-4 md:grid-cols-2">
          {principles.map((principle, index) => (
            <div key={principle} data-reveal className="glass-panel rounded-[1.75rem] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-ink/36">0{index + 1}</p>
              <p className="mt-8 text-2xl font-semibold leading-9 tracking-[-0.03em]">{principle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FounderScene() {
  return (
    <section className="scene founder-scene flex items-center">
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

function ContactScene() {
  return (
    <section id="контакты" className="scene contact-scene flex items-center">
      <div className="mx-auto w-full max-w-6xl">
        <div data-reveal className="dark-glass overflow-hidden rounded-[2.2rem] p-7 text-porcelain md:p-10">
          <div className="mb-16 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.32em] text-porcelain/42">AEVIX</span>
            <ShieldCheck className="h-6 w-6 text-violet" />
          </div>
          <h2 className="contact-title max-w-3xl text-balance font-semibold">
            <span data-heading-line className="heading-line">Обсудим, где AI может снять</span>{" "}
            <span data-heading-line className="heading-line">повторяющуюся работу.</span>
          </h2>
          <p className="mt-7 max-w-xl text-xl leading-8 text-porcelain/58">
            Расскажите, где команда работает вручную. AEVIX предложит первый сценарий.
          </p>
          <div className="mt-10 flex flex-col items-start gap-4">
            <Button asChild className="bg-porcelain text-ink hover:bg-white">
              <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Обсудить проект <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-sm text-porcelain/48">Telegram и email доступны ниже — выберите удобный канал.</p>
          </div>
          <div className="mt-7 grid gap-3 text-sm text-porcelain/58 md:grid-cols-3">
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer" className="interactive-surface rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.whatsapp.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.whatsapp.value}</span>
            </a>
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer" className="interactive-surface rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.telegram.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.telegram.value}</span>
            </a>
            <a href={contacts.email.href} className="interactive-surface rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.email.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.email.value}</span>
            </a>
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
            <a href="#ai-анализ">AI</a>
            <a href="#стоимость">Сайты</a>
            <a href="#возможности">Автоматизация</a>
            <a href="#возможности">Telegram</a>
            <a href="#ai-анализ">Концепты сайтов</a>
          </nav>
          <nav aria-label="Ресурсы AEVIX">
            <p>Ресурсы</p>
            <a href="#ai-анализ">FAQ через AI</a>
            <button type="button" onClick={() => setLegal((current) => current === "privacy" ? null : "privacy")}>Privacy Policy</button>
            <button type="button" onClick={() => setLegal((current) => current === "terms" ? null : "terms")}>Terms</button>
          </nav>
          <nav aria-label="Контакты AEVIX">
            <p>Контакты</p>
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer">Telegram</a>
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={contacts.email.href}>Email</a>
          </nav>
        </div>
        {legal ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="footer-legal" role="status">
            <strong>{legal === "privacy" ? "Privacy Policy" : "Terms"}</strong>
            <p>{legal === "privacy" ? "Контактные данные используются только для ответа на обращение. Бизнес-контекст передаётся AI без персональных контактов." : "Расчёты на сайте являются предварительными. Финальный состав, стоимость и условия определяются после разбора задачи."}</p>
            <button type="button" onClick={() => setLegal(null)} aria-label="Закрыть информацию"><X className="h-4 w-4" /></button>
          </motion.div>
        ) : null}
        <div className="premium-footer-bottom">
          <span>© 2026 AEVIX</span>
          <span>Built by Alan Kossybayev</span>
        </div>
      </div>
    </footer>
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

export default function Home() {
  usePremiumMotion();

  return (
    <main>
      <StructuredData />
      <TopNav />
      <HeroScene />
      <AiConsultantScene />
      <ProblemsScene />
      <FeatureModules />
      <ServicePricingScene />
      <StoryScene />
      <CasesScene />
      <TradingBotScene />
      <ProcessScene />
      <PrinciplesScene />
      <FounderScene />
      <PricingCalculatorScene />
      <ContactScene />
      <FooterScene />
    </main>
  );
}
