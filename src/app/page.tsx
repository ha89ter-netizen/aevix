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
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const navItems = [
  { label: "Главная", href: "#главная" },
  { label: "AI-анализ", href: "#ai-анализ" },
  { label: "Проблемы", href: "#проблемы" },
  { label: "Возможности", href: "#возможности" },
  { label: "Сценарии", href: "#сценарии" },
  { label: "Проект", href: "#торговый-бот" },
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

const businessProblems = [
  {
    title: "Обращения разбросаны по чатам",
    text: "Клиенты пишут в разные места, а команда вручную переносит детали и вспоминает контекст.",
  },
  {
    title: "Повторяющиеся вопросы забирают внимание",
    text: "Администратор снова и снова объясняет услуги, свободное время, адрес, оплату и правила записи.",
  },
  {
    title: "Владельцу сложно видеть процесс",
    text: "Статусы, заявки и слабые места живут в голове команды, таблицах и длинных переписках.",
  },
];

const storySteps = [
  ["Клиент написал", "Сообщение попадает в единый входящий поток."],
  ["AI ответил", "Система понимает вопрос и отвечает простым языком."],
  ["Уточнил услугу", "Клиент выбирает нужный формат без длинной переписки."],
  ["Предложил время", "AEVIX показывает доступный вариант или передает задачу сотруднику."],
  ["Зафиксировал запись", "Данные клиента и статус сохраняются в рабочем контуре."],
  ["Запустил напоминание", "Клиент получает подтверждение и следующий шаг."],
  ["Попросил отзыв", "После визита система аккуратно собирает обратную связь."],
  ["Предложил вернуться", "Повторное обращение становится частью сценария, а не случайностью."],
];

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

const tradingBotEvents = [
  ["Market data", "Система получает рыночные данные и обновляет рабочий контекст."],
  ["Signal evaluation", "Проверяет заранее заданные условия без эмоциональных решений."],
  ["Risk check", "Считает допустимый риск по правилам, которые задает человек."],
  ["Execution", "Фиксирует действие только когда условия совпадают с правилами."],
  ["Journal", "Записывает события, решения и причины в журнал."],
  ["Analytics", "Собирает данные для последующего разбора процесса."],
];

const processSteps = [
  "Разбираем, где команда теряет внимание на повторяющихся действиях.",
  "Проектируем сценарии: ответы, запись, статусы, напоминания и CRM.",
  "Собираем интерфейс вокруг ролей владельца, администратора и клиента.",
  "Запускаем первую версию после анализа задачи и дорабатываем по реальной работе.",
];

const principles = [
  "Сначала понятный процесс, потом AI.",
  "Никаких выдуманных результатов и фальшивых историй.",
  "Клиент должен понимать следующий шаг без технического словаря.",
  "Система должна помогать команде, а не создавать новую ручную работу.",
];

const analysisStages = [
  "Изучаем описание",
  "Находим повторяющиеся действия",
  "Строим подходящий сценарий",
  "Формируем рекомендации",
];

const fallbackFlow = ["Клиент", "AI-консультант", "Заявка", "CRM", "Напоминание", "Отзыв"];

function usePremiumMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
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
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: reduceMotion ? 0 : 32, filter: reduceMotion ? "none" : "blur(10px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: reduceMotion ? 0.01 : 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
            },
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
      if (!isDesktop) return;
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
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

