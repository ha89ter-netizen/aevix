/**
 * Category-matched imagery for the generated website concept, so a coffee concept shows a
 * coffee shop, a dental concept shows a clinic, etc. Every photo ID below was loaded and
 * visually verified to depict the right business (contact-sheet check) and to be free of
 * competing brand names/logos (perfume product shots in particular are almost all branded —
 * skipped rather than risk a Chanel/Versace bottle turning up on a client's mock site). Each
 * frame also has a themed gradient behind it, so a failed image never leaves an empty block.
 *
 * Each category has a small pool of heroes/gallery photos rather than one fixed set, so two
 * generated concepts in the same niche don't look identical. The pick is seeded off the
 * business name, so refreshing the same concept keeps its photos, but a different business
 * gets a different combination.
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

type ConceptImagerySet = {
  gradient: string;
  heroes: string[];
  galleryPool: string[];
};

const SETS = {
  coffee: {
    gradient: "linear-gradient(145deg, #3a2a1e, #6b4a30)",
    heroes: ["1554118811-1e0d58224f24", "1495474472287-4d71bcdd2085"],
    galleryPool: [
      "1509042239860-f550ce710b93",
      "1511920170033-f8396924c348",
      "1445116572660-236099ec97a0",
      "1461023058943-07fcbe16d735",
      "1522992319-0365e5f11656",
    ],
  },
  restaurant: {
    gradient: "linear-gradient(145deg, #2a1f1a, #5a3d2e)",
    heroes: ["1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0"],
    galleryPool: [
      "1504674900247-0877df9cc836",
      "1552566626-52f8b828add9",
      "1470337458703-46ad1756a187",
      "1424847651672-bf20a4b0982b",
      "1550966871-3ed3cdb5ed0c",
    ],
  },
  barbershop: {
    gradient: "linear-gradient(145deg, #201d1b, #423a34)",
    heroes: ["1585747860715-2ba37e788b70", "1596728325488-58c87691e9af"],
    galleryPool: [
      "1503951914875-452162b0f3f1",
      "1622286342621-4bd786c2447c",
      "1560066984-138dadb4c035",
      "1599351431202-1e0f0137899a",
      "1621605815971-fbc98d665033",
    ],
  },
  beauty: {
    gradient: "linear-gradient(145deg, #3a2530, #6b3f56)",
    heroes: ["1521590832167-7bcbfaa6381f", "1487412947147-5cebf100ffc2"],
    galleryPool: [
      "1600948836101-f9ffda59d250",
      "1559599101-f09722fb4948",
      "1540555700478-4be289fbecef",
      "1512290923902-8a9f81dc236c",
      "1522337660859-02fbefca4702",
    ],
  },
  perfume: {
    gradient: "linear-gradient(145deg, #2e2630, #5a4560)",
    heroes: ["1592945403244-b3fbafd7f539"],
    galleryPool: ["1541643600914-78b084683601", "1523293182086-7651a899d37f", "1615634260167-c8cdede054de"],
  },
  shop: {
    gradient: "linear-gradient(145deg, #1f2530, #3d4c66)",
    heroes: ["1441986300917-64674bd600d8", "1567401893414-76b7b1e5a7a5"],
    galleryPool: [
      "1441984904996-e0b6ba687e04",
      "1483985988355-763728e1935b",
      "1445205170230-053b83016050",
      "1490481651871-ab68de25d43d",
    ],
  },
  fitness: {
    gradient: "linear-gradient(145deg, #1c222b, #364152)",
    heroes: ["1534438327276-14e5300c3a48", "1583454110551-21f2fa2afe61"],
    galleryPool: [
      "1571019613454-1cb2f99b2d8b",
      "1534367610401-9f5ed68180aa",
      "1517836357463-d25dfeac3438",
      "1540497077202-7c8a3999166f",
      "1541534741688-6078c6bfb5c5",
    ],
  },
  dental: {
    gradient: "linear-gradient(145deg, #16303a, #2f6f86)",
    heroes: ["1629909613654-28e377c37b09", "1609207825181-52d3214556dd"],
    galleryPool: [
      "1606811841689-23dfddce3e95",
      "1588776814546-1ffcf47267a5",
      "1598256989800-fe5f95da9787",
      "1600091438387-e5045a3f2a4f",
      "1588776814546-daab30f310ce",
    ],
  },
  construction: {
    gradient: "linear-gradient(145deg, #23262b, #4a4f57)",
    heroes: ["1541888946425-d81bb19240f5", "1541976590-713941681591"],
    galleryPool: ["1504307651254-35680f356dfd", "1503387762-592deb58ef4e", "1487958449943-2429e8be8625", "1581092160562-40aa08e78837"],
  },
  auto: {
    gradient: "linear-gradient(145deg, #1c1f24, #3a4048)",
    heroes: ["1487754180451-c456f719a1fc"],
    galleryPool: ["1486262715619-67b85e0b08d3", "1530046339160-ce3e530c7d2f", "1625047509168-a7026f36de04"],
  },
  generic: {
    gradient: "linear-gradient(145deg, #26262c, #4a4a58)",
    heroes: ["1552566626-52f8b828add9", "1497366216548-37526070297c"],
    galleryPool: [
      "1504674900247-0877df9cc836",
      "1441984904996-e0b6ba687e04",
      "1559925393-8be0ec4767c8",
      "1552664730-d307ca884978",
      "1522071820081-009f0129c71c",
    ],
  },
} satisfies Record<string, ConceptImagerySet>;

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
  ["auto", ["сто", "автосервис", "автосалон", "шином", "детейлинг", "ремонт авто", "ремонт машин", "auto", "car service"]],
  ["shop", ["магазин", "товар", "одежд", "бутик", "shop", "store", "маркет"]],
];

// Small, dependency-free string hash — just needs to spread similar business names apart, not
// resist collisions the way a real hash would.
function seedFrom(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function conceptImagesFor(businessType: string, seed?: string): ConceptImagery {
  const normalized = businessType.toLowerCase();
  const match = MATCHERS.find(([, keywords]) => keywords.some((word) => normalized.includes(word)));
  const set = SETS[match?.[0] ?? "generic"];

  const n = seedFrom(seed?.trim() || businessType);
  const heroImage = set.heroes[n % set.heroes.length];

  const poolSize = set.galleryPool.length;
  const start = n % poolSize;
  const gallery = [0, 1, 2].map((offset) => set.galleryPool[(start + offset) % poolSize]) as [string, string, string];

  return {
    gradient: set.gradient,
    hero: hero(heroImage),
    gallery: [tile(gallery[0]), tile(gallery[1]), tile(gallery[2])],
  };
}
