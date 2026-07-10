"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
  Layers3,
  Mail,
  MessageCircle,
  MousePointer2,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const navItems = ["Главная", "Возможности", "Кейсы", "Процесс", "Контакты"];

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

const modules = [
  {
    id: "assistant",
    icon: Bot,
    title: "AI Assistant",
    metric: "82% диалогов без участия команды",
    intro: "Ведет первичный диалог, уточняет детали и передает команде только готовые обращения.",
    prompt: "Клиент хочет записаться сегодня после 18:00",
    answer: "Проверяю расписание, предлагаю 18:40 или 20:10 и подтверждаю визит без участия администратора.",
    scenario: [
      "Определяет намерение клиента и нужную услугу.",
      "Сверяет свободные окна и правила записи.",
      "Фиксирует заявку, отправляет подтверждение и ставит напоминание.",
    ],
    result: "Администратор видит готовую запись, а не длинную переписку.",
  },
  {
    id: "ops",
    icon: Workflow,
    title: "Operations Flow",
    metric: "минус 24 часа рутины каждую неделю",
    intro: "Собирает заявки, статусы, оплаты и напоминания в единый управляемый поток.",
    prompt: "Новая заявка без оплаты и без мастера",
    answer: "Назначаю ответственного, отправляю оплату и ставлю контрольный статус через 12 минут.",
    scenario: [
      "Находит незакрытый шаг в операционном процессе.",
      "Назначает ответственного и следующий конкретный статус.",
      "Подсвечивает владельцу только отклонения от нормы.",
    ],
    result: "Рутина не исчезает из бизнеса. Она перестает требовать ручного внимания.",
  },
  {
    id: "insights",
    icon: BrainCircuit,
    title: "Decision Intelligence",
    metric: "видно, где бизнес теряет деньги",
    intro: "Показывает узкие места, прогноз спроса и решения, которые напрямую влияют на выручку.",
    prompt: "Почему упали повторные визиты?",
    answer: "После пятницы нет follow-up. Запускаю возвратную цепочку и выделяю клиентов без повторной записи.",
    scenario: [
      "Сравнивает поведение клиентов по периодам и сегментам.",
      "Находит точку потери: нет follow-up после визита.",
      "Предлагает действие и показывает ожидаемый эффект.",
    ],
    result: "Владелец получает не отчет, а следующий управленческий шаг.",
  },
];

const cases = [
  {
    before: "3 часа ручной переписки",
    after: "15 минут контроля качества",
    label: "Сервисная компания",
    value: "Запись, уточнения и напоминания работают как единый операционный слой.",
  },
  {
    before: "Менеджеры теряют теплые заявки",
    after: "AI отвечает за 6 секунд",
    label: "Премиальный салон",
    value: "Каждый лид получает персональный ответ и ближайшее окно записи.",
  },
  {
    before: "Отчеты собираются в конце месяца",
    after: "Риски видны каждый день",
    label: "Локальная сеть",
    value: "Собственник видит загрузку, выручку и слабые места без лишних созвонов.",
  },
];

const processSteps = [
  "Диагностика операционной нагрузки",
  "Проектирование AI-сценариев",
  "Сборка интерфейса вокруг ролей команды",
  "Запуск, обучение и метрики",
];

function usePremiumMotion() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 0.82,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    const frame = requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 42, filter: "blur(14px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
        gsap.to(element, {
          yPercent: Number(element.dataset.parallax) || -12,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            scrub: true,
          },
        });
      });
    });

    const onPointerMove = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      ctx.revert();
      lenis.destroy();
    };
  }, []);
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
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -6;
    const ry = ((x / rect.width) - 0.5) * 8;
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
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-ink/10 bg-porcelain/68 px-3 py-2 shadow-[0_14px_44px_rgba(9,8,7,0.08)] backdrop-blur-2xl">
        <a
          href="#главная"
          aria-label="AEVIX, перейти к началу страницы"
          className="flex items-center gap-3 rounded-full px-3 py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-porcelain">
            AX
          </span>
          <span className="text-sm font-semibold tracking-[0.28em] text-ink">AEVIX</span>
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="rounded-full px-4 py-2 text-sm text-ink/62 transition hover:bg-ink/5 hover:text-ink"
            >
              {item}
            </a>
          ))}
        </div>
        <Button asChild variant="glass" size="sm">
          <a href="#контакты">
            <Sparkles className="mr-2 h-4 w-4" />
            Обсудить систему
          </a>
        </Button>
      </nav>
    </motion.header>
  );
}

