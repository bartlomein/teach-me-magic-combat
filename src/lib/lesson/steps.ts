import { cardName, CARDS } from "@/lib/cards";
import { aiChooseAttackers, aiChooseBlocks } from "@/lib/rules/ai";
import {
  creatureFrom as c,
  declareAttackers,
  endTurn,
  newGame,
  resolveCombat,
  type Blocks,
  type GameState,
  type Myth,
  validateBlocks,
} from "@/lib/rules/engine";

export type Judged = { ok: true; message: string } | { ok: false; myth?: Myth; message: string };

export const BLOCK = {
  ask: { question: "They're attacking. Who picks blockers?", myth: "M2" as Myth, wrong: "The defender always chooses. That's you." },
  headline: "When they attack, you pick blockers.",
  speak: "When they attack, you pick blockers. Both creatures deal damage at the same time.",
  watchCaption: "Pup dealt 2. Boar needed 3.",
  prompt: "Block so the Boar dies, and yours lives.",
  hints: ["Compare power to toughness.", "You need 3 damage to kill the Boar.", "This one can do it."],
  hintHighlight: ["mossGolem"],
  pins: [{ id: "mossGolem", letter: "A", text: "Moss Golem is new, but new creatures can still block." }],
  callouts: { mossGolem: "New this turn" },
  lighter: { question: "Does Moss Golem kill the Boar and live?" },
  win: "Golem dealt 3 and took only 3 of its 4.",
} as const;

export const blockBoard = (): GameState =>
  declareAttackers(
    newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.emberPup), c(CARDS.mossGolem, { enteredThisTurn: true })] }),
    ["thornBoar"],
  );

export const blockLighterBoard = (): GameState =>
  declareAttackers(newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.mossGolem)] }), ["thornBoar"]);

export function judgeBlock(blocker: string | null): Judged {
  const s = blockBoard();
  const r = resolveCombat(s, ["thornBoar"], blocker ? { [blocker]: "thornBoar" } : {});
  if (!blocker) return { ok: false, myth: "M3", message: "You'd take 3. Moss Golem can kill it and live." };
  const blockerDied = r.state.graveyard.includes(blocker);
  const boarDied = r.state.graveyard.includes("thornBoar");
  if (boarDied && !blockerDied) return { ok: true, message: BLOCK.win };
  return { ok: false, myth: "M4", message: "Pup deals 2. Boar has 3 toughness. Pup dies, Boar lives." };
}

export const FLYING = {
  headline: "Only flying or reach can block a flyer.",
  speak: "Flying creatures can only be blocked by flying or reach creatures. Flyers can still block anyone.",
  prompt: "Block both. Lose nothing.",
  howTo: "Tap your creature, then the attacker it blocks.",
  hints: ["Who can stop a flyer?", "Look for reach: see the Key.", "These two pairs work."],
  hintHighlight: ["vineArcher", "nightBat", "mossGolem", "thornBoar"],
  pins: [
    { id: "nightBat", letter: "A", text: "Night Bat has flying." },
    { id: "vineArcher", letter: "B", text: "Vine Archer has reach: it can block flyers." },
  ],
  followUp: { question: "Can Sky Finch block Thorn Boar?", myth: "M6" as Myth, wrong: "Yes, it can. Flying limits who blocks you, not who you block." },
  lighter: { prompt: "Who can block the Bat?" },
  win: "Archer stopped the Bat, Golem stopped the Boar. You lost nothing.",
} as const;

export const flyingBoard = (): GameState =>
  declareAttackers(
    newGame({
      active: "opp",
      creatures: [c(CARDS.nightBat), c(CARDS.thornBoar), c(CARDS.mossGolem), c(CARDS.vineArcher), c(CARDS.skyFinch)],
    }),
    ["nightBat", "thornBoar"],
  );

