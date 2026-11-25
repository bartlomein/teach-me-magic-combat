/**
 * Step 1, "Attacking": boards, words, and the answer checks.
 * The checks are pure and lean on the rules engine, so the lesson can never
 * call something legal that the rules say isn't.
 */
import { CARDS } from "@/lib/cards";
import {
  canAttack,
  creatureFrom as c,
  newGame,
  type GameState,
  type Myth,
} from "@/lib/rules/engine";

export const ATTACK = {
  title: "Attacking",
  headline: "Attack to bring their life to 0.",
  explain:
    "Attack to bring their life to 0.",
  prompts: {
    pick: "Attack with every creature that can.",
    pickLighter: "Which one can attack?",
  },
  hints: [
    "Look for the moon icon.",
    "Read the Key below.",
    "These two can attack.",
  ],
  /** Lettered pins printed on the board, explained in the Key. */
  pins: [
    { id: "stormHawk", letter: "A", text: "Storm Hawk is new. It can't attack yet.", when: ["explain", "pick-hint"] as string[] },
  ],
  /** Highlighter tags above cards (wide screens; they replace the in-card ribbon there). */
  callouts: { stormHawk: "New this turn" },
  /** Hint 3 lights these cards up on the board. */
  hintHighlight: ["emberPup", "mossGolem"],
  /** Attacks always go at the player here (no planeswalkers or battles in this lesson). */
  win: "5 damage! Attackers hit the player. Their creatures choose whether to block.",
} as const;

/** Full board: your turn. Storm Hawk arrived this turn. */
export const attackBoard = (): GameState =>
  newGame({
    active: "you",
    creatures: [
      c(CARDS.emberPup),
      c(CARDS.mossGolem),
      c(CARDS.stormHawk, { enteredThisTurn: true }),
    ],
  });

/** Lighter board: one creature that can attack, one that can't. */
export const attackLighterBoard = (): GameState =>
  newGame({
    active: "you",
    creatures: [
      c(CARDS.emberPup),
      c(CARDS.stormHawk, { enteredThisTurn: true }),
    ],
  });

export type Check = { ok: true } | { ok: false; myth?: Myth; message: string };

/** Tapping a card while choosing attackers. Illegal picks are explained right away. */
export function checkPick(state: GameState, id: string): Check {
  const v = canAttack(state, id);
  if (v.ok) return v;
  if (v.reason === "not-yours")
    return {
      ok: false,
      myth: "M1",
      message: "That's their creature. You attack with yours.",
    };
  return { ok: false, myth: v.myth, message: v.message };
}

/** Pressing "Attack". Every creature that can attack should be in. */
export function checkAttackers(state: GameState, selected: string[]): Check {
  for (const id of selected) {
    const v = checkPick(state, id);
    if (!v.ok) return v;
  }
  const yours = Object.values(state.creatures).filter(
    (x) => x.controller === state.active,
  );
  const missing = yours.find(
    (x) => canAttack(state, x.id).ok && !selected.includes(x.id),
  );
  if (missing)
    return {
      ok: false,
      message: `${missing.name} can attack too. It's been here since last turn.`,
    };
  return { ok: true };
}
