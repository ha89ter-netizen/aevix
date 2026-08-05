"use client";

import { Fragment } from "react";
import {
  BellRing,
  Bot,
  ClipboardCheck,
  CreditCard,
  MessageCircle,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Карта процесса как конвейер, а не как список.
 *
 * Раньше здесь стояли одинаковые карточки одна под другой: они занимали 38% ширины, обрывались
 * на середине экрана и не сообщали главного — что шаги СВЯЗАНЫ и происходят сами. Порядок был
 * передан только цифрами в кружках, то есть читался как оглавление документа.
 *
 * Теперь узлы соединены линией со стрелками и разворачиваются по ширине, а на узком экране —
 * в столбец с той же линией слева. Значок подбирается по смыслу шага, поэтому «AI отвечает» и
 * «Команда подтверждает» различаются с одного взгляда, а не только текстом.
 *
 * Движение намеренно однократное: узлы проявляются по очереди при появлении и дальше стоят.
 * Бесконечная пульсация превратила бы рабочий экран в витрину и мешала бы читать.
 */

/** Значок по смыслу шага. Ключи — по корням слов, чтобы ловить падежи и формы. */
const ICON_RULES: Array<{ words: string[]; icon: LucideIcon }> = [
  { words: ["клиент", "гость", "пишет", "обращ", "звон"], icon: MessageCircle },
  { words: ["ai", "бот", "автоответ", "отвеча"], icon: Bot },
  { words: ["заявк", "фиксир", "запис", "бронь", "заказ"], icon: ClipboardCheck },
  { words: ["команд", "менеджер", "мастер", "сотрудник", "подтвержда"], icon: Users },
  { words: ["напомин", "уведом", "оповещ"], icon: BellRing },
  { words: ["отзыв", "оцен", "рейтинг"], icon: Star },
  { words: ["оплат", "плат", "счёт", "счет"], icon: CreditCard },
];

function iconFor(step: string): LucideIcon {
  const text = step.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.words.some((word) => text.includes(word))) return rule.icon;
  }
  // Ничего не совпало — узел всё равно должен читаться как узел, а не как пустое место.
  return ClipboardCheck;
}

export function WorkflowPipeline({ steps }: { steps: string[] }) {
  return (
    <div className="workflow">
      <div className="workflow-pipeline" role="list" aria-label="Карта процесса">
        {steps.map((step, index) => {
          const Icon = iconFor(step);
          return (
            <Fragment key={`${step}-${index}`}>
              {/* Соединитель — самостоятельный элемент ленты, а не украшение узла: так цепочка
                  не может разъехаться, где бы ни оказалась граница прокрутки. */}
              {index > 0 ? (
                <span className="workflow-link" aria-hidden="true" style={{ animationDelay: `${index * 90 - 45}ms` }} />
              ) : null}
              <div
                className="workflow-node"
                role="listitem"
                // Задержка волной: узлы проявляются по очереди, а не все разом. Инлайном, потому
                // что число шагов приходит из анализа и заранее неизвестно.
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="workflow-node-mark" aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="workflow-node-body">
                  <span className="workflow-node-step">Шаг {index + 1}</span>
                  <span className="workflow-node-title">{step}</span>
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Пояснение, а не инструкция: две строки о том, откуда взялась последовательность и что
          с ней происходит дальше. Главным на странице остаётся схема. */}
      <p className="workflow-note">
        <strong>Откуда эта последовательность</strong>
        <span>
          Шаги выведены из AI-анализа вашего бизнеса — по тому, как к вам приходят обращения и где теряется время.
          Порядок повторяет путь клиента: от первого сообщения до отзыва. На этой же цепочке построен расчёт стоимости
          в разделе «Цены»: каждый шаг — это участок, который можно автоматизировать отдельно.
        </span>
      </p>
    </div>
  );
}
