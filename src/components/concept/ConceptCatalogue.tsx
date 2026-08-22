import { cn } from "@/lib/utils";
import { pluralItems, type Catalogue, type CatalogueItem, type PriceDisplay } from "@/lib/catalogue-model";

/**
 * Каталог услуг/цен сгенерированного сайта как decision surface (этап 5).
 *
 * Не прайс-таблица и не стена одинаковых SaaS-карточек: сильная типографическая иерархия, крупная
 * цена как часть композиции, реальные категории для навигации, один signature-акцент, тихие
 * разделители. Быстро сканируется, но выглядит спроектированным.
 *
 * Собственный визуальный язык (`--concept-*` слой), НЕ переиспользует ни ConceptServices (превью
 * характера), ни карточки «Процесса» (story). Данные — из одной модели `Catalogue`
 * (catalogue-model.ts); эта поверхность лишь представляет её как момент принятия решения.
 *
 * Доступность: категории — навигация со ссылками-якорями; позиции — семантический список; в DOM имя
 * идёт перед ценой, поэтому screen reader читает «услуга — цена», даже если визуально они разнесены
 * по краям строки.
 */

/** Нейтральная метка флагмана из САМОГО названия (тип предложения), без выдуманной популярности. */
function signatureTag(name: string): string {
  const low = name.toLowerCase();
  if (low.includes("vip")) return "VIP";
  if (low.includes("комплекс")) return "Комплекс";
  if (low.includes("подписк") || low.includes("абонемент")) return "Абонемент";
  if (low.includes("под ключ")) return "Под ключ";
  return "Флагман";
}

function Price({ price }: { price: PriceDisplay }) {
  return (
    <span className="concept-price" data-kind={price.kind}>
      {price.lead ? <span className="concept-price-lead">{price.lead}</span> : null}
      {/* value уже содержит валюту целиком («8 500 ₸») — currency никогда не отрывается от числа. */}
      <span className="concept-price-value">{price.value}</span>
    </span>
  );
}

function Row({ item }: { item: CatalogueItem }) {
  return (
    <li className={cn("concept-catalogue-row", item.featured && "is-featured")}>
      <span className="concept-catalogue-row-name">{item.name}</span>
      <span className="concept-catalogue-row-dots" aria-hidden="true" />
      <span className="concept-catalogue-row-price">
        <Price price={item.price} />
      </span>
    </li>
  );
}

export type ConceptCatalogueProps = {
  catalogue: Catalogue;
  /** Заголовок секции (из структуры сайта) и подводка. */
  title: string;
  text?: string;
  onCta: () => void;
};

export function ConceptCatalogue({ catalogue, title, text, onCta }: ConceptCatalogueProps) {
  const { categories, featured, priceRange, cta, itemNoun, total } = catalogue;
  const multiCategory = categories.length > 1;
  // Маленький каталог — редакционный (крупнее, воздушнее); большой — утилитарный (рельс категорий,
  // плотнее). Один layout не обязан обслуживать оба одинаково.
  const size = total <= 6 ? "editorial" : "utilitarian";

  return (
    <section className="concept-section concept-catalogue" data-kind={catalogue.kind} data-size={size}>
      <div className="concept-catalogue-head">
        <p className="concept-catalogue-eyebrow">
          {catalogue.title} <span className="concept-demo-chip">Демо-цены</span>
        </p>
        <h3>{title}</h3>
        {text ? <span className="concept-catalogue-lede">{text}</span> : null}
        <p className="concept-catalogue-meta">
          {pluralItems(total, itemNoun)}
          {priceRange ? <span className="concept-catalogue-meta-range"> · {priceRange.display}</span> : null}
        </p>
      </div>

      {featured ? (
        <div className="concept-catalogue-featured">
          <div className="concept-catalogue-featured-copy">
            <span className="concept-catalogue-featured-tag">{signatureTag(featured.name)}</span>
            <strong className="concept-catalogue-featured-name">{featured.name}</strong>
            <div className="concept-catalogue-featured-price">
              <Price price={featured.price} />
            </div>
          </div>
          <button type="button" className="concept-catalogue-featured-cta" onClick={onCta}>
            {cta}
          </button>
        </div>
      ) : null}

      {multiCategory ? (
        <nav className="concept-catalogue-rail" aria-label={`Категории: ${catalogue.title}`}>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <a href={`#cat-${category.id}`}>{category.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="concept-catalogue-body">
        {categories.map((category) => (
          <section
            key={category.id}
            id={`cat-${category.id}`}
            className="concept-catalogue-category"
            aria-labelledby={multiCategory ? `cat-${category.id}-title` : undefined}
          >
            {multiCategory ? (
              <h4 id={`cat-${category.id}-title`} className="concept-catalogue-cat-title">
                {category.label}
                <span className="concept-catalogue-cat-count" aria-hidden="true">
                  {category.items.length}
                </span>
              </h4>
            ) : null}
            <ul className="concept-catalogue-list">
              {category.items.map((item) => (
                <Row key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="concept-catalogue-foot">
        <button type="button" className="concept-catalogue-cta" onClick={onCta}>
          {cta}
        </button>
        <span className="concept-catalogue-note">Демонстрационные цены — при наполнении сайта их заменят ваши.</span>
      </div>
    </section>
  );
}

export default ConceptCatalogue;
