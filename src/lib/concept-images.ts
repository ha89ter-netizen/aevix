import { businessKnowledgeFor } from "./business-knowledge";
import { conceptSeed } from "./website-concept";

/**
 * Category-matched imagery for the generated website concept, so a coffee concept shows a
 * coffee shop, a hotel concept shows a lobby, etc. Every photo ID below was loaded and
 * visually verified to depict the right business (contact-sheet check) and to be free of
 * competing brand names/logos (perfume product shots in particular are almost all branded —
 * skipped rather than risk a Chanel/Versace bottle turning up on a client's mock site). Each
 * frame also has a themed gradient behind it, so a failed image never leaves an empty block.
 *
 * Photos are organised by ROLE — interior (the space), product (what is sold / the result),
 * people (team and process) — so different page sections can show different kinds of imagery:
 * the About page gets the space and the people, the gallery mixes all three, the hero shows
 * the strongest establishing shot. Picks are seeded off the business name, so refreshing the
 * same concept keeps its photos while a different business in the same niche gets a
 * different combination.
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
  /** Hero shots for inner pages (menu/about/contacts), so every page opens on a different
   * photo instead of repeating the home hero. */
  pageHeroes: string[];
  /** Six role-diverse tiles for the gallery. */
  gallery: string[];
  /** [the space, the people/process] — the About page pair. */
  about: [string, string];
};

type ConceptImagerySet = {
  gradient: string;
  heroes: string[];
  interior: string[];
  product: string[];
  people: string[];
};

const SETS: Record<string, ConceptImagerySet> = {
  coffee: {
    gradient: "linear-gradient(145deg, #3a2a1e, #6b4a30)",
    heroes: ["1554118811-1e0d58224f24", "1495474472287-4d71bcdd2085"],
    interior: ["1445116572660-236099ec97a0", "1522992319-0365e5f11656"],
    product: ["1509042239860-f550ce710b93", "1511920170033-f8396924c348", "1461023058943-07fcbe16d735"],
    people: ["1507915135761-41a0a222c709", "1619860703338-9c70a1af6a63", "1508766917616-d22f3f1eea14", "1464979681340-bdd28a61699e"],
  },
  restaurant: {
    gradient: "linear-gradient(145deg, #2a1f1a, #5a3d2e)",
    heroes: ["1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0"],
    interior: ["1552566626-52f8b828add9", "1424847651672-bf20a4b0982b"],
    product: ["1504674900247-0877df9cc836", "1470337458703-46ad1756a187", "1550966871-3ed3cdb5ed0c"],
    people: ["1622021142947-da7dedc7c39a", "1640583342012-4622f31b650d", "1577106263724-2c8e03bfe9cf", "1564844536308-50b114a1d946"],
  },
  barbershop: {
    gradient: "linear-gradient(145deg, #201d1b, #423a34)",
    heroes: ["1585747860715-2ba37e788b70", "1596728325488-58c87691e9af"],
    interior: ["1503951914875-452162b0f3f1", "1560066984-138dadb4c035"],
    product: ["1622286342621-4bd786c2447c", "1599351431202-1e0f0137899a", "1621605815971-fbc98d665033"],
    people: ["1532710093739-9470acff878f", "1705976062088-5433328c2dcd"],
  },
  beauty: {
    gradient: "linear-gradient(145deg, #3a2530, #6b3f56)",
    heroes: ["1521590832167-7bcbfaa6381f", "1487412947147-5cebf100ffc2"],
    interior: ["1600948836101-f9ffda59d250", "1540555700478-4be289fbecef"],
    product: ["1559599101-f09722fb4948", "1512290923902-8a9f81dc236c", "1522337660859-02fbefca4702"],
    people: ["1632345031435-8727f6897d53", "1659391542239-9648f307c0b1", "1580618672591-eb180b1a973f", "1562322140-8baeececf3df"],
  },
  dental: {
    gradient: "linear-gradient(145deg, #16303a, #2f6f86)",
    heroes: ["1629909613654-28e377c37b09", "1609207825181-52d3214556dd"],
    interior: ["1598256989800-fe5f95da9787", "1600091438387-e5045a3f2a4f"],
    product: ["1606811841689-23dfddce3e95", "1588776814546-1ffcf47267a5"],
    people: ["1588776814546-daab30f310ce"],
  },
  fitness: {
    gradient: "linear-gradient(145deg, #1c222b, #364152)",
    heroes: ["1534438327276-14e5300c3a48", "1583454110551-21f2fa2afe61"],
    interior: ["1571019613454-1cb2f99b2d8b", "1540497077202-7c8a3999166f"],
    product: ["1517836357463-d25dfeac3438", "1541534741688-6078c6bfb5c5"],
    people: ["1534367610401-9f5ed68180aa", "1758875570137-8691b7c55033"],
  },
  hotel: {
    gradient: "linear-gradient(145deg, #1e2430, #3e4d66)",
    heroes: ["1677129667171-92abd8740fa3", "1664174728312-47aad71055c5"],
    interior: [
      "1758193783649-13371d7fb8dd",
      "1742844552700-3926862c5311",
      "1618773928121-c32242e63f39",
      "1630660664869-c9d3cc676880",
      "1675409145919-277c0fc2aa7d",
      "1664227430717-9a62112984cf",
      "1784007686796-bcaaf1044000",
      "1776812007501-0db22334460e",
    ],
    product: ["1722477936580-84aa10762b0b", "1535567465397-7523840f2ae9", "1540304453527-62f979142a17"],
    people: [],
  },
  flowers: {
    gradient: "linear-gradient(145deg, #2c3326, #5c6b45)",
    heroes: ["1639696194673-67b86204b885", "1531058240690-006c446962d8"],
    interior: ["1589244159943-460088ed5c92", "1619707046314-e76ae25d5ab3"],
    product: ["1626976109816-08cef8600d7d", "1579664872746-55e2a805d705", "1681422492256-68a8f77e6104"],
    people: ["1782038522371-a9c8455d6c3b", "1782038522723-f3ab645f9ae3"],
  },
  perfume: {
    gradient: "linear-gradient(145deg, #2e2630, #5a4560)",
    heroes: ["1592945403244-b3fbafd7f539", "1622704776938-bed6cd156e04"],
    interior: ["1659450013573-b2d6b39f916a", "1758225502621-9102d2856dc8"],
    product: ["1541643600914-78b084683601", "1523293182086-7651a899d37f", "1615634260167-c8cdede054de"],
    people: [],
  },
  auto: {
    gradient: "linear-gradient(145deg, #1c1f24, #3a4048)",
    heroes: ["1487754180451-c456f719a1fc", "1504222490345-c075b6008014"],
    interior: ["1570129476815-ba368ac77013", "1530046339160-ce3e530c7d2f"],
    product: ["1486262715619-67b85e0b08d3", "1625047509168-a7026f36de04"],
    people: ["1599256872237-5dcc0fbe9668"],
  },
  realestate: {
    gradient: "linear-gradient(145deg, #232830, #46536b)",
    heroes: ["1724582586529-62622e50c0b3", "1665249934445-1de680641f50"],
    interior: ["1688646953306-5ec93eab8c06", "1722605090433-41d1183a792d", "1668026694348-b73c5eb5e299"],
    product: ["1591474200742-8e512e6f98f8", "1624204386084-dd8c05e32226"],
    people: ["1722487631997-cf1e0f92c2c4"],
  },
  shop: {
    gradient: "linear-gradient(145deg, #1f2530, #3d4c66)",
    heroes: ["1441986300917-64674bd600d8", "1567401893414-76b7b1e5a7a5"],
    interior: ["1441984904996-e0b6ba687e04", "1490481651871-ab68de25d43d"],
    product: ["1483985988355-763728e1935b", "1445205170230-053b83016050"],
    people: ["1525562723836-dca67a71d5f1", "1520006403909-838d6b92c22e"],
  },
  construction: {
    gradient: "linear-gradient(145deg, #23262b, #4a4f57)",
    heroes: ["1541888946425-d81bb19240f5", "1541976590-713941681591"],
    interior: ["1504307651254-35680f356dfd", "1487958449943-2429e8be8625"],
    product: ["1503387762-592deb58ef4e", "1581092160562-40aa08e78837"],
    people: [],
  },
  generic: {
    gradient: "linear-gradient(145deg, #26262c, #4a4a58)",
    heroes: ["1497366216548-37526070297c", "1552664730-d307ca884978"],
    interior: ["1497366216548-37526070297c", "1559925393-8be0ec4767c8"],
    product: ["1504674900247-0877df9cc836", "1441984904996-e0b6ba687e04"],
    people: ["1522071820081-009f0129c71c", "1552664730-d307ca884978"],
  },
};