export const flyingLighterBoard = (): GameState =>
  declareAttackers(newGame({ active: "opp", creatures: [c(CARDS.nightBat), c(CARDS.mossGolem), c(CARDS.vineArcher)] }), ["nightBat"]);

/** One block, checked by the same rules combat enforces (so the UI can't build a block the engine rejects). */
export function checkAssign(state: GameState, attackers: string[], blocker: string, attacker: string): Judged {
  const v = validateBlocks(state, attackers, { [blocker]: attacker });
  return v.ok ? { ok: true, message: "" } : { ok: false, myth: v.myth, message: v.message };
}

export function judgeFlying(blocks: Blocks): Judged {
  const s = flyingBoard();
  const r = resolveCombat(s, ["nightBat", "thornBoar"], blocks);
  const lost = 20 - r.state.life.you;
  const yoursDied = r.state.graveyard.filter((id) => s.creatures[id].controller === "you");
  if (lost === 0 && yoursDied.length === 0) return { ok: true, message: FLYING.win };
  if (blocks.skyFinch === "nightBat") return { ok: false, myth: "M4", message: "That works, but Finch dies too. Vine Archer survives it." };
  if (blocks.skyFinch === "thornBoar") return { ok: false, myth: "M4", message: "Legal! Flyers can block ground creatures. But Finch dies." };
  if (lost > 0) return { ok: false, message: `You'd take ${lost}. Block both attackers.` };
  return { ok: false, myth: "M4", message: `${s.creatures[yoursDied[0]].name} dies. Pick a blocker that survives.` };
}

export const HEAL = {
  headline: "Damage lasts only this turn.",
  speak: "Damage lasts only this turn. At end of turn, every creature that survived heals fully.",
  q1: { question: "Next turn, does Golem still have damage?", myth: "M7" as Myth, wrong: "Damage heals at end of turn. Golem starts fresh with 4 toughness." },
  q2: { question: "Golem blocks another 3/3 next turn. Does it survive?", myth: "M7" as Myth, wrong: "It does: it's fully healed, so 3 damage is less than 4." },
  pins: [{ id: "mossGolem", letter: "A", text: "Moss Golem has 3 damage marked this turn." }],
  win: "Healed, Golem survives the next 3/3 too.",
} as const;

export const healBoard = (): GameState =>
  newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.mossGolem, { damage: 3 })] });

export const FINAL_LIFE = { you: 5, opp: 4 } as const;

export const FINAL = {
  headline: "Two turns. They attack, then you win.",
  speak: "Two turns. First they attack and you block. Then it's your turn: deal 4 damage to win.",
  howTo: "Block well. Then deal 4 damage on your turn.",
  promptBlock: "They attack. Choose your blockers.",
  promptAttack: "Your turn. Attack to win.",
  blockHints: ["Block so their creature dies and yours lives.", "Only flying or reach can block Night Bat.", "Archer blocks Bat. Golem blocks Boar."],
  blockHighlight: ["vineArcher", "mossGolem"],
  attackHints: ["Cliff Spider can block one attacker.", "They have 4 life. Spider will block your biggest attacker.", "Attack with all three."],
} as const;

export const finalBoard = (): GameState =>
  newGame({
    active: "opp",
    life: { ...FINAL_LIFE },
    creatures: [c(CARDS.stormHawk), c(CARDS.mossGolem), c(CARDS.vineArcher), c(CARDS.cliffSpider), c(CARDS.nightBat), c(CARDS.thornBoar)],
  });

export const finalTheirAttack = (): { state: GameState; attackers: string[] } => {
  const s = finalBoard();
  const attackers = aiChooseAttackers(s);
  return { state: declareAttackers(s, attackers), attackers };
};

function subsets<T>(xs: T[]): T[][] {
  return xs.reduce<T[][]>((acc, x) => acc.concat(acc.map((set) => [...set, x])), [[]]);
}