function AiDashboard() {
  const [input, setInput] = useState("У меня барбершоп");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Для барбершопа я бы собрал контур записи, возврата клиентов и контроля загрузки мастеров. Начнем с входящих сообщений, свободных окон и повторных визитов.",
    },
  ]);
  const [isThinking, setThinking] = useState(false);
  const canSend = input.trim().length > 0 && !isThinking;

  const reply = useMemo(
    () =>
      `Для "${input || "вашего бизнеса"}" я бы запустил AI-администратора: он отвечает клиентам, предлагает окна записи, напоминает о визите и показывает владельцу точки потери выручки.`,
    [input],
  );

  const sendDemo = () => {
    if (!canSend) return;
    setMessages((current) => [...current, { role: "user", text: input }]);
    setThinking(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { role: "ai", text: reply }]);
      setThinking(false);
    }, 620);
  };

  return (
    <MagneticShell className="relative mx-auto w-full max-w-xl">
      <div className="dark-glass relative overflow-hidden rounded-[2rem] p-4 text-porcelain md:p-5">
        <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">AEVIX OS</p>
              <p className="text-xs text-porcelain/48">Операционный контур</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-porcelain/72">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            активно
          </div>
        </div>

        <div className="relative grid gap-3 py-4 sm:grid-cols-3">
          {[
            ["Заявки", "+38%", "ответ AI"],
            ["Время", "21 ч", "в неделю"],
            ["Риски", "4", "действия"],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-3xl border border-white/8 bg-white/[0.06] p-4">
              <p className="text-xs text-porcelain/44">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-porcelain/46">{sub}</p>
            </div>
          ))}
        </div>

        <div className="relative rounded-[1.5rem] border border-white/8 bg-black/22 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs text-porcelain/48">AI-демо</span>
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-porcelain/55">
              имитация ответа
            </span>
          </div>
          <div className="flex h-56 flex-col gap-2 overflow-hidden">
            {messages.slice(-4).map((message, index) => (
              <motion.div
                key={`${message.role}-${index}-${message.text}`}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed",
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
                className="flex w-fit items-center gap-2 rounded-full bg-white/[0.08] px-4 py-3 text-xs text-porcelain/52"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                AEVIX анализирует
              </motion.div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1.5">
            <input
              aria-label="AI demo prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendDemo();
              }}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-porcelain outline-none placeholder:text-porcelain/32"
              placeholder="Опишите бизнес"
            />
            <Button
              onClick={sendDemo}
              size="icon"
              aria-label="Отправить запрос в AI-демо"
              aria-disabled={!canSend}
              disabled={!canSend}
              title={canSend ? "Отправить запрос" : "Введите описание бизнеса"}
              className="h-9 w-9 bg-porcelain text-ink"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </MagneticShell>
  );
}

function HeroScene() {
  const y = useMotionValue(0);
  const smoothY = useSpring(y, { damping: 35, stiffness: 160 });
  const rotate = useTransform(smoothY, [-80, 80], [-2, 2]);

  return (
    <section id="главная" className="scene relative flex items-center overflow-hidden pt-28">
      <div className="absolute inset-x-0 top-24 mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-ink/18 to-transparent" />
      <motion.div
        style={{ rotate }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          y.set(event.clientY - rect.top - rect.height / 2);
        }}
        className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <div data-reveal className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/46 px-3 py-2 text-sm text-ink/62 backdrop-blur-xl">
            <MousePointer2 className="h-4 w-4 text-violet" />
            AI operating layer for business teams
          </div>
          <h1 className="text-balance text-[clamp(3.5rem,9vw,8.8rem)] font-semibold leading-[0.88] tracking-[-0.06em] text-ink">
            AEVIX
          </h1>
          <p className="mt-7 max-w-xl text-balance text-xl leading-8 text-ink/66 md:text-2xl md:leading-9">
            Премиальная AI-система для заявок, переписок и контроля команды. Без хаоса, ручных статусов и потерянных клиентов.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#возможности">
                Открыть возможности
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </a>
            </Button>
            <Button asChild variant="glass">
              <a href="#кейсы">
                <Play className="mr-2 h-4 w-4" />
                Смотреть результат
              </a>
            </Button>
          </div>
        </div>
        <div data-reveal data-parallax="-5">
          <AiDashboard />
        </div>
      </motion.div>
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-ink/42 md:flex">
        <ChevronDown className="h-4 w-4 animate-bounce" />
        scroll
      </div>
    </section>
  );
}