/**
 * Round-robin picker across the role pools with a seeded start offset per pool and a global
 * "used" set, so a single concept never repeats the same photo across hero/gallery/about, and
 * two same-niche businesses start from different offsets and get different combinations.
 */
function pickImages(set: ConceptImagerySet, seed: number, count: number, roles: Array<keyof Pick<ConceptImagerySet, "interior" | "product" | "people">>, used: Set<string>): string[] {
  const picked: string[] = [];
  const offsets: Record<string, number> = {};
  let attempts = 0;
  while (picked.length < count && attempts < count * 6) {
    const role = roles[(picked.length + attempts) % roles.length];
    const pool = set[role].length ? set[role] : [...set.interior, ...set.product, ...set.people];
    if (!pool.length) break;
    offsets[role] = offsets[role] ?? seed % pool.length;
    const id = pool[offsets[role] % pool.length];
    offsets[role] += 1;
    attempts += 1;
    if (used.has(id)) continue;
    used.add(id);
    picked.push(id);
  }
  return picked;
}

export function conceptImagesFor(businessType: string, seed?: string): ConceptImagery {
  const knowledge = businessKnowledgeFor(businessType, seed ?? "");
  const set = SETS[knowledge.id] ?? SETS.generic;

  const n = conceptSeed(seed?.trim() || businessType);
  const used = new Set<string>();

  const heroId = set.heroes[n % set.heroes.length];
  used.add(heroId);

  const gallery = pickImages(set, n, 6, ["interior", "product", "people"], used);
  const about = pickImages(set, n + 7, 2, ["interior", "people"], used);
  // Tiny pools can run dry after the gallery — reuse gallery frames for About rather than
  // render an empty figure.
  while (about.length < 2) about.push(gallery[about.length] ?? heroId);

  // Inner pages open on their own photo: the unused curated hero first, then whatever the
  // pools still have. Small pools fall back to reusing gallery shots (at hero size) before
  // ever repeating the home hero itself.
  const pageHeroes = [
    ...set.heroes.filter((id) => !used.has(id)),
    ...pickImages(set, n + 13, 2, ["product", "interior", "people"], used),
  ];
  while (pageHeroes.length < 3) pageHeroes.push(gallery[pageHeroes.length % Math.max(1, gallery.length)] ?? heroId);

  return {
    gradient: set.gradient,
    hero: hero(heroId),
    pageHeroes: pageHeroes.slice(0, 3).map(hero),
    gallery: gallery.map(tile),
    about: [tile(about[0]), tile(about[1])],
  };
}