export const readyAttackers = (s: GameState) =>
  Object.values(s.creatures)
    .filter((x) => x.controller === s.active && !x.tapped && !x.enteredThisTurn)
    .map((x) => x.id);

export function judgeAttack(s: GameState, attack: string[]) {
  const blocks = aiChooseBlocks(s, attack);
  const end = resolveCombat(declareAttackers(s, attack), attack, blocks).state;
  return { win: end.life.opp <= 0, lifeLeft: end.life.opp, blocks };
}

export const canWinNow = (s: GameState) => subsets(readyAttackers(s)).some((set) => set.length > 0 && judgeAttack(s, set).win);

const list = (ids: string[]) => (ids.length <= 1 ? ids.map(cardName).join("") : `${ids.slice(0, -1).map(cardName).join(", ")} and ${cardName(ids[ids.length - 1])}`);

export type TheirTurnResult = {
  next: GameState;
  ok: boolean;
  myth?: Myth;
  message: string;
  blockedAndLived: string[];
};

export function judgeTheirTurn(declared: GameState, attackers: string[], blocks: Blocks): TheirTurnResult {
  const after = resolveCombat(declared, attackers, blocks).state;
  const yoursBefore = Object.values(declared.creatures).filter((x) => x.controller === "you").map((x) => x.id);
  const lost = yoursBefore.filter((id) => !after.creatures[id]);
  const blockedAndLived = Object.keys(blocks).filter((id) => after.creatures[id]);
  const next = endTurn(after);

  if (after.life.you <= 0)
    return { next, ok: false, message: "You took too much damage. Block so less gets through.", blockedAndLived };
  if (!canWinNow(next)) {
    let tip = "Block so their creature dies and yours lives.";
    if (blocks.stormHawk === "nightBat") tip = "Vine Archer could block Night Bat and live.";
    else if (blocks.vineArcher === "thornBoar" || blocks.stormHawk === "thornBoar") tip = "Moss Golem can block Thorn Boar and live.";
    const what = lost.length ? `You lost ${list(lost)}. ` : "";
    return { next, ok: false, myth: lost.length ? "M4" : undefined, message: `${what}Now you can't deal 4 this turn. ${tip}`, blockedAndLived };
  }
  const tappedTheirs = attackers.filter((id) => after.creatures[id]);
  const message =
    lost.length === 0 && tappedTheirs.length === 0
      ? "Great blocks. Both attackers died, and you lost nothing."
      : tappedTheirs.length
        ? `You took ${FINAL_LIFE.you - after.life.you}. ${list(tappedTheirs)} ${tappedTheirs.length > 1 ? "are" : "is"} still tapped, so ${tappedTheirs.length > 1 ? "they" : "it"} can't block you.`
        : `Good enough. You lost ${list(lost)}, but you can still win.`;
  return { next, ok: true, message, blockedAndLived };
}

export function missedWinMessage(s: GameState, attack: string[], lifeLeft: number, blocks: Blocks) {
  const blocked = Object.entries(blocks).map(([b, a]) => `${cardName(b)} blocked ${cardName(a)}.`).join(" ");
  const missing = readyAttackers(s).filter((id) => !attack.includes(id));
  const add = missing.length ? ` Attack with ${list(missing)} too.` : "";
  return `They're at ${lifeLeft}. ${blocked}${add}`.replace(/\s+/g, " ").trim();
}

export const QUICK = [
  { step: "attack", card: "emberPup", newThisTurn: true, question: "This creature was played this turn. Can it attack?", options: ["Yes", "No"], answer: "No", myth: "M1" as Myth },
  { step: "block", card: "thornBoar", attacking: true, question: "Thorn Boar attacks you. Who picks the blocker?", options: ["You", "Your opponent"], answer: "You", myth: "M2" as Myth },
  { step: "flying", card: "nightBat", question: "Can Moss Golem block Night Bat?", options: ["Yes", "No"], answer: "No", myth: "M5" as Myth },
] as const;
