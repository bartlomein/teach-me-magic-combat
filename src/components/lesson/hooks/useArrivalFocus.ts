"use client";

import { useEffect, useRef } from "react";

let firstScreen = true;

export function useArrivalFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (firstScreen) {
      // Flip after this tick: React's dev double-run must also see the first screen.
      setTimeout(() => {
        firstScreen = false;
      }, 0);
      return;
    }
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
