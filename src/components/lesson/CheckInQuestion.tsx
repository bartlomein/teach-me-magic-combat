"use client";

import { useState } from "react";
import { FEELINGS, toFeedback } from "@/lib/lesson/feedback";
import type { CheckIn } from "@/lib/lesson/lesson";
import type { Report } from "@/lib/lesson/report";
import { dispatch } from "@/lib/lesson/store";
import { CheckIcon } from "../icons";

/**
 * The check-in, cut to one tap: "Did you enjoy it?" (Marker asks after every
 * test). The first answer also sends the author an anonymous summary of the
 * results by email. It's sent once, so changing your answer doesn't send again.
 */
export function CheckInQuestion({ report, answer }: { report: Report; answer?: CheckIn }) {
  const [status, setStatus] = useState<"idle" | "sent" | "kept">("idle");

  function pick(v: CheckIn) {
    const first = answer === undefined;
    dispatch({ type: "check-in", answer: v });
    if (!first) return;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toFeedback(report, v)),
      keepalive: true, // still goes out if they leave the page right away
    })
      .then((res) => (res.ok ? res.json() : { sent: false }))
      .then((d: { sent?: boolean }) => setStatus(d.sent ? "sent" : "kept"))
      .catch(() => setStatus("kept"));
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Did you enjoy it?" className="flex flex-wrap gap-2">
        {FEELINGS.map((word, i) => {
          const v = (i + 1) as CheckIn;
          const on = answer === v;
          return (
            <button
              key={word}
              type="button"
              aria-pressed={on}
              onClick={() => pick(v)}
              className={`inline-flex min-h-11 items-center gap-1.5 border-2 px-3 text-base font-bold transition-colors ${
                on ? "border-spot bg-spot text-panel" : "border-ink bg-panel text-ink hover:bg-spot-tint"
              }`}
            >
              {on && <CheckIcon className="size-4" />}
              {word}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm text-ink-soft">
        {answer === undefined
          ? "One tap. Your answer and results go to the author, with no name attached."
          : status === "sent"
            ? "Thanks. Sent to the author, with no name attached."
            : "Thanks."}
      </p>
    </div>
  );
}
