"use client";

/**
 * What every lesson step shares, so each step file is only its own board and words:
 *
 * - `useStep`: the phase, feedback and screen-reader line, focus on the task when
 *   it changes, and the lesson actions (miss, hint, complete).
 * - `useCombat`: damage marks, deaths and life totals, animated exactly as the
 *   rules engine resolves a combat.
 * - `useDemo`: the Explain → Watch → Try loop, with Watch it / Try it buttons and
 *   the lighter board's way back to the full one.
 */
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

/** What every step screen gets from the lesson (see StepScreen). */
export type StepProps = {
  progress: StepProgress;
  /** True when one more miss switches on the lighter board (from the lesson reducer). */
  lighterNext: boolean;
  dispatch: Dispatch<LessonAction>;
  onNext: () => void;
  nextTitle: string | null;
  /** The lesson focuses this heading when the step opens. */
  headingRef: Ref<HTMLHeadingElement>;
};

/** Clock for the mistake log. Only called from event handlers, never during render. */
export const now = () => Date.now();

/** Time to read a caption. Not scaled by the motion setting: reading speed isn't motion. */
export const readPause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type Fate = "alive" | "dying" | "gone";

/** A check's answer, as the step files return it. */
type Wrong = { message: string; myth?: Myth };

export function useStep<P extends string>(
  step: StepId,
  { progress, lighterNext, dispatch }: StepProps,
  initial: P | (() => P),
  /** Phases that move focus to the headline when they start (a new task to read). */
  focusOn: readonly P[],
) {
  const fx = useBoardFx();
  const run = useRun();
  const [phase, setPhase] = useState<P>(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announce, setAnnounce] = useState("");
  const lighter = progress.lighter === "active";

  // Move focus to the headline whenever the task changes, so keyboard and
  // screen-reader users always land on "what to do next". Not on arrival: the
  // lesson focuses the step heading then.
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

  // A combat or pause can still be running when the learner leaves the step (a step tab,
  // Back). Once the screen is gone, its late results must not reach the lesson.
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  const send = (a: LessonAction) => here.current && dispatch(a);

  /** Logs a mistake. Returns true when it switches on the lighter board. */
  function miss(note: string, myth?: Myth, soft = false) {
    if (!here.current) return false;
    send({ type: "miss", step, myth, note, at: now(), soft });
    return !soft && lighterNext;
  }

  /** A miss plus its correction. Says so when it switches on the lighter board. */
  function wrong(note: string, v: Wrong) {
    const toLighter = miss(note, v.myth);
    setFeedback({ tone: "bad", text: toLighter ? `${v.message} Let's try a simpler board.` : v.message });
    return toLighter;
  }

  return {
    fx,
    run,
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

/** Damage marks, deaths and life totals, animated exactly as the engine resolves a combat. */
export function useCombat(fx: StepCore<string>["fx"], startLife: Lives = FULL_LIFE) {
  const [damage, setDamage] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [life, setLife] = useState<Lives>(startLife);

  function clear() {
    setDamage({});
    setFates({});
    setLife(startLife);
  }

  /**
   * One combat: clashes and unblocked hits at once, then deaths. Returns the new
   * state and its plain-text version for screen readers.
   */
  async function play(state: GameState, attackers: string[], blocks: Blocks, defender: PlayerId = "you") {
    const r = resolveCombat(state, attackers, blocks);
    // Every number shown comes from the engine's damage events, so the picture
    // matches the rules even when damage is split (double blocks, first strike).
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
/** Thrown inside a demo when a newer one starts or the learner moves on. */
const STOPPED = Symbol("demo stopped");
/** One beat of a demo: wait (a reading pause in ms, or an animation), then stop if it was cancelled. */
export type Beat = (wait: number | Promise<unknown>) => Promise<void>;

/**
 * The Explain → Watch → Try loop. `reset` puts the board back; `script` is the
 * demo, one `beat` per pause, and it's cancelled cleanly on Try it, Watch again
 * or leaving the step.
 */
export function useDemo<P extends string>(
  core: StepCore<P> & (DemoPhase extends P ? unknown : never),
  reset: () => void,
  script: (beat: Beat) => Promise<void>,
) {
  const [watched, setWatched] = useState(false);
  const to = (p: DemoPhase) => core.setPhase(p as P);

  async function watch() {
    const live = core.run.begin();
    const beat: Beat = async (wait) => {
      await (typeof wait === "number" ? readPause(wait) : wait);
      if (!live()) throw STOPPED;
    };
    reset();
    core.setFeedback(null);
    to("watch");
    try {
      await script(beat);
    } catch (e) {
      if (e === STOPPED) return;
      throw e;
    }
    // The result stays on the board until Try it or Watch again (both reset it).
    setWatched(true);
    to("explain");
  }

  function startTry() {
    core.run.cancel();
    reset();
    core.setFeedback(null);
    to("pick");
  }

  /** Passed the lighter board: back to the full one. */
  function backToFull() {
    core.clearLighter();
    reset();
    core.setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    to("pick");
  }

  const watching = core.phase === "watch";
  const explaining = core.phase === "explain" || watching;
  const label = watching ? "Watching…" : watched ? "Watch again" : "Watch it";
  // Before the first watch: Watch it leads. After it: Try it leads. Both lock while it plays.
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

/** Their creatures and yours, in board order. */
export function sides(board: GameState) {
  const all = Object.values(board.creatures);
  return { theirs: all.filter((c) => c.controller === "opp"), yours: all.filter((c) => c.controller === "you") };
}
