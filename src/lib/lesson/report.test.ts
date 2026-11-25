import { describe, expect, it } from "vitest";
import { initialLesson, lessonReducer, type LessonAction, type LessonState } from "./lesson";
import { buildReport, formatTime } from "./report";

const run = (actions: LessonAction[], s: LessonState = initialLesson()) => actions.reduce(lessonReducer, s);

/** Play every step to done at 30 s each, with optional extra actions mixed in per step. */
function playAll(extra: Partial<Record<string, LessonAction[]>> = {}) {
  let s = run([{ type: "start", experience: "new", at: 0 }]);
  const ids = ["attack", "block", "flying", "heal", "final"] as const;
  ids.forEach((id, i) => {
    const t = i * 100_000;
    s = run([{ type: "open", step: id, at: t }, ...(extra[id] ?? []), { type: "complete", step: id, at: t + 30_000 }], s);
  });
  return s;
}

describe("report card", () => {
  it("a clean run: every step first try, all strengths, nothing to practice", () => {
    const r = buildReport(playAll());
    expect(r.complete).toBe(true);
    expect(r.clean).toBe(5);
    expect(r.rows.map((x) => x.result)).toEqual(["first-try", "first-try", "first-try", "first-try", "first-try"]);
    expect(r.needs).toEqual([]);
    expect(r.practice).toEqual([]);
    expect(r.myths).toEqual([]);
    expect(r.totalSeconds).toBe(150);
  });

  it("groups mistakes by myth, most common first, and names the rule", () => {
    const miss = (myth: "M6" | "M5", step: "flying" | "block"): LessonAction => ({ type: "miss", step, myth, note: "x", at: 1 });
    const r = buildReport(playAll({ flying: [miss("M6", "flying"), miss("M6", "flying")], block: [miss("M5", "block")] }));
    expect(r.totalMistakes).toBe(3);
    expect(r.myths.map((g) => [g.myth, g.count])).toEqual([
      ["M6", 2],
      ["M5", 1],
    ]);
    expect(r.myths[0].rule).toMatch(/flying or reach/);
    expect(r.rows.find((x) => x.id === "flying")!.result).toBe("lighter");
    expect(r.needs).toEqual(["Blocking math", "Blocking flyers"]);
    expect(r.practice).toEqual(["block", "flying"]);
    expect(r.strengths).toContain("Who can attack");
  });

  it("a quick-check miss you then get right counts as learned, not a need", () => {
    let s = run([
      {
        type: "quick-check",
        at: 0,
        results: [
          { step: "attack", correct: true, myth: "M2", note: "Quick check: a" },
          { step: "block", correct: false, myth: "M3", note: "Quick check: b" },
          { step: "flying", correct: true, myth: "M6", note: "Quick check: c" },
        ],
      },
    ]);
    for (const id of ["block", "heal", "final"] as const) s = run([{ type: "open", step: id, at: 10 }, { type: "complete", step: id, at: 20 }], s);
    const r = buildReport(s);
    expect(r.complete).toBe(true);
    expect(r.rows.map((x) => x.result)).toEqual(["skipped", "first-try", "skipped", "first-try", "first-try"]);
    expect(r.myths).toEqual([expect.objectContaining({ myth: "M3", count: 1, quickCheckOnly: true })]);
    expect(r.needs).toEqual([]);
    expect(r.rows[0].seconds).toBeNull();
  });

  it("practicing a missed step clean moves it from needs to strengths, and marks its myths fixed", () => {
    const miss = (myth: "M6" | "M5", step: "flying" | "block"): LessonAction => ({ type: "miss", step, myth, note: "x", at: 1 });
    let s = playAll({ flying: [miss("M6", "flying"), miss("M6", "flying")], block: [miss("M5", "block")] });
    s = run([{ type: "open", step: "flying", at: 900_000 }, { type: "complete", step: "flying", at: 930_000 }], s);
    const r = buildReport(s);
    expect(r.rows.find((x) => x.id === "flying")).toMatchObject({ result: "lighter", practiced: "clean" });
    expect(r.needs).toEqual(["Blocking math"]);
    expect(r.practice).toEqual(["block"]);
    expect(r.strengths).toContain("Blocking flyers (after practice)");
    expect(r.fixedByPractice).toBe(1);
    expect(r.myths.find((g) => g.myth === "M6")!.fixed).toBe(true);
    expect(r.myths.find((g) => g.myth === "M5")!.fixed).toBe(false);
    expect(r.totalMistakes).toBe(3); // history is kept
  });

  it("a practice run with a miss keeps the step in needs", () => {
    let s = playAll({ block: [{ type: "miss", step: "block", myth: "M5", note: "x", at: 1 }] });
    s = run([{ type: "open", step: "block", at: 900_000 }, { type: "miss", step: "block", myth: "M5", note: "x", at: 900_001 }, { type: "complete", step: "block", at: 930_000 }], s);
    const r = buildReport(s);
    expect(r.rows.find((x) => x.id === "block")!.practiced).toBe("missed");
    expect(r.needs).toEqual(["Blocking math"]);
  });


  it("is not complete until every step is done or skipped", () => {
    const s = run([{ type: "start", experience: "new", at: 0 }]);
    expect(buildReport(s).complete).toBe(false);
  });


  it("formats time plainly", () => {
    expect(formatTime(45)).toBe("45 s");
    expect(formatTime(120)).toBe("2 min");
    expect(formatTime(125)).toBe("2 min 05 s");
  });
});
