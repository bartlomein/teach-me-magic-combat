"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { CARDS } from "@/lib/cards";
import { resumeStep, STEPS, stepHref } from "@/lib/lesson/lesson";
import { buildReport } from "@/lib/lesson/report";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../Card";
import { canLeap, playHawkLeap, stopHawkLeap } from "../hawk/hawkLeap";
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
  // The Storm Hawk leap (three.js, loaded only when it plays): once per visit on its own, then on "Watch the hawk".
  const [leapReady, setLeapReady] = useState(false);
  const canPlay = leapReady && motion === "full";
  const [playing, setPlaying] = useState(false);

  async function playLeap(onStart?: () => void) {
    if (!cardRef.current || motion !== "full") return;
    setPlaying(true);
    const result = await playHawkLeap(cardRef.current, onStart);
    // A newer play took over: it owns the button's state now.
    if (result !== "superseded") setPlaying(false);
  }

  // After the page has loaded and gone quiet, so it never slows the first paint. Full motion only.
  useEffect(() => {
    if (motion !== "full") {
      stopHawkLeap();
      return;
    }
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    let seen: IntersectionObserver | null = null;
    const begin = () => {
      idle = window.requestIdleCallback?.(() => (timer = window.setTimeout(go, 700)), { timeout: 2000 }) ?? window.setTimeout(go, 900);
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
    // Leaving by any link or the Back button: put the hawk back first, before the page transition snapshots it.
    const onLinkClick = (e: MouseEvent) => (e.target as Element | null)?.closest?.("a[href]") && stopHawkLeap();
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    document.addEventListener("click", onLinkClick, true);
    window.addEventListener("popstate", stopHawkLeap);
    return () => {
      cancelled = true;
      seen?.disconnect();
      window.removeEventListener("load", begin);
      document.removeEventListener("click", onLinkClick, true);
      window.removeEventListener("popstate", stopHawkLeap);
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback?.(idle);
      stopHawkLeap();
    };
    // playLeap only reads `motion` (a dependency already) and refs; re-running on its identity would restart the timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);

  /** Leave the page: put the hawk back on its card first, so the page transition captures the card. */
  function go(href: string) {
    stopHawkLeap();
    router.push(href, { transitionTypes: ["nav-forward"] });
  }

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
          <Card card={CARDS.stormHawk} foil transitionName="card-stormHawk" />
        </div>
        {canPlay && (
          <button
            type="button"
            onClick={() => void playLeap()}
            disabled={playing}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-ink-soft hover:text-ink disabled:opacity-50"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 1 0 2.4-5.7" />
              <path d="M4 4v4.5h4.5" />
            </svg>
            Watch the hawk
          </button>
        )}
      </div>
    </section>
  );
}

const SEEN_KEY = "teach-me:hawk-leap";
/** sessionStorage can throw (private modes, blocked storage): then it just plays again next visit. */
function readSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "seen";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "seen");
  } catch {
    /* fine: see readSeen */
  }
}

/**
 * Wait until the pointer isn't tilting the card. The leap starts pixel-matched
 * to the painted hawk, which only holds while the card sits flat.
 */
function whenStill(el: HTMLElement): Promise<void> {
  const card = el.querySelector<HTMLElement>(".card");
  if (!card || !card.matches(":hover")) return Promise.resolve();
  return new Promise((resolve) => card.addEventListener("pointerleave", () => window.setTimeout(resolve, 500), { once: true }));
}
