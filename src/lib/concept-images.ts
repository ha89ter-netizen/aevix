/**
 * Category-matched imagery for the generated website concept, so a coffee concept shows a
 * coffee shop, a dental concept shows a clinic, etc. Every photo ID below was loaded and
 * visually verified to depict the right business (contact-sheet check), so the concept reads
 * as "this is really my business" rather than a random stock aesthetic. Each frame also has a
 * themed gradient behind it, so a failed image never leaves an empty block.
 */

const CDN = "https://images.unsplash.com/photo-";

function hero(id: string): string {
  return `${CDN}${id}?w=1000&q=70&auto=format&fit=crop`;
}
function tile(id: string): string {
  return `${CDN}${id}?w=560&q=60&auto=format&fit=crop`;
}

export type ConceptImagery = {
  /** CSS gradient shown behind photos (themed, and the graceful fallback). */
  gradient: string;
  hero: string;
  gallery: [string, string, string];
};

const SETS = {
  coffee: {
    gradient: "linear-gradient(145deg, #3a2a1e, #6b4a30)",
    hero: hero("1554118811-1e0d58224f24"),
    gallery: [tile("1509042239860-f550ce710b93"), tile("1511920170033-f8396924c348"), tile("1445116572660-236099ec97a0")],
  },
  restaurant: {
    gradient: "linear-gradient(145deg, #2a1f1a, #5a3d2e)",
    hero: hero("1517248135467-4c7edcad34c4"),
    gallery: [tile("1504674900247-0877df9cc836"), tile("1552566626-52f8b828add9"), tile("1470337458703-46ad1756a187")],
  },
  barbershop: {
    gradient: "linear-gradient(145deg, #201d1b, #423a34)",
    hero: hero("1585747860715-2ba37e788b70"),
    gallery: [tile("1503951914875-452162b0f3f1"), tile("1622286342621-4bd786c2447c"), tile("1560066984-138dadb4c035")],
  },
  beauty: {
    gradient: "linear-gradient(145deg, #3a2530, #6b3f56)",
    hero: hero("1521590832167-7bcbfaa6381f"),
    gallery: [tile("1600948836101-f9ffda59d250"), tile("1559599101-f09722fb4948"), tile("1540555700478-4be289fbecef")],
  },
  perfume: {
    gradient: "linear-gradient(145deg, #2e2630, #5a4560)",
    hero: hero("1592945403244-b3fbafd7f539"),
    gallery: [tile("1541643600914-78b084683601"), tile("1523293182086-7651a899d37f"), tile("1615634260167-c8cdede054de")],
  },
  shop: {
    gradient: "linear-gradient(145deg, #1f2530, #3d4c66)",
    hero: hero("1441986300917-64674bd600d8"),
    gallery: [tile("1441984904996-e0b6ba687e04"), tile("1483985988355-763728e1935b"), tile("1445205170230-053b83016050")],
  },
  fitness: {
    gradient: "linear-gradient(145deg, #1c222b, #364152)",
    hero: hero("1534438327276-14e5300c3a48"),
    gallery: [tile("1571019613454-1cb2f99b2d8b"), tile("1534367610401-9f5ed68180aa"), tile("1517836357463-d25dfeac3438")],
  },
  dental: {
    gradient: "linear-gradient(145deg, #16303a, #2f6f86)",
    hero: hero("1629909613654-28e377c37b09"),
    gallery: [tile("1606811841689-23dfddce3e95"), tile("1588776814546-1ffcf47267a5"), tile("1598256989800-fe5f95da9787")],
  },
  construction: {
    gradient: "linear-gradient(145deg, #23262b, #4a4f57)",
    hero: hero("1541888946425-d81bb19240f5"),
    gallery: [tile("1504307651254-35680f356dfd"), tile("1503387762-592deb58ef4e"), tile("1487958449943-2429e8be8625")],
  },
  generic: {
    gradient: "linear-gradient(145deg, #26262c, #4a4a58)",
    hero: hero("1552566626-52f8b828add9"),
    gallery: [tile("1504674900247-0877df9cc836"), tile("1441984904996-e0b6ba687e04"), tile("1559925393-8be0ec4767c8")],
  },
} satisfies Record<string, ConceptImagery>;

// First match wins, so put specific niches (perfume, dental) before broad ones (shop, beauty).
const MATCHERS: Array<[keyof typeof SETS, string[]]> = [
  ["dental", ["стоматолог", "стоматолог", "зуб", "дент", "dental", "ортодонт", "denta"]],
  ["barbershop", ["барбер", "стрижк", "бород"]],
  ["perfume", ["парфюм", "аромат", "sillage", "духи"]],
  ["beauty", ["салон", "красот", "маникюр", "ногт", "бров", "ресниц", "космет", "spa", "спа", "визаж", "макияж", "lumi"]],
  ["coffee", ["кофе", "кофейн", "roast", "бариста"]],
  ["restaurant", ["ресторан", "кафе", "бар", "пицц", "суши", "кухн", "еда", "food", "north"]],
  ["fitness", ["фитнес", "зал", "спорт", "трен", "gym", "fitness", "йога", "pulse"]],
  ["construction", ["строит", "строительн", "ремонт", "монолит", "monolith", "прораб", "отделк", "construct"]],
  ["shop", ["магазин", "товар", "одежд", "бутик", "shop", "store", "маркет"]],
];

export function conceptImagesFor(businessType: string): ConceptImagery {
  const normalized = businessType.toLowerCase();
  for (const [key, keywords] of MATCHERS) {
    if (keywords.some((word) => normalized.includes(word))) return SETS[key];
  }
  return SETS.generic;
}
