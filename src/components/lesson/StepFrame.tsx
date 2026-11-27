"use client";

import { motion } from "motion/react";
import { ViewTransition, type ReactNode, type Ref } from "react";
import { CheckIcon, CrossIcon } from "../icons";
import { FeedbackBox, Primary, Speak, type Feedback } from "./Coach";

const STEP_COMPLETE = "Step complete";

export function StepFrame({
  n,
  title,
  headingRef,
  headline,
  headlineRef,
  speak,
  howTo,
  bandActions,
  asking = false,
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
  headline: ReactNode;
  headlineRef?: Ref<HTMLHeadingElement>;
  speak: string;
  howTo?: ReactNode;
  bandActions?: ReactNode;
  /** A question is open: answers and feedback sit under it in the band. */
  asking?: boolean;
  board: ReactNode;
  actions?: ReactNode;
  feedback: Feedback | null;
  below?: ReactNode;
  announce?: string;
  done?: boolean;
  doneHeadline?: string;
  onNext: () => void;
  nextTitle: string | null;
}) {
  const inBand = asking && !done;
  return (
    <section
      aria-labelledby="step-title"
      className="grid grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel [grid-template-areas:'task'_'board'_'act'] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'task_board'_'act_board']"
    >
      <ViewTransition name="task-band" share="morph" default="none">
        <div className="on-spot grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 bg-spot px-5 py-4 text-panel sm:gap-y-4 [grid-area:task] sm:p-6 lg:border-r-[3px] lg:border-ink">
          <div className="contents">
            <h1 id="step-title" ref={headingRef} tabIndex={-1} className="col-start-1 row-start-1 leading-none">
              <span aria-hidden className="text-[1.625rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">
                {n}
              </span>
              <span className="sr-only">
                Step {n}: {title}
              </span>
            </h1>
            <div className="col-start-3 row-start-1">
              <Speak text={done ? doneHeadline : speak} onSpot />
            </div>
          </div>
          <h2
            ref={headlineRef}
            tabIndex={-1}
            className="col-start-2 row-start-1 text-[clamp(1.375rem,3vw,1.875rem)] leading-[1.15] sm:col-span-3 sm:col-start-1 sm:row-start-2 font-bold tracking-[-0.015em]"
          >
            {done ? doneHeadline : headline}
          </h2>
          {!done && howTo && <p className="col-span-3 text-base text-panel/90">{howTo}</p>}
          {!done && bandActions && <div className="col-span-3 flex flex-wrap gap-3">{bandActions}</div>}
          {inBand && (
            <div className="col-span-3 flex flex-col gap-3 text-ink">
              {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
              <FeedbackBox feedback={feedback} />
            </div>
          )}
        </div>
      </ViewTransition>

      <div className="[grid-area:board]">{board}</div>

      <div className="flex flex-col gap-3 px-5 py-4 [grid-area:act] sm:gap-5 sm:p-6 lg:border-r-[3px] lg:border-ink">
        {!done && !inBand && actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        {!inBand && <FeedbackBox feedback={feedback} />}
        {done && nextTitle && (
          <Primary onClick={onNext} data-step-next className="w-full justify-center sm:w-fit">
            Next: {nextTitle}
          </Primary>
        )}
        {!done && below}
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}

export function Choice<T extends string>({
  options,
  answered,
  correct,
  onAnswer,
}: {
  options: readonly { value: T; label: string }[];
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