function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-ink/10 bg-porcelain/72 px-3 py-2 shadow-[0_14px_44px_rgba(9,8,7,0.08)] backdrop-blur-2xl">
        <a
          href="#главная"
          aria-label="AEVIX, перейти к началу страницы"
          className="group flex items-center gap-3 rounded-full px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-porcelain transition group-hover:rotate-6">
            AX
          </span>
          <span className="text-sm font-semibold tracking-[0.28em] text-ink">AEVIX</span>
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.slice(0, 6).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm text-ink/62 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
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
          className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-[1.5rem] border border-ink/10 bg-porcelain/94 p-3 shadow-object backdrop-blur-2xl lg:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-ink/72 transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#контакты"
            onClick={() => setOpen(false)}
            className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-porcelain"
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
        <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-violet/18 blur-3xl" />
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
    <section id="главная" className="scene relative flex items-center overflow-hidden pt-28">
      <div className="absolute inset-x-0 top-24 mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-ink/18 to-transparent" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div data-reveal className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/46 px-3 py-2 text-sm text-ink/62 backdrop-blur-xl">
            <MousePointer2 className="h-4 w-4 text-violet" />
            Цифровые системы для малого бизнеса
          </div>
          <h1 className="text-balance text-[clamp(3.1rem,6vw,6.4rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-ink">
            Пока вы ведете бизнес, система выполняет рутину.
          </h1>
          <p className="mt-7 max-w-xl text-balance text-xl leading-8 text-ink/66 md:text-2xl md:leading-9">
            AEVIX собирает заявки, ответы, запись, напоминания и CRM-сценарии в понятный рабочий контур для владельца и команды.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-ink/42 md:flex">
        <ChevronDown className="h-4 w-4 animate-bounce" />
        scroll
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
  const canSend = input.trim().length > 0 && input.trim().length <= 1500 && !isThinking;
  const flow = getSafeFlow(analysis, input);

  useEffect(() => {
    if (!isThinking) {
      setStageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [isThinking]);

  const sendAnalysis = async () => {
    const message = input.trim();
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
    setAnalysis(null);
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

      if (result) setAnalysis(result);
      setMessages((current) => [
        ...current,
        { id: `analysis-${Date.now()}`, role: "ai", text },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось выполнить анализ. Попробуйте еще раз.",
      );
    } finally {
      setThinking(false);
    }
  };

  return (
    <section id="ai-анализ" className="scene relative flex items-center bg-ink text-porcelain">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Настоящий AI-анализ
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Опишите бизнес. AEVIX предложит понятный сценарий автоматизации.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-porcelain/58">
            Это не имитация ответа. Запрос обрабатывается сервером через OpenAI, а ключ остается только на backend.
          </p>
          <div className="mt-8 grid gap-3">
            {analysisStages.map((stage, index) => (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 transition",
                  isThinking && index <= stageIndex
                    ? "border-violet/40 bg-violet/12 text-porcelain"
                    : "border-white/10 bg-white/[0.045] text-porcelain/48",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-xs">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{stage}</span>
              </div>
            ))}
          </div>
        </div>
        <div data-reveal className="dark-glass rounded-[2rem] p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-[0.22em] text-porcelain/46">AI-консультант</span>
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-porcelain/55">
              Responses API
            </span>
          </div>
          <div className="flex h-72 flex-col gap-2 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-black/22 p-3 pr-2">
            {messages.slice(-5).map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "max-w-[94%] whitespace-pre-line rounded-3xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-porcelain text-ink"
                    : "bg-white/[0.08] text-porcelain/82",
                )}
              >
                {message.text}
              </motion.div>
            ))}
            {isThinking ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex w-fit items-center gap-2 rounded-full bg-white/[0.08] px-4 py-3 text-xs text-porcelain/62"
              >
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet/70 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet/45 [animation-delay:240ms]" />
                </span>
                {analysisStages[stageIndex]}
              </motion.div>
            ) : null}
          </div>
          {error ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl border border-red-300/15 bg-red-300/10 px-4 py-3 text-sm leading-6 text-red-100"
            >
              {error}
            </motion.p>
          ) : null}
          {analysis ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4"
            >
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-porcelain/36">
                Карта решения
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {flow.map((step, index) => (
                  <div key={`${step}-${index}`} className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-porcelain/76">
                      {step}
                    </span>
                    {index < flow.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-violet" /> : null}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => scrollToSection("контакты")}
                variant="glass"
                size="sm"
                className="mt-4 w-full border-white/12 bg-white/8 text-porcelain hover:bg-white/12"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Обсудить это решение
              </Button>
            </motion.div>
          ) : null}
          <div className="mt-3 flex items-end gap-2 rounded-[1.45rem] border border-white/10 bg-white/[0.06] p-1.5">
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
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-porcelain outline-none placeholder:text-porcelain/32"
              placeholder="Например: у меня кофейня, гости пишут в WhatsApp"
            />
            <Button
              onClick={() => void sendAnalysis()}
              size="icon"
              aria-label="Отправить описание бизнеса"
              aria-disabled={!canSend}
              disabled={!canSend}
              title={canSend ? "Отправить запрос" : "Введите описание бизнеса"}
              className="h-10 w-10 bg-porcelain text-ink"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemsScene() {
  return (
    <section id="проблемы" className="scene relative flex items-center overflow-hidden">
      <div data-parallax="-8" className="absolute right-8 top-24 h-64 w-64 rounded-full border border-ink/10" />
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Что узнает владелец
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Проблема обычно не в людях. Она в ручном процессе, который вырос без системы.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {businessProblems.map((problem, index) => (
            <motion.article
              key={problem.title}
              data-reveal
              transition={{ delay: index * 0.08 }}
              className="glass-panel rounded-[2rem] p-6"
            >
              <span className="text-sm uppercase tracking-[0.24em] text-ink/36">0{index + 1}</span>
              <h3 className="mt-10 text-2xl font-semibold tracking-[-0.03em]">{problem.title}</h3>
              <p className="mt-4 text-base leading-7 text-ink/60">{problem.text}</p>
            </motion.article>
          ))}
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
    <section id="возможности" className="scene relative flex items-center">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.68fr_1fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Возможности
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-ink md:text-6xl">
            Не набор функций. Модули, которые закрывают конкретные участки работы.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink/62">
            Нажмите на модуль, чтобы увидеть сценарий, каналы и практический эффект для команды.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = module.id === active;
              return (
                <button
                  key={module.id}
                  onClick={() => setActive(module.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group rounded-[1.5rem] border p-4 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
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

function StoryScene() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % storySteps.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="scene flex items-center bg-porcelain">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Живой сценарий
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Пока мастер работает с клиентом, система ведет следующий диалог.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink/62">
            Смысл AEVIX не в красивом боте. Смысл в том, чтобы повторяющийся цикл выполнялся без постоянного участия команды.
          </p>
        </div>
        <div data-reveal className="glass-panel rounded-[2rem] p-5 md:p-7">
          <div className="grid gap-3">
            {storySteps.map(([title, text], index) => (
              <button
                key={title}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "grid gap-1 rounded-[1.3rem] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/30",
                  active === index
                    ? "border-ink/14 bg-ink text-porcelain shadow-object"
                    : "border-ink/8 bg-white/40 text-ink hover:bg-white/70",
                )}
              >
                <span className="text-xs uppercase tracking-[0.2em] opacity-45">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xl font-semibold tracking-[-0.03em]">{title}</span>
                <span className={cn("text-sm leading-6", active === index ? "text-porcelain/58" : "text-ink/58")}>
                  {text}
                </span>
              </button>
            ))}
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
    <section id="сценарии" className="scene flex items-center bg-ink text-porcelain">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
              Сценарии применения
            </p>
            <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Примеры того, как система может изменить ежедневную работу бизнеса
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-7 text-porcelain/52">
            Это возможные сценарии применения, а не результаты реальных клиентов.
          </p>
        </div>
        <p data-reveal className="mb-6 max-w-2xl text-base leading-7 text-porcelain/46">
          Понятные сценарии вместо абстрактного списка функций. После появления реальных внедрений здесь будут опубликованы подтвержденные показатели и результаты клиентов.
        </p>
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
                  ? "border-porcelain bg-porcelain text-ink"
                  : "border-white/12 bg-white/[0.055] text-porcelain/58 hover:bg-white/[0.09] hover:text-porcelain",
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
          className="mt-5 grid gap-4 lg:grid-cols-3"
        >
          {[
            ["Сейчас", scenario.now],
            ["Что делает AEVIX", scenario.aevix],
            ["Для владельца", scenario.owner],
          ].map(([title, text]) => (
            <article
              key={title}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <p className="text-sm uppercase tracking-[0.22em] text-violet">{title}</p>
              <p className="mt-10 text-2xl font-semibold leading-9 tracking-[-0.03em] text-porcelain/82">
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
  const [active, setActive] = useState(0);

  return (
    <section id="торговый-бот" className="scene relative flex items-center overflow-hidden">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Собственный технический проект
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Торговый бот как пример автоматизации сложного цикла.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/62">
            Проект показывает подход AEVIX к системам: человек задает правила, а система выполняет повторяющийся цикл, ведет журнал и помогает разбирать процесс.
          </p>
          <p className="mt-5 rounded-[1.4rem] border border-ink/10 bg-white/50 p-4 text-sm leading-6 text-ink/58">
            Проект демонстрирует автоматизацию сложного процесса и не является обещанием финансового результата.
          </p>
        </div>
        <div data-reveal className="dark-glass rounded-[2rem] p-5 text-porcelain md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Automation loop</p>
              <p className="mt-1 text-xs text-porcelain/42">Визуальная демонстрация архитектуры</p>
            </div>
            <TrendingUp className="h-6 w-6 text-violet" />
          </div>
          <div className="grid gap-3">
            {tradingBotEvents.map(([title, text], index) => (
              <button
                key={title}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "grid gap-1 rounded-[1.2rem] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40",
                  active === index
                    ? "border-violet/40 bg-violet/14"
                    : "border-white/10 bg-white/[0.045] hover:bg-white/[0.08]",
                )}
              >
                <span className="text-xs uppercase tracking-[0.22em] text-porcelain/34">{title}</span>
                <span className="text-base leading-7 text-porcelain/74">{text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessScene() {
  return (
    <section id="процесс" className="scene relative flex items-center overflow-hidden">
      <div data-parallax="-10" className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full border border-ink/10" />
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Процесс
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Сначала логика бизнеса. Потом интерфейс, AI и автоматизация.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink/62">
            AEVIX развивается как студия цифровых решений: собственные технические проекты, индивидуальный разбор задачи и первая версия после анализа проекта.
          </p>
        </div>
        <div className="space-y-4">
          {processSteps.map((step, index) => (
            <motion.div
              key={step}
              data-reveal
              className="glass-panel flex items-start gap-5 rounded-[1.5rem] p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-porcelain">
                {String(index + 1).padStart(2, "0")}
              </div>
              <p className="pt-2 text-xl font-medium leading-8 tracking-[-0.02em]">{step}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrinciplesScene() {
  return (
    <section className="scene flex items-center bg-porcelain">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Принципы
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
            Мы не продаем бота. Мы убираем повторяющуюся работу.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
    <section className="scene flex items-center bg-ink text-porcelain">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div data-reveal className="dark-glass rounded-[2rem] p-7">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-porcelain text-ink">
            <UserRound className="h-8 w-8" />
          </div>
          <p className="mt-10 text-sm uppercase tracking-[0.28em] text-violet">Founder & CEO</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Kossybayev Alan</h2>
          <p className="mt-5 text-lg leading-8 text-porcelain/58">
            AEVIX строится вокруг практического вопроса: какие повторяющиеся действия бизнеса можно превратить в понятную цифровую систему.
          </p>
        </div>
        <div data-reveal className="grid gap-4 md:grid-cols-2">
          {[
            ["Фокус", "Малый бизнес: салоны, магазины, кофейни, рестораны и локальные сети."],
            ["Подход", "Разбор процесса, понятные сценарии и аккуратная автоматизация без лишней сложности."],
            ["Честность", "Без выдуманных клиентов, фальшивых логотипов и неподтвержденных результатов."],
            ["Связь", "Обсудить задачу можно через WhatsApp, Telegram или email."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-violet">{title}</p>
              <p className="mt-7 text-xl leading-8 text-porcelain/72">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactScene() {
  return (
    <section id="контакты" className="scene flex items-center">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1fr_0.82fr]">
        <div data-reveal className="dark-glass overflow-hidden rounded-[2.2rem] p-7 text-porcelain md:p-10">
          <div className="mb-16 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.32em] text-porcelain/42">AEVIX</span>
            <ShieldCheck className="h-6 w-6 text-violet" />
          </div>
          <h2 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.055em] md:text-7xl">
            Обсудим, где AI может снять повторяющуюся работу.
          </h2>
          <p className="mt-7 max-w-xl text-xl leading-8 text-porcelain/58">
            Расскажите, как сейчас приходят заявки и где команда делает одно и то же вручную. AEVIX предложит первый понятный сценарий.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Button asChild className="bg-porcelain text-ink hover:bg-white">
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
            <Button asChild variant="glass" className="border-white/12 bg-white/8 text-porcelain hover:bg-white/12">
              <a href={contacts.email.href}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          </div>
          <div className="mt-7 grid gap-3 text-sm text-porcelain/58 md:grid-cols-3">
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.whatsapp.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.whatsapp.value}</span>
            </a>
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.telegram.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.telegram.value}</span>
            </a>
            <a href={contacts.email.href} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40">
              <span className="block text-porcelain/36">{contacts.email.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.email.value}</span>
            </a>
          </div>
        </div>
        <div data-reveal className="grid gap-4">
          {[
            [Clock3, "Первая версия", "Срок первой версии определяется после разбора задачи"],
            [Layers3, "Формат", "AI dashboard, CRM-flow и клиентская автоматизация"],
            [Check, "Фокус", "Понятные сценарии вместо абстрактного списка функций"],
          ].map(([Icon, title, text]) => {
            const TypedIcon = Icon as IconComponent;
            return (
              <div key={title as string} className="glass-panel rounded-[1.75rem] p-6">
                <TypedIcon className="h-6 w-6 text-violet" />
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">{title as string}</h3>
                <p className="mt-3 text-base leading-7 text-ink/58">{text as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
      <StoryScene />
      <CasesScene />
      <TradingBotScene />
      <ProcessScene />
      <PrinciplesScene />
      <FounderScene />
      <ContactScene />
    </main>
  );
}
