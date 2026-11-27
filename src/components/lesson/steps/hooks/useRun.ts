import { useEffect, useRef } from "react";

/**
 * Keeps async work (animations, scripted demos) from acting once it's stale:
 * `begin()` returns a check that fails when a newer run starts or the step unmounts,
 * and `mounted()` says whether the step is still on screen at all.
 */
export function useRun() {
  const id = useRef(0);
  const on = useRef(true);
  useEffect(() => {
    on.current = true;
    const ref = id;
    return () => {
      on.current = false;
      ref.current++;
    };
  }, []);
  return {
    begin() {
      const mine = ++id.current;
      return () => id.current === mine;
    },
    cancel() {
      id.current++;
    },
    mounted: () => on.current,
  };
}