function ScenarioModal({
  module,
  onClose,
}: {
  module: (typeof modules)[number];
  onClose: () => void;
}) {
  const Icon = module.icon;

  useEffect(() => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/48 p-4 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="dark-glass relative max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-5 text-porcelain md:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть демонстрацию сценария"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-porcelain/70 transition hover:bg-white/14 hover:text-porcelain"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-5 pr-12 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-porcelain text-ink shadow-glow">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet">Демо сценария</p>
            <h3 id="scenario-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              {module.title}
            </h3>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-porcelain/62">{module.intro}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          {module.scenario.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.32 }}
              className="flex gap-4 rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet/18 text-sm font-semibold text-violet">
                {index + 1}
              </span>
              <p className="text-base leading-7 text-porcelain/76">{step}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-porcelain p-5 text-ink">
          <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Результат</p>
          <p className="mt-3 text-xl font-medium leading-8 tracking-[-0.02em]">{module.result}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-porcelain text-ink hover:bg-white">
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Обсудить в WhatsApp
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
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.72fr_1fr]">
        <div data-reveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
            Возможности
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-ink md:text-6xl">
            Не набор функций. Рабочие модули для живого бизнеса.
          </h2>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = module.id === active;
              return (
                <button
                  key={module.id}
                  onClick={() => setActive(module.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group rounded-[1.75rem] border p-4 text-left transition duration-300",
                    isActive
                      ? "border-ink/14 bg-ink text-porcelain shadow-object"
                      : "border-ink/10 bg-white/42 text-ink hover:-translate-y-1 hover:bg-white/70 hover:shadow-object",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-violet" : "text-ink/52")} />
                  <p className="mt-8 text-base font-medium">{module.title}</p>
                  <p className={cn("mt-2 text-sm", isActive ? "text-porcelain/56" : "text-ink/52")}>
                    {module.metric}
                  </p>
                </button>
              );
            })}
          </div>
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
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
                  Действие AI
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

function CasesScene() {
  return (
    <section id="кейсы" className="scene flex items-center bg-ink text-porcelain">
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-violet">
              Кейсы
            </p>
            <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Не обещания. Измеримая разница в ежедневной работе.
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-7 text-porcelain/52">
            AEVIX ценен там, где владелец перестает контролировать мелочи и начинает видеть систему.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {cases.map((item, index) => (
            <MagneticShell key={item.label} className="h-full" >
              <motion.article
                data-reveal
                transition={{ delay: index * 0.08 }}
                className="group relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-5"
              >
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <p className="text-sm text-porcelain/48">{item.label}</p>
                <div className="mt-10 space-y-4">
                  <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-porcelain/32">До</p>
                    <p className="text-2xl font-semibold tracking-[-0.02em] text-porcelain/78">
                      {item.before}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-porcelain p-5 text-ink shadow-glow">
                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-ink/42">После</p>
                    <p className="text-2xl font-semibold tracking-[-0.02em]">{item.after}</p>
                  </div>
                </div>
                <p className="mt-7 text-base leading-7 text-porcelain/54">{item.value}</p>
              </motion.article>
            </MagneticShell>
          ))}
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
            Мы проектируем AEVIX вокруг реальных ролей: владельца, администратора, менеджера и клиента. Поэтому система работает внутри бизнеса, а не рядом с ним.
          </p>
        </div>
        <div className="space-y-4">
          {processSteps.map((step, index) => (
            <motion.div
              key={step}
              data-reveal
              className="glass-panel flex items-center gap-5 rounded-[1.5rem] p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-porcelain">
                {String(index + 1).padStart(2, "0")}
              </div>
              <p className="text-xl font-medium tracking-[-0.02em]">{step}</p>
            </motion.div>
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
            Обсудим, где AI даст бизнесу реальный эффект.
          </h2>
          <p className="mt-7 max-w-xl text-xl leading-8 text-porcelain/58">
            Если команда тонет в сообщениях, статусах и повторяющихся действиях, AEVIX превращает это в понятный операционный продукт.
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
            <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]">
              <span className="block text-porcelain/36">{contacts.whatsapp.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.whatsapp.value}</span>
            </a>
            <a href={contacts.telegram.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]">
              <span className="block text-porcelain/36">{contacts.telegram.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.telegram.value}</span>
            </a>
            <a href={contacts.email.href} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]">
              <span className="block text-porcelain/36">{contacts.email.label}</span>
              <span className="mt-1 block text-porcelain">{contacts.email.value}</span>
            </a>
          </div>
        </div>
        <div data-reveal className="grid gap-4">
          {[
            [Clock3, "Первая версия", "14-21 день до рабочего прототипа"],
            [Layers3, "Формат", "AI dashboard, CRM-flow и клиентская автоматизация"],
            [Check, "Фокус", "Экономия времени, меньше потерь и прозрачный контроль"],
          ].map(([Icon, title, text]) => {
            const TypedIcon = Icon as typeof Clock3;
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

export default function Home() {
  usePremiumMotion();

  return (
    <main>
      <TopNav />
      <HeroScene />
      <FeatureModules />
      <CasesScene />
      <ProcessScene />
      <ContactScene />
    </main>
  );
}
