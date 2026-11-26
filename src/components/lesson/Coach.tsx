"use client";

import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { BulbIcon, CheckIcon, CrossIcon, InfoIcon, SpeakerIcon } from "../icons";

/**
 * The "coach" side of a step: short text, read-aloud, feedback and hints.
 * Text stays tiny on purpose (Marker: measure the skill, not the reading).
 */

/** Reads text out loud with the browser's own voice. No network, no keys. */
export function Speak({
  text,
  label = "Read aloud",
  onSpot = false,
}: {
  text: string;
  label?: string;
  /** Sits on the blue task band. */
  onSpot?: boolean;
}) {
  const spoke = useRef(false);
  // Leaving the step stops the voice (only if this button started it).
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

/** `n`: set per message, so the same words said twice still show (and are read) again. */
export type Feedback = { tone: "good" | "bad" | "info"; text: string; n?: number };

const TONE = {
  good: { box: "bg-ok-tint", badge: "bg-ok", word: "text-ok", label: "Right", icon: <CheckIcon className="size-3.5" /> },
  bad: { box: "bg-miss-tint", badge: "bg-miss", word: "text-miss", label: "Not quite", icon: <CrossIcon className="size-3.5" /> },
  info: { box: "bg-spot-tint", badge: "bg-spot", word: "text-spot", label: "Note", icon: <InfoIcon className="size-3.5" /> },
};

/**
 * Always mounted, so screen readers announce each new message (aria-live).
 * Tone is shown by a word and an icon, not color alone.
 */
export function FeedbackBox({ feedback }: { feedback: Feedback | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {feedback && (
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
      )}
    </div>
  );
}

/** Hints come in three levels: nudge, point, then highlight on the board. */
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

/** The latest hint's text, marked with a highlighter square. */
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

/** A pin's letter, as printed on the board and in the Key. */
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

/**
 * The Key under the actions: explains each lettered pin on the board. Linked to
 * the board both ways: pointing at a row lights up its card, and pointing at a
 * pinned card sweeps a highlighter across its row.
 */
export function PinKey({
  pins,
  active = null,
  onHover,
  onTap,
}: {
  pins: readonly { letter: string; text: string }[];
  /** Letter of the pin currently in focus, if any. */
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
            {/* A button, so keyboard users can light up the card it's about, like a tap does. */}
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

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

const BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 border-2 px-5 font-bold transition-colors disabled:cursor-not-allowed disabled:border-rule disabled:bg-panel disabled:text-ink-soft/70 disabled:line-through disabled:decoration-1";

/** Primary: solid ink, the one thing to do next. */
export function Primary({ children, className = "", ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} className={`${BTN} border-ink bg-ink text-panel enabled:hover:border-spot enabled:hover:bg-spot ${className}`}>
      {children}
    </button>
  );
}

/** Secondary: an outlined, printed box. */
export function Secondary({ children, className = "", ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} className={`${BTN} border-ink bg-panel text-ink enabled:hover:bg-spot-tint ${className}`}>
      {children}
    </button>
  );
}

/** For use on the blue task band. */
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
