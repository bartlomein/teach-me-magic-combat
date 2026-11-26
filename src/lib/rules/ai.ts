import { canAttack, canBlock, has, other, resolveCombat, type Blocks, type GameState } from "./engine";

/** Least damage to the player first, then fewest losses, then most kills. */
export function aiChooseBlocks(s: GameState, attackers: string[]): Blocks {
  const defender = other(s.active);
  const blockers = Object.values(s.creatures).filter((x) => x.controller === defender && !x.tapped);
  let options: Blocks[] = [{}];
  for (const b of blockers) {
    const next: Blocks[] = [];
    for (const o of options) {
      next.push(o); // b doesn't block
      for (const a of attackers) if (canBlock(s, b.id, a).ok) next.push({ ...o, [b.id]: a });
    }
    options = next;
  }
  const score = (blocks: Blocks) => {
    const r = resolveCombat(s, attackers, blocks).state;
    const theirLoss = blockers.filter((x) => !r.creatures[x.id]).length;
    const killed = attackers.filter((x) => !r.creatures[x]).length;
    return [s.life[defender] - r.life[defender], theirLoss, -killed];
  };
  let best = options[0];
  let bestScore = score(best);
  for (const o of options.slice(1)) {
    const sc = score(o);
    if (sc[0] < bestScore[0] || (sc[0] === bestScore[0] && (sc[1] < bestScore[1] || (sc[1] === bestScore[1] && sc[2] < bestScore[2])))) {
      best = o;
      bestScore = sc;
    }
  }
  return best;
}

export function aiChooseAttackers(state: GameState): string[] {
  return Object.values(state.creatures)
    .filter((c) => c.controller === state.active && canAttack(state, c.id).ok && !has(c, "reach"))
    .map((c) => c.id);
}
