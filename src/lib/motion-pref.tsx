"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type MotionMode = "full" | "calm" | "off";

const KEY = "teachme.motion";
const EVENT = "teachme:motion";

let memory: string | null = null;

function read(): MotionMode {
  let saved = memory;
  try {
    saved = localStorage.getItem(KEY) ?? memory;
  } catch {}
  if (saved === "full" || saved === "calm" || saved === "off") return saved;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "calm" : "full";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useMotionMode(): MotionMode {
  // Server render assumes "full"; the client snapshot corrects it before paint.
  return useSyncExternalStore(subscribe, read, () => "full");
}

export function setMotionMode(mode: MotionMode) {
  memory = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const mode = useMotionMode();

  useEffect(() => {
    document.documentElement.dataset.motion = mode;
  }, [mode]);

  return (
    <MotionConfig
      reducedMotion={mode === "full" ? "never" : "always"}
      transition={mode === "off" ? { duration: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  );
}
