import type { ReactNode } from "react";
import type { ServiceKind } from "@/lib/concept-composition";
import type { ConceptOffer } from "@/lib/website-concept";

/**
 * Превью услуг на главной — примитив с четырьмя подачами.
 *
 * Полный каталог с ценами живёт ТОЛЬКО в разделе pricing (этап 5, `ConceptCatalogue`); здесь —
 * редакционное превью характера бизнеса. С этапа 5 главная показывает не первые N строк каталога, а
 * signature-выборку из разных категорий плюс подвал превью (`footer`): диапазон цен, счётчик и
 * призыв «Все услуги». Разные семейства подают одни и те же услуги по-разному — это геометрия, а не
 * оформление.
 */

export type ConceptServicesProps = {
  kind: ServiceKind;
  eyebrow: string;
  title: string;
  text?: string;
  services: ConceptOffer[];
  /** Подвал превью (диапазон цен + «Все услуги»). Живёт внутри секции, в её ритме. */
  footer?: ReactNode;
};

function Heading({ eyebrow, title, text }: Pick<ConceptServicesProps, "eyebrow" | "title" | "text">) {
  return (
    <div className="concept-section-heading">
      <p>{eyebrow}</p>
      <h3>{title}</h3>
      {text ? <span>{text}</span> : null}
    </div>
  );
}

function Body({ kind, services }: Pick<ConceptServicesProps, "kind" | "services">) {
  if (kind === "list") {
    // Редакционный список: минимум рамок, ведёт типографика и нумерация.
    return (
      <ol className="concept-service-list">
        {services.map((service, index) => (
          <li key={service.name}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{service.name}</strong>
            <span>{service.price}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (kind === "columns") {
    // Категории в колонках — для бизнесов, у которых услуги читаются как разделы каталога.
    return (
      <div className="concept-service-columns">
        {services.map((service) => (
          <article key={service.name}>
            <strong>{service.name}</strong>
            <span>{service.price}</span>
          </article>
        ))}
      </div>
    );
  }

  if (kind === "feature") {
    // Одно направление крупно, остальные тихо рядом: показывает главное, а не список.
    const [lead, ...rest] = services;
    return (
      <div className="concept-service-feature">
        {lead ? (
          <article className="concept-service-lead">
            <strong>{lead.name}</strong>
            <span>{lead.price}</span>
          </article>
        ) : null}
        <div className="concept-service-rest">
          {rest.map((service) => (
            <article key={service.name}>
              <strong>{service.name}</strong>
              <span>{service.price}</span>
            </article>
          ))}
        </div>
      </div>
    );
  }

  // cards — сдержанная сетка карточек с номерами.
  return (
    <div className="concept-service-cards">
      {services.map((service, index) => (
        <article key={service.name}>
          <small>{String(index + 1).padStart(2, "0")}</small>
          <strong>{service.name}</strong>
          <span>{service.price}</span>
        </article>
      ))}
    </div>
  );
}

export function ConceptServices({ kind, eyebrow, title, text, services, footer }: ConceptServicesProps) {
  return (
    <section className="concept-section concept-services" data-services={kind}>
      <Heading eyebrow={eyebrow} title={title} text={text} />
      <Body kind={kind} services={services} />
      {footer}
    </section>
  );
}

export default ConceptServices;
