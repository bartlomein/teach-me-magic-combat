import { useState } from "react";
import { describe as describeCombat, resolveCombat, type Blocks, type GameState, type PlayerId } from "@/lib/rules/engine";
import type { StepCore } from "./useStep";

export type Fate = "alive" | "dying" | "gone";

type Lives = Record<PlayerId, number>;
const FULL_LIFE: Lives = { you: 20, opp: 20 };

export function useCombat(fx: StepCore<string>["fx"], startLife: Lives = FULL_LIFE) {
  const [damage, setDamage] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [life, setLife] = useState<Lives>(startLife);

  function clear() {
    setDamage({});
    setFates({});
    setLife(startLife);
  }

  async function play(state: GameState, attackers: string[], blocks: Blocks, defender: PlayerId = "you") {
    const r = resolveCombat(state, attackers, blocks);
    const dealt = (from: string, to: string) =>
      r.events.reduce((n, e) => (e.type === "damage" && e.source === from && e.target === to ? n + e.amount : n), 0);
    const fights = Object.entries(blocks).map(([blocker, attacker]) => ({
      attacker,
      blocker,
      toBlocker: dealt(attacker, blocker),
      toAttacker: dealt(blocker, attacker),
    }));
    const unblocked = r.events.flatMap((e) => (e.type === "player-damage" ? [{ id: e.source, amount: e.amount }] : []));
    const marks: Record<string, number> = {};
    for (const e of r.events) if (e.type === "damage") marks[e.target] = (marks[e.target] ?? 0) + e.amount;
    await Promise.all([
      fights.length ? fx.clash(fights, () => setDamage(marks)) : null,
      unblocked.length ? fx.hitPlayer(unblocked, defender, () => setLife({ ...r.state.life })) : null,
    ]);
    setLife({ ...r.state.life });
    const dead = r.state.graveyard.filter((id) => !state.graveyard.includes(id));
    if (dead.length) {
      const mark = (fate: Fate) => setFates((f) => ({ ...f, ...Object.fromEntries(dead.map((id) => [id, fate])) }));
      mark("dying");
      await fx.wait(fx.mode === "full" ? 900 : 600);
      mark("gone");
    }
    return { state: r.state, text: describeCombat(state, r.events) };
  }

  return { damage, fates, life, setLife, clear, play };
}

export function sides(board: GameState) {
  const all = Object.values(board.creatures);
  return { theirs: all.filter((c) => c.controller === "opp"), yours: all.filter((c) => c.controller === "you") };
}
