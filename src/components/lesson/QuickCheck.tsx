"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, ViewTransition } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import { hasProgress, resumeStep, STEPS, stepHref, type StepId } from "@/lib/lesson/lesson";
import { QUICK } from "@/lib/lesson/steps";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../Card";
import { CheckIcon } from "../icons";
import { FeedbackBox, Primary, type Feedback } from "./Coach";
import { Choice } from "./StepFrame";
import { useArrivalFocus } from "./useArrivalFocus";

type Answer = { step: StepId; correct: boolean };

/** Clock for the mistake log. Only called from event handlers. */
const now = () => Date.now();

/**
 * "Played a bit": three quick questions, one at a time. Each right answer skips
 * that step (it stays reviewable). Wrong answers are logged by myth for the
 * report card. Marker's selective testing: don't re-teach what's known.
 */
export function QuickCheck() {
  const router = useRouter();
  const mode = useMotionMode();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const done = answers.length === QUICK.length && picked === null;
  const q = QUICK[Math.min(i, QUICK.length - 1)];

  const { lesson, ready } = useLesson();

  useEffect(() => {
    router.prefetch(stepHref("attack"));
  }, [router]);

  // Already past it (Back button, an old link): offer to carry on instead of retaking it.
  // Not a redirect, so Back from Step 1 isn't trapped. `submitted` hides it after our own Start.
  const [submitted, setSubmitted] = useState(false);
  const taken = ready && hasProgress(lesson) && !submitted;

  function answer(v: string) {
    if (picked !== null) return;
    const correct = v === q.answer;
    setPicked(v);
    setAnswers((a) => [...a, { step: q.step, correct }]);
    setFeedback(
      correct
        ? { tone: "good", text: `You know this. ${STEPS.find((s) => s.id === q.step)!.title} is skipped.` }
        : { tone: "bad", text: `${wrongLine(q.step)} We'll cover it.` },
    );
  }

  function next() {
    setPicked(null);
    setFeedback(null);
    setI((n) => n + 1);
  }

  const skipped = answers.filter((a) => a.correct).map((a) => a.step);
  const firstStep = STEPS.find((s) => !skipped.includes(s.id))!;

  function start() {
    setSubmitted(true);
    dispatch({
      type: "quick-check",
      at: now(),
      results: QUICK.map((qq) => ({
        step: qq.step,
        correct: skipped.includes(qq.step),
        myth: qq.myth,
        note: `Quick check: ${qq.question}`,
      })),
    });
    router.push(stepHref(firstStep.id), { transitionTypes: ["nav-forward"] });
  }

  const fade = mode === "off" ? {} : { initial: { opacity: 0, y: mode === "full" ? 10 : 0 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.35 } };

  return (
    <section
      aria-labelledby="qc-title"
      className="grid grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel [grid-template-areas:'task'_'board'_'act'] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'task_board'_'act_board']"
    >
      <ViewTransition name="task-band" share="morph" default="none">
        <div className="on-spot flex flex-col gap-3 bg-spot p-5 text-panel [grid-area:task] sm:p-6 lg:border-r-[3px] lg:border-ink">
          <h1 id="qc-title" ref={headingRef} tabIndex={-1} className="text-[clamp(2rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            Quick check
          </h1>
          <p className="text-lg text-panel/90">Get one right and skip that step.</p>
          <ol aria-label="Progress" className="flex gap-1.5">
            {QUICK.map((qq, n) => {
              const a = answers[n];
              return (
                <li key={qq.step} className={`h-1.5 flex-1 ${a ? (a.correct ? "bg-panel" : "bg-panel/50") : n === i && !done ? "bg-panel/80" : "bg-panel/25"}`}>
                  <span className="sr-only">
                    Question {n + 1}: {a ? (a.correct ? "right" : "missed") : "to do"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </ViewTransition>

      <div className="paper flex min-h-[20rem] flex-col items-center justify-center gap-4 border-y-[3px] border-ink p-6 [grid-area:board] lg:border-y-0">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key={i} {...fade} className="flex flex-col items-center gap-4">
              <p className="text-sm font-bold text-ink-soft">
                Question {i + 1} of {QUICK.length}
              </p>
              <QuickPicture n={i} />
            </motion.div>
          ) : (
            <motion.div key="summary" {...fade} className="flex max-w-md flex-col gap-3 text-center">
              <p className="text-2xl font-extrabold tracking-[-0.02em]">
                {skipped.length === 0 ? "We'll start at the beginning." : `You skip ${skipped.length} step${skipped.length > 1 ? "s" : ""}.`}
              </p>
              <ul className="flex flex-col gap-1 text-left">
                {STEPS.map((s) => (
                  <li key={s.id} className="flex items-center gap-2.5 text-base">
                    <span aria-hidden className={`grid size-6 place-items-center rounded-full border-2 text-xs font-bold ${skipped.includes(s.id) ? "border-ink bg-ink text-panel" : "border-ink"}`}>
                      {skipped.includes(s.id) ? <CheckIcon className="size-3.5" /> : STEPS.indexOf(s) + 1}
                    </span>
                    <span className={skipped.includes(s.id) ? "text-ink-soft line-through decoration-1" : ""}>{s.title}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-5 p-5 [grid-area:act] sm:p-6 lg:border-r-[3px] lg:border-ink">
        {taken ? (
          <>
            <h2 className="text-[clamp(1.4rem,2.8vw,1.75rem)] leading-[1.15] font-bold tracking-[-0.015em]">You&apos;ve done the quick check.</h2>
            <Primary onClick={() => router.push(stepHref(resumeStep(lesson)), { transitionTypes: ["nav-forward"] })} className="w-fit">
              Continue: {STEPS.find((s) => s.id === resumeStep(lesson))!.title}
            </Primary>
          </>
        ) : !done ? (
          <>
            <h2 className="text-[clamp(1.4rem,2.8vw,1.75rem)] leading-[1.15] font-bold tracking-[-0.015em]">{q.question}</h2>
            <Choice options={q.options.map((o) => ({ value: o, label: o }))} answered={picked} correct={q.answer} onAnswer={answer} />
            <FeedbackBox feedback={feedback} />
            {picked !== null && (
              <Primary onClick={next} className="w-fit">
                {i + 1 < QUICK.length ? "Next question" : "See your plan"}
              </Primary>
            )}
          </>
        ) : (
          <>
            <Primary onClick={start} className="w-fit">
              Start: {firstStep.title}
            </Primary>
            <p className="text-sm text-ink-soft">You can open a skipped step any time from the step tabs.</p>
          </>
        )}
      </div>
    </section>
  );
}

function wrongLine(step: StepId) {
  if (step === "attack") return "New creatures can't attack yet.";
  if (step === "block") return "The defender picks blockers: that's you.";
  return "Ground creatures can't block flyers.";
}

/** The picture for each question: the cards it's about. */
function QuickPicture({ n }: { n: number }) {
  const wrap = "[--card-w:clamp(130px,34vw,170px)]";
  if (n === 0)
    return (
      // Room above the card for the yellow "New this turn" tag (desktop).
      <div className={`${wrap} min-[901px]:pt-9`}>
        <Card card={CARDS.emberPup as CardDef} status="new" callout="New this turn" />
      </div>
    );
  if (n === 1)
    return (
      <div className={wrap}>
        <Card card={CARDS.thornBoar as CardDef} status="attacking" />
      </div>
    );
  return (
    <div className={`flex gap-4 ${wrap}`}>
      <Card card={CARDS.nightBat as CardDef} status="attacking" />
      <Card card={CARDS.mossGolem as CardDef} />
    </div>
  );
}
