import type { HeroKind } from "@/lib/concept-composition";
import type { WebsiteConceptHero } from "@/lib/website-concept";

/**
 * Hero сгенерированного сайта — примитив с пятью геометриями.
 *
 * Раньше hero был зашит одной разметкой «текст слева, фото справа» для всех тринадцати стилей, и
 * из-за жёсткого `minmax(20rem, …)` на колонке фото при узкой сцене картинка держала ширину, а
 * заголовок сжимался под неё и наезжал. Это лечится не подгонкой одного примера, а тем, что
 * геометрию теперь выбирает семейство, и КАЖДАЯ геометрия безопасна по построению:
 *
 *  - у текстовой колонки всегда `min-width: 0` и мера в ch, поэтому её нечему передавить;
 *  - фото ограничено своими рамками и не диктует ширину соседу;
 *  - на узком экране композиция ПЕРЕСТРАИВАЕТСЯ (см. CSS `data-hero` + брейкпоинты), а не
 *    масштабируется, сохраняя характер семейства.
 *
 * Все варианты собраны из двух общих кусков — копии и медиа, — но ставят их в разной геометрии.
 * Поэтому это примитив, а не пять отдельных hero с дублированным JSX.
 */

export type ConceptHeroProps = {
  kind: HeroKind;
  hero: WebsiteConceptHero;
  businessName: string;
  businessType: string;
  imageSrc: string;
  gradient: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

function Copy({ hero, onPrimary, onSecondary }: Pick<ConceptHeroProps, "hero" | "onPrimary" | "onSecondary">) {
  return (
    <div className="concept-hero-copy">
      <p>{hero.eyebrow}</p>
      <h2>{hero.title}</h2>
      <span>{hero.subtitle}</span>
      <div className="concept-hero-actions">
        <button type="button" onClick={onPrimary}>
          {hero.primaryCta}
        </button>
        <button type="button" onClick={onSecondary}>
          {hero.secondaryCta}
        </button>
      </div>
    </div>
  );
}

function Media({
  imageSrc,
  gradient,
  businessName,
  businessType,
  caption = true,
}: Pick<ConceptHeroProps, "imageSrc" | "gradient" | "businessName" | "businessType"> & { caption?: boolean }) {
  return (
    <div className="concept-hero-visual" style={{ background: gradient }}>
      {/* Decorative external mock imagery with a gradient fallback — plain img by design. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={imageSrc} className="concept-photo concept-hero-photo" src={imageSrc} alt="" loading="lazy" />
      {caption ? (
        <div className="concept-hero-visual-caption">
          <span>{businessType}</span>
          <strong>{businessName}</strong>
        </div>
      ) : null}
    </div>
  );
}

/**
 * `image-led` и `statement` кладут копию и медиа в другом порядке и с другими ролями, поэтому у
 * них своя сборка; `split`, `overlap`, `canvas` — это копия + медиа в разной сетке, разницу
 * между ними держит CSS по `data-hero`. Порядок в разметке для наезжающих вариантов важен:
 * медиа идёт первой и лежит слоем ниже, копия поверх.
 */
export function ConceptHero(props: ConceptHeroProps) {
  const { kind } = props;

  if (kind === "image-led") {
    // Фото — главный материал, занимает экран; копия лежит поверх снизу в безопасном контейнере.
    return (
      <section className="concept-hero" data-hero="image-led">
        <Media {...props} caption={false} />
        <div className="concept-hero-overlay">
          <Copy {...props} />
        </div>
      </section>
    );
  }

  if (kind === "statement") {
    // Только типографика по центру; фото уходит отдельным широким блоком под заявлением.
    return (
      <section className="concept-hero" data-hero="statement">
        <Copy {...props} />
        <Media {...props} />
      </section>
    );
  }

  // split / overlap / canvas: медиа первой (нижний слой), копия поверх. Разную сетку задаёт CSS.
  return (
    <section className="concept-hero" data-hero={kind}>
      <Media {...props} />
      <Copy {...props} />
    </section>
  );
}

export default ConceptHero;
