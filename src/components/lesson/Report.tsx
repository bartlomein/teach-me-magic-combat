"use client";

import { useRouter } from "next/navigation";
import { useEffect, ViewTransition, type ReactNode } from "react";
import { STEPS, stepHref } from "@/lib/lesson/lesson";
import { buildReport, type ReportRow } from "@/lib/lesson/report";
import { dispatch, useLesson } from "@/lib/lesson/store";
import { BulbIcon, CheckIcon, CrossIcon, LockIcon } from "../icons";
import { OnSpot, Primary } from "./Coach";
import { Lesson2Demo } from "./Lesson2Demo";
import { useArrivalFocus } from "./useArrivalFocus";


/**
 * The report card, modeled on Marker's own report: a result per step, mistakes
 * grouped by myth with the rule that fixes each one, strengths and needs, how
 * you got there. Then a look at what comes next.
 */
export function Report() {
  const router = useRouter();
  const { lesson, ready } = useLesson();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();
  const r = buildReport(lesson);
  const nextPractice = r.practice[0];

  useEffect(() => {
    if (nextPractice) router.prefetch(stepHref(nextPractice));
  }, [router, nextPractice]);

  if (!ready) return <div aria-hidden className="min-h-[70vh]" />;
  if (!r.complete)
    return (
      <section className="border-[3px] border-ink bg-panel p-6 sm:p-10">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-extrabold tracking-[-0.02em]">
          Your report card shows up when you finish the lesson.
        </h1>
        <Primary className="mt-6" onClick={() => router.push("/", { transitionTypes: ["nav-back"] })}>
          Back to the start
        </Primary>
      </section>
    );

  const total = STEPS.length;
  const open = r.myths.filter((g) => !g.fixed);
  const fixed = r.myths.filter((g) => g.fixed);
  const fixedCount = fixed.reduce((n, g) => n + g.count, 0);
  const summary =
    r.clean === total
      ? "Every step right the first time."
      : `${r.clean} of ${total} steps right the first time.${r.fixedByPractice ? ` ${r.fixedByPractice} more fixed with practice.` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="report-title" className="border-[3px] border-ink bg-panel">
        <ViewTransition name="task-band" share="morph" default="none">
          <div className="on-spot flex flex-col gap-5 bg-spot p-5 text-panel sm:p-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <h1
                id="report-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-[clamp(2rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]"
              >
                Your report card
              </h1>
              <p className="text-xl font-bold">{summary}</p>
              <p className="text-base text-panel/85">
                Hints used: {r.hintsUsed}. Mistakes along the way: {r.totalMistakes}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {r.practice.length > 0 && (
                <OnSpot primary onClick={() => router.push(stepHref(r.practice[0]), { transitionTypes: ["nav-back"] })}>
                  Practice what you missed
                </OnSpot>
              )}
              <OnSpot
                onClick={() => {
                  dispatch({ type: "restart" });
                  router.push("/", { transitionTypes: ["nav-back"] });
                }}
              >
                Start over
              </OnSpot>
            </div>
          </div>
        </ViewTransition>

        <div className="grid grid-cols-[minmax(0,1fr)] border-t-[3px] border-ink lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Results by step */}
          <figure className="flex flex-col gap-3 p-5 sm:p-6 lg:border-r-[3px] lg:border-ink">
            <h2 className="text-xl font-bold tracking-[-0.01em]">Results by step</h2>
            <div className="overflow-x-auto">
              <table className="report-table w-full sm:min-w-[26rem] border-collapse">
                <thead>
                  <tr>
                    <th scope="col">Step</th>
                    <th scope="col">Result</th>
                    <th scope="col" className="hidden sm:table-cell">Hints</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row, i) => (
                    <tr key={row.id}>
                      <th scope="row" className="font-bold">
                        <span className="mr-2 inline-grid size-6 place-items-center rounded-full border-2 border-ink text-xs">{i + 1}</span>
                        {row.title}
                      </th>
                      <td>
                        <ResultMark row={row} />
                      </td>
                      <td className="hidden tabular-nums sm:table-cell">{row.result === "skipped" ? "–" : row.hints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>

          {/* Mistakes by myth */}
          <section aria-labelledby="myths-title" className="flex flex-col gap-3 border-t-[3px] border-ink p-5 sm:p-6 lg:border-t-0">
            <h2 id="myths-title" className="text-xl font-bold tracking-[-0.01em]">
              Mistakes by type
            </h2>
            {r.myths.length === 0 ? (
              <p className="flex items-center gap-3 bg-ok-tint p-3.5 text-base">
                <Badge className="bg-ok text-panel">
                  <CheckIcon className="size-3.5" />
                </Badge>
                <span>
                  <b className="text-ok">No mistakes.</b> A clean run.
                </span>
              </p>
            ) : (
              <>
                {/* Still open: the step is still on the To practice list. Shown in full: this is what's left to learn. */}
                {open.length > 0 && (
                  <ul className="flex flex-col">
                    {open.map((g) => (
                      <li key={g.myth} className="flex flex-col gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0">
                        <p className="font-bold">
                          {g.belief}
                          {g.count > 1 && <span className="ml-2 bg-miss-tint px-1.5 text-sm font-extrabold text-miss tabular-nums">{g.count}×</span>}
                        </p>
                        <p className="text-ink-soft">
                          <span className="font-bold text-ink">Rule:</span> {g.rule}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Fixed since: one line, details on request. */}
                {fixed.length > 0 && (
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 bg-ok-tint px-3.5 font-bold [&::-webkit-details-marker]:hidden">
                      <Badge className="bg-ok text-panel">
                        <CheckIcon className="size-3.5" />
                      </Badge>
                      <span className="text-ok">
                        Fixed since: {fixedCount} mistake{fixedCount > 1 ? "s" : ""}
                      </span>
                      <span className="ml-auto text-sm text-ink-soft group-open:hidden">Show</span>
                      <span className="ml-auto hidden text-sm text-ink-soft group-open:inline">Hide</span>
                    </summary>
                    <ul className="flex flex-col gap-1.5 px-3.5 pt-3 text-ink-soft">
                      {fixed.map((g) => (
                        <li key={g.myth}>
                          {g.belief}
                          {g.count > 1 && <span className="tabular-nums"> ({g.count}×)</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </section>
        </div>

        {/* Strengths and needs */}
        <div className="grid grid-cols-[minmax(0,1fr)] border-t-[3px] border-ink md:grid-cols-2">
          <Column title="Strengths">
            {r.strengths.length ? <List items={r.strengths} mark={<CheckIcon className="size-3.5" />} tone="bg-ok text-panel" /> : <Empty>Keep going. These build up.</Empty>}
          </Column>
          <Column title="To practice" className="border-t-[3px] border-ink md:border-t-0 md:border-l-[3px]">
            {r.needs.length ? <List items={r.needs} mark={<CrossIcon className="size-3.5" />} tone="bg-miss text-panel" /> : <Empty>Nothing left. You&apos;re ready for Lesson 2.</Empty>}
          </Column>
        </div>
      </section>

      <NextLessons />
    </div>
  );
}

const FIRST_TRY = {
  "first-try": { icon: <CheckIcon className="size-3.5" />, tone: "bg-ok text-panel", word: "First try" },
  hint: { icon: <BulbIcon className="size-3.5" />, tone: "bg-hi text-ink", word: "Used a hint" },
  retry: { icon: <CrossIcon className="size-3.5" />, tone: "bg-miss text-panel", word: "Took a few tries" },
  lighter: { icon: <CrossIcon className="size-3.5" />, tone: "bg-miss text-panel", word: "Needed the easier version" },
  skipped: { icon: <CheckIcon className="size-3.5" />, tone: "bg-ink text-panel", word: "Skipped, you knew it" },
} as const;

/** The grey history line under a practiced step: what happened before practice. */
const AT_FIRST: Record<ReportRow["result"], string> = {
  "first-try": "Right at first",
  hint: "Needed a hint at first",
  retry: "Missed it at first",
  lighter: "Needed the easier version at first",
  skipped: "Skipped at first",
};

/**
 * The mark shows where you are now; the first try stays underneath as history.
 * Practiced clean: a green check and "Got it". Practiced with a miss: "Still practicing".
 */
function ResultMark({ row }: { row: ReportRow }) {
  const first = FIRST_TRY[row.result];
  const now =
    row.practiced === "clean"
      ? { icon: <CheckIcon className="size-3.5" />, tone: "bg-ok text-panel", word: "Got it" }
      : row.practiced === "missed"
        ? { icon: <CrossIcon className="size-3.5" />, tone: "bg-miss text-panel", word: "Still practicing" }
        : first;
  return (
    <span className="flex items-center gap-2">
      <Badge className={now.tone}>{now.icon}</Badge>
      <span className="flex flex-col">
        <span>
          {now.word}
        </span>
        {row.practiced && <span className="text-sm text-ink-soft">{AT_FIRST[row.result]}</span>}
      </span>
    </span>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full ${className}`}>
      {children}
    </span>
  );
}

function Column({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 p-5 sm:p-6 ${className}`}>
      <h2 className="text-xl font-bold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  );
}

function List({ items, mark, tone }: { items: string[]; mark: ReactNode; tone: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-2.5 text-base">
          <Badge className={tone}>{mark}</Badge>
          {t}
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-base text-ink-soft">{children}</p>;
}

/** What comes next: Lesson 2 with a short demo, Lesson 3 named. Both locked. */
function NextLessons() {
  return (
    <section aria-labelledby="next-title" className="border-[3px] border-ink bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-ink px-5 py-4 sm:px-6">
        <h2 id="next-title" className="text-xl font-bold tracking-[-0.01em]">
          Coming next: Lesson 2, Combat tricks
        </h2>
        <ComingSoon />
      </div>
      <div className="p-5 sm:p-6">
        <Lesson2Demo />
      </div>
    </section>
  );
}

function ComingSoon() {
  return (
    <span className="inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5 text-sm font-bold">
      <LockIcon className="size-4" />
      Coming soon
    </span>
  );
}
