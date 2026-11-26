import { useEffect, useRef } from "react";

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
