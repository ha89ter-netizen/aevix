/**
 * Category-matched imagery for the generated website concept, so a coffee concept shows
 * coffee, a gym shows a gym, etc. Photo IDs are verified-loading Unsplash CDN images; each
 * frame also has a themed gradient behind it, so a failed image never leaves an empty block.
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
    hero: hero("1512690459411-b9245aed614b"),
    gallery: [tile("1495474472287-4d71bcdd2085"), tile("1511920170033-f8396924c348"), tile("1559925393-8be0ec4767c8")],
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
    hero: hero("1571875257727-256c39da42af"),
    gallery: [tile("1571875257727-256c39da42af"), tile("1483985988355-763728e1935b"), tile("1441984904996-e0b6ba687e04")],
  },
  shop: {
    gradient: "linear-gradient(145deg, #1f2530, #3d4c66)",
    hero: hero("1441986300917-64674bd600d8"),
    gallery: [tile("1441984904996-e0b6ba687e04"), tile("1483985988355-763728e1935b"), tile("1571875257727-256c39da42af")],
  },
  fitness: {
    gradient: "linear-gradient(145deg, #1c222b, #364152)",
    hero: hero("1534438327276-14e5300c3a48"),
    gallery: [tile("1571019613454-1cb2f99b2d8b"), tile("1534367610401-9f5ed68180aa"), tile("1534438327276-14e5300c3a48")],
  },
  generic: {
    gradient: "linear-gradient(145deg, #26262c, #4a4a58)",
    hero: hero("1552566626-52f8b828add9"),
    gallery: [tile("1504674900247-0877df9cc836"), tile("1441984904996-e0b6ba687e04"), tile("1559925393-8be0ec4767c8")],
  },
} satisfies Record<string, ConceptImagery>;

const MATCHERS: Array<[keyof typeof SETS, string[]]> = [
  ["barbershop", ["барбер", "стрижк", "бород"]],
  ["beauty", ["салон", "красот", "маникюр", "ногт", "бров", "ресниц", "космет", "spa", "спа", "визаж", "макияж"]],
  ["perfume", ["парфюм", "аромат"]],
  ["coffee", ["кофе", "кофейн"]],
  ["restaurant", ["ресторан", "кафе", "бар", "пицц", "суши", "кухн", "еда", "food"]],
  ["fitness", ["фитнес", "зал", "спорт", "трен", "gym", "fitness", "йога"]],
  ["shop", ["магазин", "товар", "одежд", "бутик", "shop", "store", "маркет"]],
];

export function conceptImagesFor(businessType: string): ConceptImagery {
  const normalized = businessType.toLowerCase();
  for (const [key, keywords] of MATCHERS) {
    if (keywords.some((word) => normalized.includes(word))) return SETS[key];
  }
  return SETS.generic;
}
