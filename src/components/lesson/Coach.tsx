"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { BulbIcon, CheckIcon, CrossIcon, InfoIcon, SpeakerIcon } from "../icons";

export function Speak({
  text,
  label = "Read aloud",
  onSpot = false,
}: {
  text: string;
  label?: string;
  onSpot?: boolean;
}) {
  const spoke = useRef(false);
  // Only stops the voice if this button started it.
  useEffect(
    () => () => {
      if (spoke.current) window.speechSynthesis?.cancel();
    },
    [],
  );
  function say() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    spoke.current = true;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  return (
    <button
      type="button"
      onClick={say}
      aria-label={label}
      title={label}
      className={`grid size-11 shrink-0 place-items-center border-2 transition-colors ${
        onSpot
          ? "border-panel/70 text-panel hover:bg-panel hover:text-spot"
          : "border-ink text-ink hover:bg-ink hover:text-panel"
      }`}
    >
      <SpeakerIcon className="size-5" />
    </button>
  );
}

export type Feedback = { tone: "good" | "bad" | "info"; text: string; n?: number };

const TONE = {
  good: { box: "bg-ok-tint", badge: "bg-ok", word: "text-ok", label: "Right", icon: <CheckIcon className="size-3.5" /> },
  bad: { box: "bg-miss-tint", badge: "bg-miss", word: "text-miss", label: "Not quite", icon: <CrossIcon className="size-3.5" /> },
  info: { box: "bg-spot-tint", badge: "bg-spot", word: "text-spot", label: "Note", icon: <InfoIcon className="size-3.5" /> },
};

export const FEEDBACK_OPEN_MS = 300;

// Always mounted so aria-live announces each new message.
export function FeedbackBox({ feedback }: { feedback: Feedback | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {feedback && (
          // Opens smoothly so what's below slides down instead of jumping.
          <motion.div
            key="feedback"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: FEEDBACK_OPEN_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              key={`${feedback.n ?? 0}:${feedback.text}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-start gap-3 p-3.5 ${TONE[feedback.tone].box}`}
            >
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-panel ${TONE[feedback.tone].badge}`}>
                {TONE[feedback.tone].icon}
              </span>
              <p className="flex-1 text-base">
                <span className={`font-bold ${TONE[feedback.tone].word}`}>{TONE[feedback.tone].label}. </span>
                {feedback.text}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HintButton({ level, total, onMore }: { level: number; total: number; onMore: () => void }) {
  if (level >= total) return null;
  return (
    <Secondary onClick={onMore}>
      <BulbIcon className="size-4" />
      {level === 0 ? "Hint" : "Another hint"}
      <span className="sr-only">
        ({level + 1} of {total})
      </span>
    </Secondary>
  );
}

export function HintText({ level, hints }: { level: number; hints: readonly string[] }) {
  return (
    <div aria-live="polite">
      {level > 0 && (
        <p className="flex items-start gap-2.5 text-base">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center bg-hi">
            <BulbIcon className="size-4" />
          </span>
          <span>{hints[level - 1]}</span>
        </p>
      )}
    </div>
  );
}

export function PinMark({ letter, className = "" }: { letter: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-[26px] shrink-0 place-items-center rounded-full bg-ink text-[13px] font-extrabold text-panel ${className}`}
    >
      {letter}
    </span>
  );
}

export function PinKey({
  pins,
  active = null,
  onHover,
  onTap,
}: {
  pins: readonly { letter: string; text: string }[];
  active?: string | null;
  onHover?: (letter: string | null) => void;
  onTap?: (letter: string) => void;
}) {
  if (pins.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-sm font-bold text-ink-soft">Key</h3>
      <ul className="flex flex-col gap-1.5 text-[15px] leading-snug">
        {pins.map((p) => (
          <li key={p.letter} id={`key-${p.letter}`} data-state={active === null ? undefined : active === p.letter ? "active" : "dim"} className="key-row">
            <button
              type="button"
              className="flex w-full items-start gap-2.5 text-left"
              onPointerEnter={(e) => e.pointerType !== "touch" && onHover?.(p.letter)}
              onPointerLeave={(e) => e.pointerType !== "touch" && onHover?.(null)}
              onFocus={() => onHover?.(p.letter)}
              onBlur={() => onHover?.(null)}
              onClick={() => onTap?.(p.letter)}
            >
              <PinMark letter={p.letter} className="key-pin" />
              <span className="pt-0.5">{p.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BtnProps = React.ComponentProps<"button"> & { children: ReactNode };

const BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 border-2 px-5 font-bold transition-colors disabled:cursor-not-allowed disabled:border-rule disabled:bg-panel disabled:text-ink-soft/70 disabled:line-through disabled:decoration-1";

export function Primary({ children, className = "", ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} className={`${BTN} border-ink bg-ink text-panel enabled:hover:border-spot enabled:hover:bg-spot ${className}`}>
      {children}
    </button>
  );
}

export function Secondary({ children, className = "", ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} className={`${BTN} border-ink bg-panel text-ink enabled:hover:bg-spot-tint ${className}`}>
      {children}
    </button>
  );
}

export function OnSpot({ children, className = "", primary = false, ...rest }: BtnProps & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`${BTN} ${primary ? "border-panel bg-panel text-spot enabled:hover:bg-spot-tint" : "border-panel/80 bg-transparent text-panel enabled:hover:bg-panel/15"} disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
