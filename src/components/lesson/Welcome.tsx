"use client";

import { useRouter } from "next/navigation";
import { useEffect, ViewTransition } from "react";
import { CARDS } from "@/lib/cards";
import { resumeStep, STEPS, stepHref } from "@/lib/lesson/lesson";
import { buildReport } from "@/lib/lesson/report";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { Card } from "../Card";
import { OnSpot } from "./Coach";
import { useArrivalFocus } from "./useArrivalFocus";

/** The first screen. Returning learners get "Continue" instead of the question. */
export function Welcome() {
  const router = useRouter();
  const { lesson, ready } = useLesson();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();
  const started = ready && lesson.experience !== null;
  const resume = resumeStep(lesson);
  const resumeIndex = STEPS.findIndex((s) => s.id === resume);
  // Finished the whole lesson: "Continue" opens the report card.
  const finished = started && buildReport(lesson).complete;
  const continueHref = finished ? "/report" : stepHref(resume);

  // Load the next screen ahead of the click, so it's ready in the same frame and
  // the blue band and Storm Hawk can morph across instead of popping in.
  useEffect(() => {
    router.prefetch(continueHref);
    router.prefetch("/basics");
    router.prefetch("/quick-check");
  }, [router, continueHref]);

  // Never played: a 20-second "What's the game?" first. Played a bit: the quick
  // check, where each right answer skips a step.
  function start(experience: "new" | "some") {
    dispatch({ type: "start", experience, at: Date.now() });
    router.push(experience === "new" ? "/basics" : "/quick-check", { transitionTypes: ["nav-forward"] });
  }

  return (
    <section
      aria-labelledby="welcome-title"
      className="grid grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel md:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]"
    >
      {/* The blue band morphs into the step's task band on the next screen. */}
      <ViewTransition name="task-band" share="morph" default="none">
        <div className="on-spot flex flex-col justify-between gap-10 bg-spot p-6 text-panel sm:p-10 md:border-r-[3px] md:border-ink">
          <div className="flex flex-col gap-4">
            <h1
              id="welcome-title"
              ref={headingRef}
              tabIndex={-1}
              className="max-w-[12ch] text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] font-extrabold tracking-[-0.035em]"
            >
              Learn Magic combat
            </h1>
            <p className="max-w-[34ch] text-xl text-panel/90">
              Magic: The Gathering is a fantasy card game. You battle an opponent using creatures and spells.
            </p>
            {/* Facts checked Nov 2026: released Aug 5, 1993 (Guinness World Records: first modern trading
                card game); "played by over 50 million players" (Hasbro investor site). */}
            <p className="max-w-[38ch] text-base text-panel/90">
              It&apos;s been around since 1993. More than 50 million people have played it.
            </p>
            <p className="text-base text-panel/80">This lesson takes about 10 minutes. No cards needed.</p>
          </div>
          {started ? (
            <div className="flex flex-col gap-3">
              <p className="text-lg font-bold">Welcome back.</p>
              <div className="flex flex-wrap gap-3">
                <OnSpot
                  primary
                  onClick={() => router.push(continueHref, { transitionTypes: ["nav-forward"] })}
                >
                  {finished ? "See your report card" : `Continue: Step ${resumeIndex + 1}`}
                </OnSpot>
                <OnSpot onClick={() => dispatch({ type: "restart" })}>Start over</OnSpot>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-lg font-bold">Have you played before?</p>
              <div className="flex flex-wrap gap-3">
                <OnSpot primary onClick={() => start("new")}>
                  Never played
                </OnSpot>
                <OnSpot onClick={() => start("some")}>Played a bit</OnSpot>
              </div>
            </div>
          )}
        </div>
      </ViewTransition>
      <div className="paper flex items-center justify-center border-t-[3px] border-ink p-8 md:border-t-0">
        <div className="[--card-w:clamp(190px,52vw,250px)]">
          {/* Flies onto the Step 1 board as the screen changes. */}
          <Card card={CARDS.stormHawk} foil transitionName="card-stormHawk" />
        </div>
      </div>
    </section>
  );
}
