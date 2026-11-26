// Rule numbers: Comprehensive Rules effective Nov 6, 2026.
import type { CardDef, Keyword } from "@/lib/cards";

export type PlayerId = "you" | "opp";

export type Creature = {
  id: string;
  name: string;
  power: number;
  toughness: number;
  keywords: Keyword[];
  controller: PlayerId;
  tapped: boolean;
  /** Summoning sick. 302.6 */
  enteredThisTurn: boolean;
  /** Toughness never changes. 120.6 */
  damage: number;
};

export type GameState = {
  turn: number;
  active: PlayerId;
  life: Record<PlayerId, number>;
  creatures: Record<string, Creature>;
  graveyard: string[];
};

/** blockerId -> attackerId. 509.1a */
export type Blocks = Record<string, string>;

export type Myth = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7" | "M8" | "M9";

export type Verdict =
  | { ok: true }
  | {
      ok: false;
      reason: "not-yours" | "tapped" | "new-this-turn" | "needs-flying-or-reach" | "not-attacking" | "not-defender";
      myth?: Myth;
      message: string;
    };

export type CombatEvent =
  | { type: "damage"; source: string; target: string; amount: number }
  | { type: "player-damage"; source: string; player: PlayerId; amount: number }
  | { type: "dies"; creature: string }
  | { type: "loses"; player: PlayerId };

export const other = (p: PlayerId): PlayerId => (p === "you" ? "opp" : "you");
export const has = (c: Creature, k: Keyword) => c.keywords.includes(k);

export function creatureFrom(
  def: CardDef,
  opts: { id?: string; controller?: PlayerId; tapped?: boolean; enteredThisTurn?: boolean; damage?: number } = {},
): Creature {
  return {
    id: opts.id ?? def.id,
    name: def.name,
    power: def.power,
    toughness: def.toughness,
    keywords: [...def.keywords],
    controller: opts.controller ?? def.side,
    tapped: opts.tapped ?? false,
    enteredThisTurn: opts.enteredThisTurn ?? false,
    damage: opts.damage ?? 0,
  };
}

export function newGame(opts: {
  active: PlayerId;
  creatures: Creature[];
  life?: Partial<Record<PlayerId, number>>;
}): GameState {
  return {
    turn: 1,
    active: opts.active,
    life: { you: 20, opp: 20, ...opts.life }, // 103.4
    creatures: Object.fromEntries(opts.creatures.map((c) => [c.id, c])),
    graveyard: [],
  };
}

function patch(state: GameState, id: string, change: Partial<Creature>): GameState {
  return { ...state, creatures: { ...state.creatures, [id]: { ...state.creatures[id], ...change } } };
}

function get(state: GameState, id: string): Creature {
  const c = state.creatures[id];
  if (!c) throw new Error(`No creature "${id}" on the battlefield`);
  return c;
}

/** 508.1a: untapped and controlled since the turn began. */
export function canAttack(state: GameState, id: string): Verdict {
  const c = get(state, id);
  if (c.controller !== state.active)
    return { ok: false, reason: "not-yours", message: "Only the player whose turn it is can attack." };
  if (c.tapped) return { ok: false, reason: "tapped", message: `${c.name} is tapped. Tapped creatures can't attack.` };
  if (c.enteredThisTurn)
    return {
      ok: false,
      reason: "new-this-turn",
      myth: "M1",
      message: `${c.name} is new this turn. New creatures can't attack until your next turn.`,
    };
  return { ok: true };
}

/** 509.1a: untapped creatures block (302.6 limits attacking only). 702.9b: flyers need flying/reach. */
export function canBlock(state: GameState, blockerId: string, attackerId: string): Verdict {
  const b = get(state, blockerId);
  const a = get(state, attackerId);
  if (b.controller === a.controller || b.controller === state.active)
    return { ok: false, reason: "not-defender", myth: "M2", message: "The defending player chooses blockers." };
  if (b.tapped)
    return {
      ok: false,
      reason: "tapped",
      myth: "M8",
      message: `${b.name} is still tapped from attacking. Tapped creatures can't block.`,
    };
  if (has(a, "flying") && !has(b, "flying") && !has(b, "reach"))
    return {
      ok: false,
      reason: "needs-flying-or-reach",
      myth: "M5",
      message: `${b.name} can't block a flyer. Only creatures with flying or reach can.`,
    };
  return { ok: true };
}

/** 508.1f: declaring attackers taps them. Throws on an illegal attack. */
export function declareAttackers(state: GameState, ids: string[]): GameState {
  let next = state;
  for (const id of ids) {
    const v = canAttack(next, id);
    if (!v.ok) throw new Error(v.message);
    next = patch(next, id, { tapped: true });
  }
  return next;
}

