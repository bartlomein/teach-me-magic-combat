"use client";

import { motion } from "motion/react";
import { ViewTransition, type ReactNode, type Ref } from "react";
import { CheckIcon, CrossIcon } from "../icons";
import { FeedbackBox, Primary, Speak, type Feedback } from "./Coach";

/** The headline of a finished step, unless the step has its own (the final challenge: "You win!"). */
const STEP_COMPLETE = "Step complete";

/**
 * The frame every lesson step shares: one ink-ruled panel with the blue task
 * band (step number, one sentence, read-aloud), the board as a diagram, and the
 * actions + feedback + Key. Desktop: band and actions on the left, board right.
 * Phone: band, board, then actions right under the board.
 *
 * The frame also owns the finished state (`done`), so it is the same in every
 * step: the headline, one primary button ("Next: <next step>") and the feedback
 * right under it. No how-to line, no second button, no hints or Key.
 */
export function StepFrame({
  n,
  title,
  headingRef,
  headline,
  headlineRef,
  speak,
  howTo,
  bandActions,
  board,
  actions,
  feedback,
  below,
  announce,
  done = false,
  doneHeadline = STEP_COMPLETE,
  onNext,
  nextTitle,
}: {
  n: number;
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
  /** The one sentence: the rule while explaining, the task while trying. */
  headline: ReactNode;
  /** Focused when the task changes, so keyboard and screen-reader users land on it. */
  headlineRef?: Ref<HTMLHeadingElement>;
  speak: string;
  /** One short how-to line under the headline (optional). */
  howTo?: ReactNode;
  /** Buttons inside the blue band (Watch it / Try it). */
  bandActions?: ReactNode;
  board: ReactNode;
  /** Main buttons under the board / in the left column. */
  actions?: ReactNode;
  /** The latest feedback. Always mounted, right under the buttons, in every step and phase. */
  feedback: Feedback | null;
  /** Hint text and the Key, under the feedback. */
  below?: ReactNode;
  /** Text twin of the latest animation, for screen readers. */
  announce?: string;
  /** The step is passed: show the finished state instead of the task. */
  done?: boolean;
  /** Finished-state headline, when it isn't "Step complete". */
  doneHeadline?: string;
  /** Finished state: where "Next" goes, and the name of what comes next. */
  onNext: () => void;
  nextTitle: string | null;
}) {
  return (
    <section
      aria-labelledby="step-title"
      className="grid grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel [grid-template-areas:'task'_'board'_'act'] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'task_board'_'act_board']"
    >
      <ViewTransition name="task-band" share="morph" default="none">
        <div className="on-spot flex flex-col gap-4 bg-spot p-5 text-panel [grid-area:task] sm:p-6 lg:border-r-[3px] lg:border-ink">
          <div className="flex items-start justify-between gap-4">
            <h1 id="step-title" ref={headingRef} tabIndex={-1} className="leading-none">
              <span aria-hidden className="text-[2.5rem] font-extrabold tracking-[-0.04em]">
                {n}
              </span>
              <span className="sr-only">
                Step {n}: {title}
              </span>
            </h1>
            <Speak text={done ? doneHeadline : speak} onSpot />
          </div>
          <h2
            ref={headlineRef}
            tabIndex={-1}
            className="text-[clamp(1.5rem,3vw,1.875rem)] leading-[1.15] font-bold tracking-[-0.015em]"
          >
            {done ? doneHeadline : headline}
          </h2>
          {!done && howTo && <p className="text-base text-panel/90">{howTo}</p>}
          {!done && bandActions && <div className="flex flex-wrap gap-3">{bandActions}</div>}
        </div>
      </ViewTransition>

      <div className="[grid-area:board]">{board}</div>

      <div className="flex flex-col gap-5 p-5 [grid-area:act] sm:p-6 lg:border-r-[3px] lg:border-ink">
        {done ? (
          // Finished: the one thing to do next.
          nextTitle && (
            <div className="flex flex-wrap gap-3">
              <Primary onClick={onNext}>Next: {nextTitle}</Primary>
            </div>
          )
        ) : (
          actions && <div className="flex flex-wrap gap-3">{actions}</div>
        )}
        <FeedbackBox feedback={feedback} />
        {!done && below}
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}

/**
 * A quick either/or question (Me / Them, Yes / No). After an answer the right
 * option is marked with a check and a wrong pick with a cross, both in words.
 */
export function Choice<T extends string>({
  options,
  answered,
  correct,
  onAnswer,
}: {
  options: readonly { value: T; label: string }[];
  /** The option the learner picked, once answered. */
  answered: T | null;
  correct: T;
  onAnswer: (v: T) => void;
}) {
  return (
    <div role="group" className="flex flex-wrap gap-3">
      {options.map((o) => {
        const picked = answered === o.value;
        const isRight = o.value === correct;
        const state = answered === null ? "idle" : isRight ? "right" : picked ? "wrong" : "idle";
        return (
          <motion.button
            key={o.value}
            type="button"
            onClick={() => onAnswer(o.value)}
            aria-pressed={picked}
            disabled={answered !== null && answered === correct}
            animate={state === "wrong" ? { x: [0, -6, 5, -3, 0] } : undefined}
            transition={{ duration: 0.35 }}
            className={`inline-flex min-h-12 items-center gap-2 border-2 px-5 font-bold transition-colors ${
              state === "right"
                ? "border-ok bg-ok text-panel"
                : state === "wrong"
                  ? "border-miss bg-miss-tint text-miss"
                  : "border-ink bg-panel text-ink enabled:hover:bg-spot-tint"
            }`}
          >
            {state === "right" && <CheckIcon className="size-4" />}
            {state === "wrong" && <CrossIcon className="size-4" />}
            {o.label}
            {state === "right" && <span className="sr-only">(correct)</span>}
            {state === "wrong" && <span className="sr-only">(not quite)</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
