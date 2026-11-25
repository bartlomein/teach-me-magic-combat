"use client";

import { setMotionMode, useMotionMode, type MotionMode } from "@/lib/motion-pref";

const OPTIONS: { value: MotionMode; label: string; hint: string }[] = [
  { value: "full", label: "Full", hint: "All effects" },
  { value: "calm", label: "Calm", hint: "Fades only" },
  { value: "off", label: "Off", hint: "No animation" },
];

/** A native radio group: arrow keys, labels and screen-reader support for free. */
export function MotionToggle() {
  const mode = useMotionMode();
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Motion</legend>
      <span aria-hidden className="text-sm font-medium text-ink-soft max-sm:sr-only">
        Motion
      </span>
      <div className="flex border border-rule bg-panel">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            title={o.hint}
            className="relative min-h-11 min-w-12 cursor-pointer px-2.5 text-center text-[13px] leading-11 font-semibold text-ink-soft transition-colors hover:bg-spot-tint has-[:checked]:bg-spot-tint has-[:checked]:text-spot has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spot"
          >
            <input
              type="radio"
              name="motion"
              value={o.value}
              checked={mode === o.value}
              onChange={() => setMotionMode(o.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {o.label}
            <span className="sr-only">: {o.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
