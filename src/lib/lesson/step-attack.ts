import { CARDS } from "@/lib/cards";
import {
  canAttack,
  creatureFrom as c,
  newGame,
  type GameState,
} from "@/lib/rules/engine";
import type { Judged } from "./steps";

export const ATTACK = {
  title: "Attacking",
  headline: "Attack to bring their life to 0.",
  prompts: {
    pick: "Attack with every creature that can.",
    pickLighter: "Which one can attack?",
  },
  hints: [
    "Look for the moon icon.",
    "Read the Key below.",
    "These two can attack.",
  ],
  pins: [
    { id: "stormHawk", letter: "A", text: "Storm Hawk is new. It can't attack yet.", when: ["explain", "pick-hint"] as string[] },
  ],
  callouts: { stormHawk: "New this turn" },
  hintHighlight: ["emberPup", "mossGolem"],
  win: "5 damage! When you attack, they pick the blockers. When they attack, you do.",
  after: "Your attackers stay tapped until your next turn.",
} as const;

export const attackBoard = (): GameState =>
  newGame({
    active: "you",
    creatures: [
      c(CARDS.emberPup),
      c(CARDS.mossGolem),
      c(CARDS.stormHawk, { enteredThisTurn: true }),
    ],
  });

export const attackLighterBoard = (): GameState =>
  newGame({
    active: "you",
    creatures: [
      c(CARDS.emberPup),
      c(CARDS.stormHawk, { enteredThisTurn: true }),
    ],
  });

export function checkPick(state: GameState, id: string): Judged {
  const v = canAttack(state, id);
  return v.ok ? { ok: true, message: "" } : { ok: false, myth: v.myth, message: v.message };
}

export function checkAttackers(state: GameState, selected: string[]): Judged {
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
  return { ok: true, message: "" };
}
