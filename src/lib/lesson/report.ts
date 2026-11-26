import type { Myth } from "@/lib/rules/engine";
import { resultOf, STEPS, type LessonState, type StepId } from "./lesson";

export const MYTHS: Record<Myth, { belief: string; rule: string }> = {
  M1: { belief: "Thought a new creature can attack", rule: "New creatures wait one turn before they attack." },
  M2: { belief: "Thought the attacker picks blockers", rule: "The defender always picks the blockers." },
  M3: { belief: "Thought a new creature can't block", rule: "New creatures can block right away." },
  M4: { belief: "Thought the bigger creature always wins", rule: "A creature dies when damage reaches its toughness." },
  M5: { belief: "Thought ground creatures can block flyers", rule: "Only flying or reach can block a flyer." },
  M6: { belief: "Thought flyers can't block ground creatures", rule: "Flyers can block any attacker." },
  M7: { belief: "Thought damage stays on a creature", rule: "Damage heals at the end of every turn." },
  M8: { belief: "Thought tapped creatures can block", rule: "Attackers stay tapped until their next turn, so they can't block." },
  M9: { belief: "Thought blocking taps a creature", rule: "Blocking doesn't tap. Only attacking does." },
};

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
  practiced?: "clean" | "missed";
};

export type MythGroup = {
  myth: Myth;
  count: number;
  belief: string;
  rule: string;
  steps: StepId[];
  fixed: boolean;
};

export type Report = {
  complete: boolean;
  rows: ReportRow[];
  clean: number;
  fixedByPractice: number;
  totalMistakes: number;
  myths: MythGroup[];
  strengths: string[];
  needs: string[];
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
