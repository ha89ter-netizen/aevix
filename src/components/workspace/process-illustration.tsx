import type { ProcessStageType } from "@/lib/process-illustrations";

/**
 * Микро-сцены «Процесса» (этап 4) — из UI-примитивов, а не из библиотеки иллюстраций.
 *
 * Каждый семантический тип получает СВОЮ композицию: сообщение приходит, запрос разбирается на
 * параметры, в календаре загорается слот, запись оседает в системе, приходит подтверждение,
 * складывается результат. Сцена ПОКАЗЫВАЕТ действие — этого и не хватало прежней схеме с иконкой.
 *
 * Общий визуальный язык (одна viewBox, один штрих, одна палитра из токенов), но композиции разные:
 * объект по центру, интерфейс сбоку, вход→выход, два объекта, состояние, последовательность.
 *
 * Движение — только вход (translate/opacity/draw), финальное состояние статично и полностью
 * читаемо само по себе: при reduced-motion сцена просто показана целиком (см. globals.css). Это
 * и есть ответ на «уберите текст — понятно ли по иллюстрациям»: сцены самодостаточны.
 *
 * `revealed` включает однократное проявление, когда карточка попала во вьюпорт (см. ProcessStory).
 */

export type ProcessIllustrationProps = {
  type: ProcessStageType;
  revealed: boolean;
};

const VB = "0 0 240 150";

/** Аватар-кружок с инициалом-штрихом. */
function Avatar({ x, y, r = 15, accent = false }: { x: number; y: number; r?: number; accent?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={accent ? "pi-accent" : "pi-soft"} />
      <circle cx={x} cy={y - r * 0.28} r={r * 0.3} className="pi-bg" />
      <path d={`M ${x - r * 0.55} ${y + r * 0.7} a ${r * 0.55} ${r * 0.5} 0 0 1 ${r * 1.1} 0`} className="pi-bg" />
    </g>
  );
}

/** Строка-«текст» разной длины. Координаты — как у SVG-атрибутов, число или строка. */
function Line({
  x,
  y,
  w,
  className = "pi-muted",
}: {
  x: number | string;
  y: number | string;
  w: number | string;
  className?: string;
}) {
  return <rect x={x} y={y} width={w} height="4" rx="2" className={className} />;
}

