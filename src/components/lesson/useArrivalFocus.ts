"use client";

import { useEffect, useRef } from "react";

// The very first screen of a visit keeps the browser's normal focus. Every
// screen after that (a navigation) moves focus to its heading, so keyboard and
// screen-reader users start at the top of the new content.
let firstScreen = true;

export function useArrivalFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (firstScreen) {
      // Flip after this tick: React's dev double-run of effects happens
      // synchronously, and must also see "first screen" (no focus jump on load).
      setTimeout(() => {
        firstScreen = false;
      }, 0);
      return;
    }
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
