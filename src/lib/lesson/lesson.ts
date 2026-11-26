/**
 * Lesson flow: which screen you're on, which steps are open, and every
 * mistake and hint (for the report card later).
 *
 * A plain reducer, not a library: the flow is a short line of screens, and a
 * pure function is easy to test and easy to explain. Time comes in through the
 * action (`at`) so the reducer stays pure.
 */
import type { Myth } from "@/lib/rules/engine";

export const STEPS = [
  { id: "attack", title: "Attacking" },
  { id: "block", title: "Blocking" },
  { id: "flying", title: "Flying + reach" },
  { id: "heal", title: "Damage wears off" },
  { id: "final", title: "Final challenge" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
export type View = "welcome" | StepId;

/** After this many misses on a step, offer the lighter version. */
export const LIGHTER_AFTER = 2;

export type StepProgress = {
  status: "locked" | "open" | "done" | "skipped";
  misses: number;
  /** Highest hint level used (0 = none, max 3). */
  hints: number;
  /** "active" = the lighter board is showing; "cleared" = learner passed it and is back on the full one. */
  lighter: "no" | "active" | "cleared";
  startedAt?: number;
  finishedAt?: number;
  /**
   * Replays after the step is done. The first try stays the record (like a
   * test score); these show practice on top of it.
   * `replayMisses`: misses in the replay in progress. `practiced`: how the latest
   * finished replay went ("clean" = no misses).
   */
  replayMisses?: number;
  practiced?: "clean" | "missed";
};

export type Mistake = {
  step: StepId;
  myth?: Myth;
  note: string;
  at: number;
  soft?: boolean;
};

export type LessonState = {
  view: View;
  experience: "new" | "some" | null;
  steps: Record<StepId, StepProgress>;
  mistakes: Mistake[];
};

export type LessonAction =
  | { type: "start"; experience: "new" | "some"; at: number }
  | { type: "open"; step: StepId; at: number }
  /** `soft`: logged and graded, but doesn't switch on the lighter version (e.g. a quick either/or question). */
  | {
      type: "miss";
      step: StepId;
      myth?: Myth;
      note: string;
      at: number;
      soft?: boolean;
    }
  | { type: "hint"; step: StepId }
  | { type: "lighter-cleared"; step: StepId }
  | { type: "complete"; step: StepId; at: number }
  | { type: "restart" }
  /**
   * The quick check ("Played a bit"): each step whose question was answered
   * right is skipped (still reviewable). Wrong answers are logged with their myth.
   */
  | {
      type: "quick-check";
      results: { step: StepId; correct: boolean; myth: Myth; note: string }[];
      at: number;
    };

const fresh = (): StepProgress => ({
  status: "locked",
  misses: 0,
  hints: 0,
  lighter: "no",
});

export function initialLesson(): LessonState {
  return {
    view: "welcome",
    experience: null,
    steps: Object.fromEntries(STEPS.map((s) => [s.id, fresh()])) as Record<
      StepId,
      StepProgress
    >,
    mistakes: [],
  };
}

const STATUSES = ["locked", "open", "done", "skipped"];
const LIGHTER = ["no", "active", "cleared"];

/** Checks a saved lesson before trusting it: an old or hand-edited save must not crash a step. */
export function isLessonState(x: unknown): x is LessonState {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<LessonState>;
  const views: unknown[] = ["welcome", ...STEPS.map((st) => st.id)];
  return (
    views.includes(s.view) &&
    (s.experience === null || s.experience === "new" || s.experience === "some") &&
    Array.isArray(s.mistakes) &&
    s.mistakes.every((m) => m && typeof m.note === "string" && typeof m.at === "number" && views.includes(m.step)) &&
    !!s.steps &&
    STEPS.every((st) => {
      const p = s.steps![st.id] as Partial<StepProgress> | undefined;
      return (
        !!p &&
        STATUSES.includes(p.status as string) &&
        LIGHTER.includes(p.lighter as string) &&
        typeof p.misses === "number" &&
        typeof p.hints === "number"
      );
    })
  );
}

function patchStep(
  s: LessonState,
  id: StepId,
  change: Partial<StepProgress>,
): LessonState {
  return { ...s, steps: { ...s.steps, [id]: { ...s.steps[id], ...change } } };
}

/** Anything done, skipped or missed yet? The quick check only counts before this. */
export function hasProgress(s: LessonState) {
  return s.mistakes.length > 0 || STEPS.some((x) => s.steps[x.id].status === "done" || s.steps[x.id].status === "skipped");
}

/** Would one more (non-soft) miss on this step switch on the lighter version? */
export function nextMissGoesLighter(s: LessonState, id: StepId) {
  const p = s.steps[id];
  if (p.status === "done" || p.lighter !== "no") return false;
  return (
    s.mistakes.filter((m) => m.step === id && !m.soft).length + 1 >=
    LIGHTER_AFTER
  );
}

export function nextStep(id: StepId): StepId | null {
  const i = STEPS.findIndex((s) => s.id === id);
  return STEPS[i + 1]?.id ?? null;
}

export function canOpen(s: LessonState, id: StepId) {
  return s.steps[id].status !== "locked";
}

export function lessonReducer(s: LessonState, a: LessonAction): LessonState {
  switch (a.type) {
    case "start": {
      // Both paths open Step 1. "Some" then takes the quick check, which may skip ahead.
      const next = patchStep({ ...s, experience: a.experience }, "attack", {
        status: "open",
        startedAt: a.at,
      });
      return { ...next, view: "attack" };
    }
    case "open": {
      if (!canOpen(s, a.step)) return s; // locked steps can't be opened
      const p = s.steps[a.step];
      let next = p.startedAt ? s : patchStep(s, a.step, { startedAt: a.at });
      // Opening a finished step starts a fresh practice attempt.
      if (p.status === "done") next = patchStep(next, a.step, { replayMisses: 0 });
      return { ...next, view: a.step };
    }
    case "miss": {
      const p = s.steps[a.step];
      // Replaying a finished step doesn't change the first-try record; it only counts toward this practice attempt.
      if (p.status === "done") return patchStep(s, a.step, { replayMisses: (p.replayMisses ?? 0) + 1 });
      const misses = p.misses + 1;
      const hardMisses =
        s.mistakes.filter((m) => m.step === a.step && !m.soft).length +
        (a.soft ? 0 : 1);
      const lighter =
        p.lighter === "no" && hardMisses >= LIGHTER_AFTER
          ? "active"
          : p.lighter;
      const next = patchStep(s, a.step, { misses, lighter });
      const mistake: Mistake = {
        step: a.step,
        myth: a.myth,
        note: a.note,
        at: a.at,
        ...(a.soft ? { soft: true } : {}),
      };
      return { ...next, mistakes: [...s.mistakes, mistake] };
    }
    case "hint": {
      const p = s.steps[a.step];
      return patchStep(s, a.step, { hints: Math.min(p.hints + 1, 3) });
    }
    case "lighter-cleared":
      return s.steps[a.step].lighter === "active"
        ? patchStep(s, a.step, { lighter: "cleared" })
        : s;
    case "complete": {
      const p = s.steps[a.step];
      if (p.status === "done") {
        const clean = (p.replayMisses ?? 0) === 0;
        return patchStep(s, a.step, { practiced: clean ? "clean" : "missed", replayMisses: 0 });
      }
      const next = patchStep(s, a.step, { status: "done", finishedAt: a.at });
      // Unlock the next step that still needs doing (skipped ones are passed over).
      const after = nextToDo(next, a.step);
      return after && next.steps[after].status === "locked" ? patchStep(next, after, { status: "open" }) : next;
    }
    case "quick-check": {
      // Only before any real progress: retaking it (Back button) must not undo finished steps or log misses twice.
      if (hasProgress(s)) return s;
      let next: LessonState = { ...s, experience: "some" };
      for (const r of a.results) {
        if (r.correct) next = patchStep(next, r.step, { status: "skipped" });
        else
          next = {
            ...next,
            mistakes: [...next.mistakes, { step: r.step, myth: r.myth, note: r.note, at: a.at, soft: true }],
          };
      }
      const first = STEPS.find((x) => next.steps[x.id].status !== "skipped")!.id;
      next = patchStep(next, first, { status: "open", startedAt: a.at });
      return { ...next, view: first };
    }
    case "restart":
      return initialLesson();
  }
}

/** How a finished step went, for the progress bar now and the report card later. */
export function resultOf(
  p: StepProgress,
): "first-try" | "hint" | "lighter" | "retry" | "skipped" | null {
  if (p.status === "skipped") return "skipped";
  if (p.status !== "done") return null;
  if (p.lighter !== "no") return "lighter";
  if (p.hints > 0) return "hint";
  if (p.misses > 0) return "retry";
  return "first-try";
}

// ---------------------------------------------------------------------------
// URLs: one readable address per step, so Back, refresh and sharing work.
// ---------------------------------------------------------------------------

export const SLUGS: Record<StepId, string> = {
  attack: "attacking",
  block: "blocking",
  flying: "flying-and-reach",
  heal: "damage-wears-off",
  final: "final-challenge",
};

export const stepFromSlug = (slug: string): StepId | null =>
  (Object.keys(SLUGS) as StepId[]).find((id) => SLUGS[id] === slug) ?? null;

export const stepHref = (id: StepId) => `/learn/${SLUGS[id]}`;

/** The next step after `id` that still needs doing (not done, not skipped), if any. */
export function nextToDo(s: LessonState, id: StepId): StepId | null {
  const i = STEPS.findIndex((x) => x.id === id);
  return STEPS.slice(i + 1).find((x) => s.steps[x.id].status !== "skipped" && s.steps[x.id].status !== "done")?.id ?? null;
}

/** Where "Continue" should go: the first open step that isn't done, else the last done one. */
export function resumeStep(s: LessonState): StepId {
  const open = STEPS.find((x) => s.steps[x.id].status === "open");
  if (open) return open.id;
  const done = [...STEPS].reverse().find((x) => s.steps[x.id].status === "done");
  return done?.id ?? "attack";
}

/** Moving to `to` from `from`: forward or back, for the slide direction. */
export function direction(from: StepId | "welcome", to: StepId | "welcome"): "nav-forward" | "nav-back" {
  const i = (v: StepId | "welcome") => (v === "welcome" ? -1 : STEPS.findIndex((x) => x.id === v));
  return i(to) >= i(from) ? "nav-forward" : "nav-back";
}
