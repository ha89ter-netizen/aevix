import type { ServiceKind } from "@/lib/concept-composition";
import type { ConceptOffer } from "@/lib/website-concept";

/**
 * Превью услуг на главной — примитив с четырьмя подачами.
 *
 * Полный каталог с ценами живёт ТОЛЬКО на странице услуг; здесь — превью характера бизнеса,
 * поэтому карточек немного (число задаёт семейство). Разные семейства подают одни и те же услуги
 * по-разному: сетка карточек, типографический список, колонки категорий или одно направление
 * крупно. Это геометрия, а не оформление, — поэтому подача входит в различие стилей.
 */

export type ConceptServicesProps = {
  kind: ServiceKind;
  eyebrow: string;
  title: string;
  text?: string;
  services: ConceptOffer[];
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

export function ConceptServices({ kind, eyebrow, title, text, services }: ConceptServicesProps) {
  if (kind === "list") {
    // Редакционный список: минимум рамок, ведёт типографика и нумерация.
    return (
      <section className="concept-section concept-services" data-services="list">
        <Heading eyebrow={eyebrow} title={title} text={text} />
        <ol className="concept-service-list">
          {services.map((service, index) => (
            <li key={service.name}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{service.name}</strong>
              <span>{service.price}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (kind === "columns") {
    // Категории в колонках — для бизнесов, у которых услуги читаются как разделы каталога.
    return (
      <section className="concept-section concept-services" data-services="columns">
        <Heading eyebrow={eyebrow} title={title} text={text} />
        <div className="concept-service-columns">
          {services.map((service) => (
            <article key={service.name}>
              <strong>{service.name}</strong>
              <span>{service.price}</span>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "feature") {
    // Одно направление крупно, остальные тихо рядом: показывает главное, а не список.
    const [lead, ...rest] = services;
    return (
      <section className="concept-section concept-services" data-services="feature">
        <Heading eyebrow={eyebrow} title={title} text={text} />
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
      </section>
    );
  }

  // cards — сдержанная сетка карточек с номерами.
  return (
    <section className="concept-section concept-services" data-services="cards">
      <Heading eyebrow={eyebrow} title={title} text={text} />
      <div className="concept-service-cards">
        {services.map((service, index) => (
          <article key={service.name}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{service.name}</strong>
            <span>{service.price}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ConceptServices;
