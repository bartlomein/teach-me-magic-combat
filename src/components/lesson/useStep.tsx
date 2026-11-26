"use client";

import { useEffect, useRef, useState, type Dispatch, type Ref } from "react";
import type { LessonAction, StepId, StepProgress } from "@/lib/lesson/lesson";
import {
  describe as describeCombat,
  resolveCombat,
  type Blocks,
  type GameState,
  type Myth,
  type PlayerId,
} from "@/lib/rules/engine";
import { useBoardFx } from "../board/Board";
import { OnSpot, type Feedback } from "./Coach";
import { useRun } from "./useRun";

export type StepProps = {
  progress: StepProgress;
  lighterNext: boolean;
  dispatch: Dispatch<LessonAction>;
  onNext: () => void;
  nextTitle: string | null;
  headingRef: Ref<HTMLHeadingElement>;
};

/** Only called from event handlers, never during render. */
export const now = () => Date.now();

/** Not scaled by the motion setting; tests speed it up via `reading.scale`. */
export const reading = { scale: 1 };
export const readPause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * reading.scale));

const STOPPED = Symbol("sequence stopped");
export type Beat = (wait: number | Promise<unknown>) => Promise<void>;

export type Fate = "alive" | "dying" | "gone";

type Wrong = { message: string; myth?: Myth };

export function useStep<P extends string>(
  step: StepId,
  { progress, lighterNext, dispatch }: StepProps,
  initial: P | (() => P),
  focusOn: readonly P[],
) {
  const fx = useBoardFx();
  const run = useRun();
  const [phase, setPhase] = useState<P>(initial);
  const [feedback, showFeedback] = useState<Feedback | null>(null);
  // Each message gets its own number so a repeated answer is announced again.
  const said = useRef(0);
  const setFeedback = (f: Feedback | null) => showFeedback(f && { ...f, n: ++said.current });
  const [announce, setAnnounce] = useState("");
  const lighter = progress.lighter === "active";

  // Not on arrival: the lesson focuses the step heading then.
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const arrived = useRef(false);
  const focusNow = focusOn.includes(phase);
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (focusNow) headlineRef.current?.focus();
  }, [phase, lighter, focusNow]);

  // A combat may still run after leaving the step; its late results must not reach the lesson.
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  const send = (a: LessonAction) => here.current && dispatch(a);

  function miss(note: string, myth?: Myth, soft = false) {
    if (!here.current) return false;
    send({ type: "miss", step, myth, note, at: now(), soft });
    return !soft && lighterNext;
  }

  function wrong(note: string, v: Wrong) {
    const toLighter = miss(note, v.myth);
    setFeedback({ tone: "bad", text: toLighter ? `${v.message} Let's try a simpler board.` : v.message });
    return toLighter;
  }

  async function sequence(script: (beat: Beat) => Promise<void>) {
    const live = run.begin();
    const beat: Beat = async (wait) => {
      await (typeof wait === "number" ? readPause(wait) : wait);
      if (!live()) throw STOPPED;
    };
    try {
      await script(beat);
      return true;
    } catch (e) {
      if (e === STOPPED) return false;
      throw e;
    }
  }

  return {
    fx,
    run,
    sequence,
    phase,
    setPhase,
    feedback,
    setFeedback,
    announce,
    setAnnounce,
    lighter,
    headlineRef,
    miss,
    wrong,
    hint: () => send({ type: "hint", step }),
    complete: () => send({ type: "complete", step, at: now() }),
    clearLighter: () => send({ type: "lighter-cleared", step }),
  };
}

export type StepCore<P extends string> = ReturnType<typeof useStep<P>>;

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

type DemoPhase = "explain" | "watch" | "pick";

export function useDemo<P extends string>(
  core: StepCore<P> & (DemoPhase extends P ? unknown : never),
  reset: () => void,
  script: (beat: Beat) => Promise<void>,
) {
  const [watched, setWatched] = useState(false);
  const to = (p: DemoPhase) => core.setPhase(p as P);

  async function watch() {
    reset();
    core.setFeedback(null);
    to("watch");
    if (!(await core.sequence(script))) return;
    setWatched(true);
    to("explain");
  }

  function startTry() {
    core.run.cancel();
    reset();
    core.setFeedback(null);
    to("pick");
  }

  function backToFull() {
    core.clearLighter();
    reset();
    core.setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    to("pick");
  }

  const watching = core.phase === "watch";
  const explaining = core.phase === "explain" || watching;
  const label = watching ? "Watching…" : watched ? "Watch again" : "Watch it";
  const bandActions = explaining ? (
    watched ? (
      <>
        <OnSpot primary onClick={startTry} disabled={watching}>
          Try it
        </OnSpot>
        <OnSpot onClick={watch} disabled={watching}>
          {label}
        </OnSpot>
      </>
    ) : (
      <>
        <OnSpot primary onClick={watch} disabled={watching}>
          {label}
        </OnSpot>
        <OnSpot onClick={startTry} disabled={watching}>
          Skip to try
        </OnSpot>
      </>
    )
  ) : undefined;

  return { watch, startTry, backToFull, explaining, bandActions };
}

export function sides(board: GameState) {
  const all = Object.values(board.creatures);
  return { theirs: all.filter((c) => c.controller === "opp"), yours: all.filter((c) => c.controller === "you") };
}