export function validateBlocks(state: GameState, attackers: string[], blocks: Blocks): Verdict {
  for (const [blockerId, attackerId] of Object.entries(blocks)) {
    if (!attackers.includes(attackerId))
      return { ok: false, reason: "not-attacking", message: "You can only block creatures that are attacking." };
    const v = canBlock(state, blockerId, attackerId);
    if (!v.ok) return v;
  }
  return { ok: true };
}

/** 510: simultaneous (510.2); unblocked hit the player (510.1a), blocked hit blockers (510.1c). SBA: 704.5g, 704.5a. */
export function resolveCombat(
  state: GameState,
  attackers: string[],
  blocks: Blocks,
  split: Record<string, Record<string, number>> = {},
): { state: GameState; events: CombatEvent[] } {
  const v = validateBlocks(state, attackers, blocks);
  if (!v.ok) throw new Error(v.message);

  const defender = other(state.active);
  const events: CombatEvent[] = [];
  const dmg: Record<string, number> = {};
  let toPlayer = 0;

  for (const attackerId of attackers) {
    const a = get(state, attackerId);
    const blockers = Object.keys(blocks).filter((b) => blocks[b] === attackerId);

    if (a.power <= 0) continue; // 510.1a: 0 power assigns no combat damage

    if (blockers.length === 0) {
      toPlayer += a.power;
      events.push({ type: "player-damage", source: a.id, player: defender, amount: a.power });
      continue;
    }

    const plan = split[attackerId] ?? defaultSplit(state, a.power, blockers);
    const total = Object.values(plan).reduce((s, n) => s + n, 0);
    if (total !== a.power) throw new Error(`${a.name} must assign exactly ${a.power} damage`);
    for (const [b, amount] of Object.entries(plan)) {
      if (amount > 0) {
        dmg[b] = (dmg[b] ?? 0) + amount;
        events.push({ type: "damage", source: a.id, target: b, amount });
      }
    }

    for (const b of blockers) {
      const blocker = get(state, b);
      if (blocker.power > 0) {
        dmg[a.id] = (dmg[a.id] ?? 0) + blocker.power;
        events.push({ type: "damage", source: b, target: a.id, amount: blocker.power });
      }
    }
  }

  // All at once (510.2).
  let next: GameState = { ...state, life: { ...state.life, [defender]: state.life[defender] - toPlayer } };
  for (const [id, amount] of Object.entries(dmg)) next = patch(next, id, { damage: get(next, id).damage + amount });

  const sba = stateBasedActions(next);
  return { state: sba.state, events: [...events, ...sba.events] };
}

function defaultSplit(state: GameState, power: number, blockers: string[]): Record<string, number> {
  const plan: Record<string, number> = {};
  let left = power;
  blockers.forEach((b, i) => {
    const c = get(state, b);
    const lethal = Math.max(c.toughness - c.damage, 0);
    const amount = i === blockers.length - 1 ? left : Math.min(lethal, left);
    plan[b] = amount;
    left -= amount;
  });
  return plan;
}

/** 704.5f/g: lethal damage or 0 toughness kills a creature. 704.5a: 0 or less life loses. */
export function stateBasedActions(state: GameState): { state: GameState; events: CombatEvent[] } {
  const events: CombatEvent[] = [];
  const creatures = { ...state.creatures };
  const graveyard = [...state.graveyard];
  for (const c of Object.values(state.creatures)) {
    if (c.toughness <= 0 || c.damage >= c.toughness) {
      delete creatures[c.id];
      graveyard.push(c.id);
      events.push({ type: "dies", creature: c.id });
    }
  }
  for (const p of ["you", "opp"] as const) if (state.life[p] <= 0) events.push({ type: "loses", player: p });
  return { state: { ...state, creatures, graveyard }, events };
}

/** Cleanup removes damage (514.2); the new active player untaps only theirs (502.3). */
export function endTurn(state: GameState): GameState {
  const nextActive = other(state.active);
  const creatures = Object.fromEntries(
    Object.values(state.creatures).map((c) => [
      c.id,
      {
        ...c,
        damage: 0,
        tapped: c.controller === nextActive ? false : c.tapped,
        enteredThisTurn: c.controller === nextActive ? false : c.enteredThisTurn,
      },
    ]),
  );
  return { ...state, turn: state.turn + 1, active: nextActive, creatures };
}

export function describe(before: GameState, events: CombatEvent[]): string {
  const name = (id: string) => before.creatures[id]?.name ?? id;
  const who = (p: PlayerId) => (p === "you" ? "you" : "your opponent");
  const parts: string[] = [];
  for (const e of events) {
    if (e.type === "player-damage") parts.push(`${name(e.source)} hits ${who(e.player)} for ${e.amount}.`);
    if (e.type === "damage") parts.push(`${name(e.source)} deals ${e.amount} to ${name(e.target)}.`);
    if (e.type === "dies") parts.push(`${name(e.creature)} dies.`);
    if (e.type === "loses") parts.push(e.player === "you" ? "You lose." : "You win!");
  }
  return parts.join(" ") || "No damage was dealt.";
}