function Scene({ type }: { type: ProcessStageType }) {
  switch (type) {
    case "message":
      // Интерфейс чата сбоку: входящий пузырь поднимается снизу.
      return (
        <>
          <rect x="46" y="20" width="148" height="110" rx="14" className="pi-panel" />
          <rect x="60" y="34" width="60" height="14" rx="7" className="pi-soft" />
          <rect x="60" y="58" width="88" height="14" rx="7" className="pi-soft" />
          <g className="pi-rise">
            <rect x="96" y="88" width="84" height="26" rx="13" className="pi-accent" />
            <circle cx="176" cy="126" r="4" className="pi-accent" />
            <Line x="106" y="96" w="52" className="pi-onaccent" />
            <Line x="106" y="104" w="36" className="pi-onaccent" />
          </g>
        </>
      );
    case "capture":
      // Пузырь слева → стрелка → три параметра-чипа: обращение разобрано на детали.
      return (
        <>
          <rect x="20" y="52" width="66" height="46" rx="12" className="pi-soft" />
          <Line x="32" y="66" w="42" />
          <Line x="32" y="78" w="30" />
          <path d="M 92 75 h 26" className="pi-arrow" markerEnd="url(#pi-arrow)" />
          <g className="pi-stagger">
            <rect x="128" y="40" width="92" height="20" rx="10" className="pi-chip" />
            <Line x="140" y="49" w="40" className="pi-accentline" />
            <rect x="128" y="66" width="92" height="20" rx="10" className="pi-chip" />
            <Line x="140" y="75" w="56" className="pi-accentline" />
            <rect x="128" y="92" width="92" height="20" rx="10" className="pi-chip" />
            <Line x="140" y="101" w="32" className="pi-accentline" />
          </g>
        </>
      );
    case "analysis":
      // Данные под лупой: одна строка «понята» (акцент), полоса сканирует, лупа — статичный
      // признак осмысления (сцена читается и без движения).
      return (
        <>
          <rect x="40" y="24" width="150" height="96" rx="14" className="pi-panel" />
          <Line x="58" y="44" w="84" className="pi-soft2" />
          <Line x="58" y="60" w="110" className="pi-accentline" />
          <Line x="58" y="76" w="68" className="pi-soft2" />
          <Line x="58" y="92" w="96" className="pi-soft2" />
          <rect className="pi-scan" x="40" y="24" width="28" height="96" />
          <g className="pi-pop">
            <circle cx="170" cy="98" r="19" className="pi-bg" />
            <circle cx="170" cy="98" r="19" className="pi-check-ring" fill="none" />
            <circle cx="170" cy="98" r="10" className="pi-lens" fill="none" />
            <path d="M 178 106 l 9 9" className="pi-lens" fill="none" />
          </g>
        </>
      );
    case "scheduling": {
      // Мини-календарь: занятые ячейки серые, один подходящий слот загорается.
      const cells = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 5; c++) {
          const busy = (r + c) % 3 === 0;
          cells.push(
            <rect
              key={`${r}-${c}`}
              x={54 + c * 28}
              y={44 + r * 24}
              width="22"
              height="18"
              rx="5"
              className={busy ? "pi-soft" : "pi-cell"}
            />,
          );
        }
      return (
        <>
          <rect x="44" y="22" width="152" height="106" rx="14" className="pi-panel" />
          <rect x="54" y="30" width="40" height="8" rx="4" className="pi-accentline" />
          {cells}
          <rect x="54" y="92" width="22" height="18" rx="5" className="pi-slot" />
        </>
      );
    }
    case "payment":
      // Карта с суммой: оплата принята.
      return (
        <>
          <rect x="52" y="34" width="136" height="84" rx="14" className="pi-accent" />
          <rect x="66" y="50" width="30" height="22" rx="5" className="pi-onaccent-fill" />
          <Line x="66" y="86" w="70" className="pi-onaccent" />
          <Line x="66" y="98" w="44" className="pi-onaccent" />
          <g className="pi-pop">
            <circle cx="168" cy="44" r="16" className="pi-bg" />
            <circle cx="168" cy="44" r="16" className="pi-check-ring" fill="none" />
            <path d="M 161 44 l 5 5 l 9 -10" className="pi-check" fill="none" />
          </g>
        </>
      );
    case "crm": {
      // Стопка записей: новая карточка оседает сверху в список.
      return (
        <>
          <rect x="46" y="44" width="148" height="86" rx="12" className="pi-panel" />
          <rect x="58" y="82" width="124" height="18" rx="6" className="pi-soft" />
          <rect x="58" y="104" width="124" height="18" rx="6" className="pi-soft" />
          <g className="pi-drop">
            <rect x="58" y="56" width="124" height="20" rx="6" className="pi-chip" />
            <circle cx="70" cy="66" r="5" className="pi-accent" />
            <Line x="82" y="64" w="70" className="pi-accentline" />
          </g>
        </>
      );
    }
    case "notification":
      // Тост с галочкой + статус переключается на «подтверждено».
      return (
        <>
          <g className="pi-rise">
            <rect x="40" y="40" width="160" height="40" rx="12" className="pi-panel" />
            <circle cx="64" cy="60" r="12" className="pi-accent" />
            <path d="M 58 60 l 4 4 l 8 -9" className="pi-check-onaccent" fill="none" />
            <Line x="86" y="54" w="86" className="pi-soft2" />
            <Line x="86" y="66" w="60" className="pi-soft2" />
          </g>
          <g className="pi-pop">
            <rect x="86" y="98" width="90" height="24" rx="12" className="pi-status" />
            <circle cx="102" cy="110" r="4" className="pi-accent" />
            <Line x="112" y="108" w="52" className="pi-accentline" />
          </g>
        </>
      );
    case "review": {
      // Пять звёзд, заполняются слева направо.
      const star = (cx: number, i: number) => {
        const pts = Array.from({ length: 10 }, (_, k) => {
          const ang = (Math.PI / 5) * k - Math.PI / 2;
          const rad = k % 2 === 0 ? 15 : 6.4;
          return `${(cx + rad * Math.cos(ang)).toFixed(1)},${(75 + rad * Math.sin(ang)).toFixed(1)}`;
        }).join(" ");
        return <polygon key={i} points={pts} className="pi-star" style={{ ["--i" as string]: i }} />;
      };
      return <g className="pi-stars">{[0, 1, 2, 3, 4].map((i) => star(48 + i * 36, i))}</g>;
    }
    case "document":
      // Лист с текстом + печать/галочка.
      return (
        <>
          <rect x="66" y="20" width="108" height="112" rx="10" className="pi-panel" />
          <Line x="82" y="40" w="60" className="pi-soft2" />
          <Line x="82" y="56" w="76" className="pi-soft2" />
          <Line x="82" y="72" w="70" className="pi-soft2" />
          <Line x="82" y="88" w="52" className="pi-soft2" />
          <g className="pi-pop">
            <circle cx="150" cy="106" r="15" className="pi-accent-soft" />
            <path d="M 143 106 l 5 5 l 10 -11" className="pi-check" fill="none" />
          </g>
        </>
      );
    case "delivery":
      // Вход → стрелка → выход: результат передаётся клиенту.
      return (
        <>
          <rect x="26" y="52" width="58" height="46" rx="10" className="pi-soft" />
          <Line x="40" y="68" w="30" />
          <Line x="40" y="80" w="22" />
          <path d="M 92 75 h 30" className="pi-arrow pi-slide" markerEnd="url(#pi-arrow)" />
          <g className="pi-rise">
            <rect x="130" y="44" width="84" height="62" rx="12" className="pi-accent" />
            <path d="M 130 62 h 84" className="pi-onaccent-stroke" />
            <rect x="160" y="44" width="24" height="18" className="pi-onaccent-fill" />
          </g>
        </>
      );
    case "inventory": {
      // Стопки коробок + счётчик остатка.
      return (
        <>
          <rect x="40" y="86" width="40" height="34" rx="4" className="pi-soft" />
          <rect x="40" y="60" width="40" height="24" rx="4" className="pi-soft" />
          <rect x="86" y="72" width="40" height="48" rx="4" className="pi-soft" />
          <rect x="132" y="94" width="40" height="26" rx="4" className="pi-soft" />
          <g className="pi-pop">
            <rect x="150" y="36" width="54" height="30" rx="8" className="pi-chip" />
            <Line x="162" y="47" w="14" className="pi-accentline" />
            <rect x="182" y="44" width="12" height="14" rx="3" className="pi-accent" />
          </g>
        </>
      );
    }
    case "handoff":
      // Два объекта: токен передаётся от клиента специалисту.
      return (
        <>
          <Avatar x={64} y={78} r={20} />
          <Avatar x={176} y={78} r={20} accent />
          <path d="M 90 78 h 60" className="pi-arrow" markerEnd="url(#pi-arrow)" />
          <g className="pi-slide">
            <rect x="104" y="70" width="32" height="16" rx="8" className="pi-chip" />
          </g>
        </>
      );
    case "completion":
    default:
      // Результат: галочка рисуется в кольце + маленький показатель растёт.
      return (
        <>
          <circle cx="96" cy="72" r="34" className="pi-accent-soft" />
          <circle cx="96" cy="72" r="34" className="pi-check-ring" fill="none" />
          <path d="M 80 72 l 11 12 l 22 -26" className="pi-check pi-draw" fill="none" />
          <g className="pi-rise">
            <rect x="150" y="94" width="14" height="24" rx="3" className="pi-soft" />
            <rect x="170" y="80" width="14" height="38" rx="3" className="pi-accent" />
            <rect x="190" y="66" width="14" height="52" rx="3" className="pi-accent" />
          </g>
        </>
      );
  }
}

export function ProcessIllustration({ type, revealed }: ProcessIllustrationProps) {
  return (
    <svg
      className="process-illustration"
      viewBox={VB}
      role="img"
      aria-hidden="true"
      data-type={type}
      data-revealed={revealed ? "true" : "false"}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="pi-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 9 5 L 0 10 z" className="pi-arrowhead" />
        </marker>
      </defs>
      <Scene type={type} />
    </svg>
  );
}

export default ProcessIllustration;
