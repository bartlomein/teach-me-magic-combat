import { describe, expect, it } from "vitest";
import { initialLesson, lessonReducer, type LessonAction } from "./lesson";
import { feedbackEmail, parseFeedback, toFeedback } from "./feedback";
import { buildReport } from "./report";

function finished() {
  const ids = ["attack", "block", "flying", "heal", "final"] as const;
  const actions: LessonAction[] = [{ type: "start", experience: "new", at: 1 }];
  ids.forEach((id, i) => {
    actions.push({ type: "open", step: id, at: 1000 * i });
    if (id === "flying") actions.push({ type: "miss", step: id, myth: "M6", note: "x", at: 1 });
    actions.push({ type: "complete", step: id, at: 1000 * i + 40_000 });
  });
  return buildReport(actions.reduce(lessonReducer, initialLesson()));
}

describe("feedback email", () => {
  it("round-trips: what the report sends, the server accepts", () => {
    const f = toFeedback(finished(), 4);
    expect(parseFeedback(JSON.parse(JSON.stringify(f)))).toEqual(f);
  });

  it("writes a plain summary with no personal details", () => {
    const { subject, text } = feedbackEmail(toFeedback(finished(), 4));
    expect(subject).toBe('Lesson feedback: enjoyed it "Quite a bit"');
    expect(text).toContain("Enjoyed it: Quite a bit (4 of 5)");
    expect(text).toContain("- Flying + reach: Took a few tries, 40 s, hints 0");
    expect(text).toContain("- Final challenge: First try, 40 s, hints 0");
    expect(text).toContain("1x Thought ground creatures can block flyers (M6)");
  });

  it("rejects anything that isn't the exact shape, so the endpoint can't send other text", () => {
    const good = JSON.parse(JSON.stringify(toFeedback(finished(), 3)));
    const bad = [
      null,
      "hi",
      { ...good, feeling: 6 },
      { ...good, feeling: 2.5 },
      { ...good, rows: good.rows.slice(1) },
      { ...good, rows: [{ ...good.rows[0], step: "<script>" }, ...good.rows.slice(1)] },
      { ...good, rows: [{ ...good.rows[0], result: "spam text" }, ...good.rows.slice(1)] },
      { ...good, rows: [{ ...good.rows[0], hints: 9 }, ...good.rows.slice(1)] },
      { ...good, myths: [{ myth: "Buy now", count: 1 }] },
      { ...good, myths: [{ myth: "M6", count: 1000 }] },
    ];
    for (const b of bad) expect(parseFeedback(b)).toBeNull();
  });
});
