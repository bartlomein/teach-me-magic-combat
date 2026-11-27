import { useRef, useState, type Dispatch, type Ref } from "react";
import { hintsShown, type LessonAction, type StepId, type StepProgress } from "@/lib/lesson/lesson";
import type { Myth } from "@/lib/rules/engine";
import { useBoardFx } from "../../../board/Board";
import type { Feedback } from "../../Coach";
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
  const startPhase = useRef(phase);
  const [feedback, showFeedback] = useState<Feedback | null>(null);
  // Each message gets its own number so a repeated answer is announced again.
  const said = useRef(0);
  const setFeedback = (f: Feedback | null) => showFeedback(f && { ...f, n: ++said.current });
  const [announce, setAnnounce] = useState("");
  const lighter = progress.lighter === "active";

  // StepFrame moves attention to the headline whenever this changes.
  const focusKey = focusOn.includes(phase) ? `${phase}:${lighter}` : null;

  // A combat may still run after leaving the step; its late results must not reach the lesson.
  const send = (a: LessonAction) => run.mounted() && dispatch(a);

  function miss(note: string, myth?: Myth, soft = false) {
    if (!run.mounted()) return false;
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
      // A bug must never leave the learner stuck mid-step: say so and restart the step.
      console.error(e);
      setFeedback({ tone: "bad", text: "Something went wrong. Let's start this part again." });
      setPhase(startPhase.current);
      return false;
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
    hints: hintsShown(progress),
    focusKey,
    miss,
    wrong,
    hint: () => send({ type: "hint", step }),
    complete: () => send({ type: "complete", step, at: now() }),
    clearLighter: () => send({ type: "lighter-cleared", step }),
  };
}

export type StepCore<P extends string> = ReturnType<typeof useStep<P>>;
