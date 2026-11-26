"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { nextMissGoesLighter, nextStep, nextToDo, resumeStep, STEPS, stepHref, type StepId } from "@/lib/lesson/lesson";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { StepAttack } from "./StepAttack";
import { StepBlock } from "./StepBlock";
import { StepFinal } from "./StepFinal";
import { StepFlying } from "./StepFlying";
import { StepHeal } from "./StepHeal";
import { StepNav } from "./StepNav";
import { useArrivalFocus } from "./useArrivalFocus";

const BODIES: Record<StepId, typeof StepBlock> = {
  attack: StepAttack,
  block: StepBlock,
  flying: StepFlying,
  heal: StepHeal,
  final: StepFinal,
};

export function StepScreen({ step }: { step: StepId }) {
  return (
    <div className="flex flex-col gap-6">
      <StepNav />
      <KnownStep key={step} step={step} />
    </div>
  );
}

function KnownStep({ step }: { step: StepId }) {
  const router = useRouter();
  const { lesson, ready } = useLesson();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();
  const progress = lesson.steps[step];
  const locked = progress.status === "locked";

  useEffect(() => {
    if (!ready) return;
    if (lesson.experience === null) router.replace("/");
    else if (locked) router.replace(stepHref(resumeStep(lesson)));
    else dispatch({ type: "open", step, at: Date.now() });
    // Only on arrival: later state changes must not re-route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, step]);

  // Saved progress only exists in the browser; show the outline until it's read.
  if (!ready || locked || lesson.experience === null) return <StepLoading />;

  const after = nextToDo(lesson, step) ?? nextStep(step);
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
  return <Body {...props} />;
}

function StepLoading() {
  const space = <div className="aspect-[5/7] w-[clamp(84px,22vw,140px)] border-2 border-dashed border-ink/25" />;
  return (
    <div
      role="status"
      className="step-loading grid min-h-[70vh] grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]"
    >
      <span className="sr-only">Loading your lesson</span>
      <div aria-hidden className="flex flex-col gap-4 bg-spot p-5 sm:p-6 lg:border-r-[3px] lg:border-ink">
        <div className="h-10 w-8 bg-panel/35" />
        <div className="h-7 w-4/5 bg-panel/25" />
        <div className="h-7 w-3/5 bg-panel/25" />
      </div>
      <div aria-hidden className="paper flex flex-col justify-center gap-10 border-t-[3px] border-ink p-6 lg:border-t-0">
        <div className="flex justify-center gap-4">{space}{space}</div>
        <div className="flex justify-center gap-4">{space}{space}</div>
      </div>
    </div>
  );
}
