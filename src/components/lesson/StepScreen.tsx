"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { nextMissGoesLighter, nextStep, nextToDo, resumeStep, STEPS, stepHref, type StepId } from "@/lib/lesson/lesson";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { Secondary } from "./Coach";
import { StepAttack } from "./StepAttack";
import { StepBlock } from "./StepBlock";
import { StepFinal } from "./StepFinal";
import { StepFlying } from "./StepFlying";
import { StepHeal } from "./StepHeal";

/** Each step's screen. They all take the same props from the lesson. */
const BODIES: Partial<Record<StepId, typeof StepBlock>> = {
  attack: StepAttack,
  block: StepBlock,
  flying: StepFlying,
  heal: StepHeal,
  final: StepFinal,
};
import { StepNav } from "./StepNav";
import { useArrivalFocus } from "./useArrivalFocus";

/**
 * One lesson step at its own URL. Guards the address: a locked step (typed in
 * or shared) sends you to where you actually are, never past the lock.
 */
export function StepScreen({ step }: { step: StepId }) {
  // The page transition wrapper lives in the root layout (one for the whole app).
  return (
    <div className="flex flex-col gap-6">
      <StepNav />
      <KnownStep key={step} step={step} />
    </div>
  );
}

function KnownStep({ step }: { step: StepId }) {
  const router = useRouter();
  const index = STEPS.findIndex((s) => s.id === step);


  const { lesson, ready } = useLesson();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();
  const progress = lesson.steps[step];
  const locked = progress.status === "locked";

  useEffect(() => {
    if (!ready) return;
    if (lesson.experience === null) router.replace("/");
    else if (locked) router.replace(stepHref(resumeStep(lesson)));
    else dispatch({ type: "open", step, at: Date.now() });
    // Only on arrival: later state changes inside the step must not re-route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, step]);

  // Before the saved lesson is read, hold the space so nothing jumps.
  if (!ready || locked || lesson.experience === null) return <div aria-hidden className="min-h-[70vh]" />;

  // "Next" goes to the next step still to do (skipped steps are passed over).
  const after = nextToDo(lesson, step) ?? nextStep(step);
  // After the last step: the report card (with a one-tap check-in).
  const nextTitle = after ? STEPS.find((s) => s.id === after)!.title : "Your report card";
  const goNext = () => router.push(after ? stepHref(after) : "/report", { transitionTypes: ["nav-forward"] });

  const props = {
    headingRef,
    progress,
    lighterNext: nextMissGoesLighter(lesson, step),
    dispatch,
    onNext: goNext,
    nextTitle,
  };
  const Body = BODIES[step];
  if (Body) return <Body {...props} />;

  return (
    <div className="border-[3px] border-ink bg-panel p-6">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-extrabold tracking-[-0.02em]">
        <span className="text-spot">{index + 1}.</span> {STEPS[index].title}
      </h1>
      <p className="mt-2 text-lg">This step gets built in the next review gate (G4).</p>
      <div className="mt-4">
        <Secondary onClick={() => router.push(stepHref("attack"), { transitionTypes: ["nav-back"] })}>Back to Step 1</Secondary>
      </div>
    </div>
  );
}
