"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { direction, stepFromSlug, stepHref, STEPS } from "@/lib/lesson/lesson";
import { useLesson } from "@/lib/lesson/store";
import { CheckIcon, LockIcon } from "../icons";

/**
 * The five steps as printed tabs, each a real link. Finished steps can be
 * reviewed; later ones stay locked. On a phone only the current step keeps its
 * name; the rest show numbers. Lives in the /learn layout, so it stays put
 * while the step below it slides.
 */
export function StepNav() {
  const { lesson } = useLesson();
  const slug = usePathname().split("/")[2] ?? "";
  const here = stepFromSlug(slug) ?? "attack";

  return (
    <nav aria-label="Lesson steps" style={{ viewTransitionName: "step-nav" }}>
      <ol className="flex border-b-2 border-ink md:grid md:grid-cols-5">
        {STEPS.map((s, i) => {
          const p = lesson.steps[s.id];
          const current = here === s.id;
          const locked = p.status === "locked";
          const skipped = p.status === "skipped";
          const done = p.status === "done" || skipped;
          const word = current ? "current step" : skipped ? "skipped, you knew it" : done ? "done" : locked ? "locked" : "open";
          const className = `flex min-h-12 w-full items-center gap-2 px-2 py-2.5 text-left text-[15px] font-semibold transition-colors max-md:justify-center ${
            current
              ? "text-ink shadow-[inset_0_-5px_0_var(--spot)]"
              : locked
                ? "cursor-not-allowed text-ink-soft"
                : done
                  ? "text-ink hover:bg-spot-tint"
                  : "text-ink-soft hover:bg-spot-tint"
          }`;
          const inner = (
            <>
              <span
                aria-hidden
                className={`grid size-[26px] shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                  current ? "border-spot bg-spot text-panel" : done ? "border-ink bg-ink text-panel" : "border-current"
                }`}
              >
                {done ? <CheckIcon className="size-3.5" /> : locked ? <LockIcon className="size-3.5" /> : i + 1}
              </span>
              <span className={`truncate max-md:text-[14px] ${current ? "" : "max-md:sr-only"}`}>{s.title}</span>
              <span className="sr-only">, {word}</span>
            </>
          );
          return (
            <li key={s.id} className={`flex ${current ? "min-w-0 flex-1" : "max-md:w-11 max-md:shrink-0"}`}>
              {locked ? (
                // A locked step is not a link: nothing to follow yet.
                <span role="link" aria-disabled="true" className={className}>
                  {inner}
                </span>
              ) : (
                <Link
                  href={stepHref(s.id)}
                  aria-current={current ? "step" : undefined}
                  transitionTypes={[direction(here, s.id)]}
                  className={className}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
