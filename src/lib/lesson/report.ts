/**
 * The report card, worked out from the saved lesson. Pure functions only, so
 * the numbers are tested and the page just draws them.
 *
 * Modeled on Marker's own report: a result per concept, mistakes grouped by
 * type (here: by myth), and strengths and needs.
 */
import type { Myth } from "@/lib/rules/engine";
import { resultOf, STEPS, type LessonState, type StepId } from "./lesson";

/** Each myth as the learner believed it, and the rule that fixes it. Plain words. */
export const MYTHS: Record<Myth, { belief: string; rule: string }> = {
  M2: { belief: "Thought a new creature can attack", rule: "New creatures wait one turn before they attack." },
  M3: { belief: "Thought the attacker picks blockers", rule: "The defender always picks the blockers." },
  M4: { belief: "Thought a new creature can't block", rule: "New creatures can block right away." },
  M5: { belief: "Thought the bigger creature always wins", rule: "A creature dies when damage reaches its toughness." },
  M6: { belief: "Thought ground creatures can block flyers", rule: "Only flying or reach can block a flyer." },
  M7: { belief: "Thought flyers can't block ground creatures", rule: "Flyers can block any attacker." },
  M8: { belief: "Thought damage stays on a creature", rule: "Damage heals at the end of every turn." },
  M9: { belief: "Thought tapped creatures can block", rule: "Attackers stay tapped until their next turn, so they can't block." },
  M10: { belief: "Thought blocking taps a creature", rule: "Blocking doesn't tap. Only attacking does." },
};

/** What each step actually tests, named as a skill (for Strengths / Needs). */
export const SKILLS: Record<StepId, string> = {
  attack: "Who can attack",
  block: "Blocking math",
  flying: "Blocking flyers",
  heal: "Damage wears off",
  final: "Planning two turns",
};

export type StepResult = NonNullable<ReturnType<typeof resultOf>>;

export type ReportRow = {
  id: StepId;
  title: string;
  result: StepResult;
  hints: number;
  misses: number;
  /** How the latest practice replay went, if any. */
  practiced?: "clean" | "missed";
};

export type MythGroup = {
  myth: Myth;
  count: number;
  belief: string;
  rule: string;
  /** Steps where it happened, in lesson order. */
  steps: StepId[];
  /**
   * Fixed: none of its steps is still on the To practice list. Either you
   * practiced them clean, or it was a quick-check miss you then got right in
   * the lesson.
   */
  fixed: boolean;
};

export type Report = {
  /** All steps done or skipped. */
  complete: boolean;
  rows: ReportRow[];
  /** Steps right the first time, or skipped because you knew them. */
  clean: number;
  /** Steps you missed the first time, then practiced and got right. */
  fixedByPractice: number;
  totalMistakes: number;
  myths: MythGroup[];
  strengths: string[];
  needs: string[];
  /** Steps to replay for "Practice what you missed", in order. */
  practice: StepId[];
  hintsUsed: number;
};

export function buildReport(s: LessonState): Report {
  const rows: ReportRow[] = STEPS.map(({ id, title }) => {
    const p = s.steps[id];
    const result = resultOf(p);
    return {
      id,
      title,
      // A step that isn't finished shows as "retry" here; the page won't render
      // the report until `complete` is true anyway.
      result: result ?? "retry",
      hints: p.hints,
      misses: p.misses,
      ...(p.practiced ? { practiced: p.practiced } : {}),
    };
  });

  const complete = STEPS.every(({ id }) => s.steps[id].status === "done" || s.steps[id].status === "skipped");

  const order = (id: StepId) => STEPS.findIndex((x) => x.id === id);
  const groups = new Map<Myth, MythGroup>();
  for (const m of s.mistakes) {
    if (!m.myth) continue;
    const g = groups.get(m.myth) ?? {
      myth: m.myth,
      count: 0,
      ...MYTHS[m.myth],
      steps: [],
      fixed: false,
    };
    g.count += 1;
    if (!g.steps.includes(m.step)) g.steps.push(m.step);
    groups.set(m.myth, g);
  }
  const practicedClean = (id: StepId) => s.steps[id].practiced === "clean";
  // Needs: steps you missed during the lesson itself,
  // unless you've since practiced them and got them right.
  // A quick-check miss that you then got right first time is a strength: you learned it.
  const missedFirst = rows.filter((r) => r.result !== "skipped" && (r.result === "lighter" || r.misses > 0)).map((r) => r.id);
  const needIds = missedFirst.filter((id) => !practicedClean(id));
  const fixedIds = missedFirst.filter(practicedClean);
  const strengths = rows.filter((r) => !missedFirst.includes(r.id)).map((r) => SKILLS[r.id]).concat(fixedIds.map((id) => `${SKILLS[id]} (after practice)`));

  const myths = [...groups.values()]
    .map((g) => ({
      ...g,
      steps: [...g.steps].sort((a, b) => order(a) - order(b)),
      fixed: !g.steps.some((id) => needIds.includes(id)),
    }))
    .sort((a, b) => b.count - a.count || a.myth.localeCompare(b.myth));

  return {
    complete,
    rows,
    clean: rows.filter((r) => r.result === "first-try" || r.result === "skipped").length,
    fixedByPractice: fixedIds.length,
    totalMistakes: s.mistakes.length,
    myths,
    strengths,
    needs: needIds.map((id) => SKILLS[id]),
    practice: needIds,
    hintsUsed: rows.reduce((t, r) => t + r.hints, 0),
  };
}
