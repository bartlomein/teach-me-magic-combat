import { useEffect, useRef } from "react";

/**
 * Cancels a running async sequence (a "Watch it" demo) when a newer one starts,
 * when the learner moves on, or when the step unmounts.
 *
 *   const live = run.begin();
 *   await pause(2000);
 *   if (!live()) return;
 */
export function useRun() {
  const id = useRef(0);
  useEffect(() => {
    const ref = id;
    return () => {
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
  };
}
