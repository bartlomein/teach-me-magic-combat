/**
 * The anonymous feedback note: the one-tap check-in plus how the lesson went,
 * sent to the author by email.
 *
 * The browser only ever sends numbers and fixed words (step ids, result names,
 * myth codes). The server checks every field against these lists and writes the
 * email itself, so nobody can use the endpoint to send their own text.
 */
import type { Myth } from "@/lib/rules/engine";
import { STEPS, type CheckIn, type StepId } from "./lesson";
import { MYTHS, type Report, type StepResult } from "./report";

export const FEELINGS = ["Not at all", "A little", "Somewhat", "Quite a bit", "A lot"] as const;

export type FeedbackRow = { step: StepId; result: StepResult; seconds: number | null; hints: number };
export type Feedback = {
  feeling: CheckIn;
  rows: FeedbackRow[];
  myths: { myth: Myth; count: number }[];
};

const STEP_IDS = STEPS.map((s) => s.id) as StepId[];
const RESULTS: StepResult[] = ["first-try", "hint", "lighter", "retry", "skipped"];
const MYTH_IDS = Object.keys(MYTHS) as Myth[];

/** What the report card sends. Nothing about the person: no name, no device, no time of day. */
export function toFeedback(r: Report, feeling: CheckIn): Feedback {
  return {
    feeling,
    rows: r.rows.map((x) => ({ step: x.id, result: x.result, seconds: x.seconds, hints: x.hints })),
    myths: r.myths.map((g) => ({ myth: g.myth, count: g.count })),
  };
}

const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Server side: accept only the exact shape above, with every value from a fixed list or a bounded number. */
export function parseFeedback(body: unknown): Feedback | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!isInt(b.feeling, 1, 5)) return null;
  if (!Array.isArray(b.rows) || b.rows.length !== STEP_IDS.length) return null;
  if (!Array.isArray(b.myths) || b.myths.length > MYTH_IDS.length) return null;

  const rows: FeedbackRow[] = [];
  for (const [i, raw] of b.rows.entries()) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (r.step !== STEP_IDS[i]) return null;
    if (!RESULTS.includes(r.result as StepResult)) return null;
    if (r.seconds !== null && !isInt(r.seconds, 0, 6 * 3600)) return null;
    if (!isInt(r.hints, 0, 3)) return null;
    rows.push({
      step: r.step as StepId,
      result: r.result as StepResult,
      seconds: r.seconds as number | null,
      hints: r.hints as number,
    });
  }

  const myths: Feedback["myths"] = [];
  for (const raw of b.myths) {
    if (!raw || typeof raw !== "object") return null;
    const m = raw as Record<string, unknown>;
    if (!MYTH_IDS.includes(m.myth as Myth) || !isInt(m.count, 1, 99)) return null;
    myths.push({ myth: m.myth as Myth, count: m.count as number });
  }

  return { feeling: b.feeling as CheckIn, rows, myths };
}

const RESULT_WORD: Record<StepResult, string> = {
  "first-try": "First try",
  hint: "Used a hint",
  lighter: "Needed the easier version",
  retry: "Took a few tries",
  skipped: "Skipped (knew it)",
};

/** The email, written on the server from checked values only. */
export function feedbackEmail(f: Feedback): { subject: string; text: string } {
  const title = (id: StepId) => STEPS.find((s) => s.id === id)!.title;
  const lines = [
    `Enjoyed it: ${FEELINGS[f.feeling - 1]} (${f.feeling} of 5)`,
    "",
    "Results by step:",
    ...f.rows.map((r) => {
      const time = r.seconds === null ? "" : `, ${r.seconds} s`;
      return `- ${title(r.step)}: ${RESULT_WORD[r.result]}${time}, hints ${r.hints}`;
    }),
    "",
    f.myths.length ? "Mistakes by type:" : "Mistakes: none.",
    ...f.myths.map((m) => `- ${m.count}x ${MYTHS[m.myth].belief} (${m.myth})`),
    "",
    "Sent anonymously from the report card.",
  ];
  return { subject: `Lesson feedback: enjoyed it "${FEELINGS[f.feeling - 1]}"`, text: lines.join("\n") };
}
