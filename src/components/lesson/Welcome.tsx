"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { CARDS } from "@/lib/cards";
import { resumeStep, STEPS, stepHref } from "@/lib/lesson/lesson";
import { buildReport } from "@/lib/lesson/report";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../Card";
import { canLeap, playGolemLeap, stopGolemLeap } from "../golem/golemLeap";
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
  const motion = useMotionMode();
  const cardRef = useRef<HTMLDivElement>(null);
  // The Moss Golem stepping out of its card (three.js, loaded only when it plays): on its own once per page load,
  // then on "Watch the golem". It runs about 13 seconds, so there's a Skip button (and Esc) while it plays.
  const [leapReady, setLeapReady] = useState(false);
  const canPlay = leapReady && motion === "full";
  const [playing, setPlaying] = useState(false);

  async function playLeap(onStart?: () => void) {
    if (!cardRef.current || motion !== "full") return;
    setPlaying(true);
    const result = await playGolemLeap(cardRef.current, onStart);
    // A newer play took over: it owns the button's state now.
    if (result !== "superseded") setPlaying(false);
  }

  // After the page has loaded and gone quiet, so it never slows the first paint. Full motion only.
  useEffect(() => {
    if (motion !== "full") {
      stopGolemLeap();
      return;
    }
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    let seen: IntersectionObserver | null = null;
    const begin = () => {
      // Safari has no requestIdleCallback: a plain timer instead. Each kept in its own handle for cleanup.
      if (window.requestIdleCallback) idle = window.requestIdleCallback(() => (timer = window.setTimeout(go, 700)), { timeout: 2000 });
      else timer = window.setTimeout(go, 900);
    };
    const go = () => {
      const el = cardRef.current;
      if (cancelled || !el || !canLeap(motion)) return;
      setLeapReady(true);
      if (readSeen()) return;
      // Only once the card is (almost) fully on screen: on phones it's below the fold until you scroll.
      const threshold = Math.min(0.85, (window.innerHeight * 0.9) / Math.max(1, el.offsetHeight));
      seen = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting || cancelled) return;
          seen?.disconnect();
          void whenStill(el).then(() => {
            if (!cancelled) void playLeap(markSeen);
          });
        },
        { threshold },
      );
      seen.observe(el);
    };
    // Leaving by any link or the Back button: put the golem back first, before the page transition snapshots it.
    const onLinkClick = (e: MouseEvent) => (e.target as Element | null)?.closest?.("a[href]") && stopGolemLeap();
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    document.addEventListener("click", onLinkClick, true);
    window.addEventListener("popstate", stopGolemLeap);
    return () => {
      cancelled = true;
      seen?.disconnect();
      window.removeEventListener("load", begin);
      document.removeEventListener("click", onLinkClick, true);
      window.removeEventListener("popstate", stopGolemLeap);
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
      stopGolemLeap();
    };
    // playLeap only reads `motion` (a dependency already) and refs; re-running on its identity would restart the timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

  // Esc skips it, like the Skip button.
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stopGolemLeap();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  /** Leave the page: put the golem back on its card first, so the page transition captures the card. */
  function go(href: string) {
    stopGolemLeap();
    router.push(href, { transitionTypes: ["nav-forward"] });
  }

  // Load the next screen ahead of the click, so it's ready in the same frame and
  // the blue band and Moss Golem can morph across instead of popping in.
  useEffect(() => {
    router.prefetch(continueHref);
    router.prefetch("/basics");
    router.prefetch("/quick-check");
  }, [router, continueHref]);

  // Never played: a 20-second "What's the game?" first. Played a bit: the quick
  // check, where each right answer skips a step.
  function start(experience: "new" | "some") {
    dispatch({ type: "start", experience, at: Date.now() });
    go(experience === "new" ? "/basics" : "/quick-check");
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
                  onClick={() => go(continueHref)}
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
      <div className="paper flex flex-col items-center justify-center gap-3 border-t-[3px] border-ink p-8 md:border-t-0">
        <div ref={cardRef} className="[--card-w:clamp(190px,52vw,250px)]">
          {/* Flies onto the Step 1 board as the screen changes. */}
          <Card card={CARDS.mossGolem} foil transitionName="card-mossGolem" />
        </div>
        {canPlay &&
          (playing ? (
            // Above the golem's canvas, so it can always be reached.
            <button
              type="button"
              onClick={stopGolemLeap}
              className="relative z-[61] inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink bg-panel px-4 text-sm font-bold text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M5 5.5v13l9-6.5zM15 5h3v14h-3z" />
              </svg>
              Skip
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void playLeap()}
              className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-ink-soft hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a8 8 0 1 0 2.4-5.7" />
                <path d="M4 4v4.5h4.5" />
              </svg>
              Watch the golem
            </button>
          ))}
      </div>
    </section>
  );
}

/**
 * Played already since this page loaded? Kept in memory, not storage: a reload plays it again,
 * but coming back to Welcome from a lesson step doesn't.
 */
let seenThisLoad = false;
const readSeen = () => seenThisLoad;
const markSeen = () => {
  seenThisLoad = true;
};

/**
 * Wait until the pointer isn't tilting the card. The golem steps out through the
 * card's art window, which has to be where it was measured: only while the card sits flat.
 */
function whenStill(el: HTMLElement): Promise<void> {
  const card = el.querySelector<HTMLElement>(".card");
  if (!card || !card.matches(":hover")) return Promise.resolve();
  return new Promise((resolve) => card.addEventListener("pointerleave", () => window.setTimeout(resolve, 500), { once: true }));
}
