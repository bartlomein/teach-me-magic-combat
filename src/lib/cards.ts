export type Keyword = "flying" | "reach";

/** Reminder text as printed on current cards (checked on Scryfall, Nov 2026). */
export const KEYWORDS: Record<Keyword, { label: string; reminder: string }> = {
  flying: { label: "Flying", reminder: "This creature can't be blocked except by creatures with flying or reach." },
  reach: { label: "Reach", reminder: "This creature can block creatures with flying." },
};

export type CardDef = {
  id: string;
  name: string;
  /** e.g. "Creature — Hawk" */
  type: string;
  power: number;
  toughness: number;
  keywords: Keyword[];
  side: "you" | "opp";
  /** One short italic line. Decorative; not read by screen readers. */
  /**
   * Art: painted layers when available (background + transparent creature that
   * breaks out of the frame); otherwise a glyph placeholder.
   */
  art: { glyph: string; from: string; to: string; layers?: { bg: string; fg: string } };
};

export const CARDS = {
  emberPup: {
    id: "emberPup",
    name: "Ember Pup",
    type: "Creature — Hound",
    power: 2,
    toughness: 1,
    keywords: [],
    side: "you",
    art: { glyph: "🐺", from: "#ff9a62", to: "#7a2f3b", layers: { bg: "/art/ember-pup-bg.png", fg: "/art/ember-pup-fg.png" } },
  },
  mossGolem: {
    id: "mossGolem",
    name: "Moss Golem",
    type: "Creature — Golem",
    power: 3,
    toughness: 4,
    keywords: [],
    side: "you",
    art: { glyph: "🗿", from: "#9ed39a", to: "#2f5a46", layers: { bg: "/art/moss-golem-bg.png", fg: "/art/moss-golem-fg.png" } },
  },
  stormHawk: {
    id: "stormHawk",
    name: "Storm Hawk",
    type: "Creature — Bird",
    power: 3,
    toughness: 2,
    keywords: ["flying"],
    side: "you",
    art: {
      glyph: "🦅",
      from: "#ffd36e",
      to: "#5a3f8f",
      layers: { bg: "/art/storm-hawk-bg-v3.png", fg: "/art/storm-hawk-fg-v2.png" },
    },
  },
  thornBoar: {
    id: "thornBoar",
    name: "Thorn Boar",
    type: "Creature — Boar",
    power: 3,
    toughness: 3,
    keywords: [],
    side: "opp",
    art: { glyph: "🐗", from: "#8fb7e8", to: "#26315e", layers: { bg: "/art/thorn-boar-bg.png", fg: "/art/thorn-boar-fg.png" } },
  },
  skyFinch: {
    id: "skyFinch",
    name: "Sky Finch",
    type: "Creature — Bird",
    power: 1,
    toughness: 1,
    keywords: ["flying"],
    side: "you",
    art: { glyph: "🐦", from: "#ffe9a8", to: "#4f6bb0", layers: { bg: "/art/sky-finch-bg.png", fg: "/art/sky-finch-fg.png" } },
  },
  vineArcher: {
    id: "vineArcher",
    name: "Vine Archer",
    type: "Creature — Elf Archer",
    power: 1,
    toughness: 3,
    keywords: ["reach"],
    side: "you",
    art: { glyph: "🏹", from: "#b9e3a0", to: "#2c4a3a", layers: { bg: "/art/vine-archer-bg.png", fg: "/art/vine-archer-fg.png" } },
  },
  nightBat: {
    id: "nightBat",
    name: "Night Bat",
    type: "Creature — Bat",
    power: 2,
    toughness: 1,
    keywords: ["flying"],
    side: "opp",
    art: { glyph: "🦇", from: "#a99be8", to: "#1d1a40", layers: { bg: "/art/night-bat-bg.png", fg: "/art/night-bat-fg.png" } },
  },
  cliffSpider: {
    id: "cliffSpider",
    name: "Cliff Spider",
    type: "Creature — Spider",
    power: 1,
    toughness: 3,
    keywords: ["reach"],
    side: "opp",
    art: { glyph: "🕷️", from: "#c2cbe0", to: "#26304f", layers: { bg: "/art/cliff-spider-bg.png", fg: "/art/cliff-spider-fg.png" } },
  },
} satisfies Record<string, CardDef>;

export type CardId = keyof typeof CARDS;

/** Screen-reader description, e.g. "power 3, toughness 2, flying". */
export function describeStats(card: CardDef) {
  const kw = card.keywords.length ? `, ${card.keywords.join(", ")}` : "";
  return `power ${card.power}, toughness ${card.toughness}${kw}`;
}
