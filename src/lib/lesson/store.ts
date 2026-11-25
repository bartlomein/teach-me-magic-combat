"use client";

/**
 * One lesson state for the whole app, saved in localStorage so the URL, the
 * Back button and a page refresh all keep your place.
 *
 * The rules of the flow stay in the pure `lessonReducer`; this file only holds
 * the current value and tells React when it changes (useSyncExternalStore).
 */
import { useSyncExternalStore } from "react";
import { initialLesson, lessonReducer, type LessonAction, type LessonState } from "./lesson";

const KEY = "teach-me:lesson:v1";
const listeners = new Set<() => void>();
const SERVER = initialLesson();
let state: LessonState | null = null;

function load(): LessonState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as LessonState;
      // Old or partial saves fall back to a fresh lesson instead of crashing.
      if (saved?.steps?.attack && Array.isArray(saved.mistakes)) return saved;
    }
  } catch {
    /* private mode or bad JSON: start fresh */
  }
  return initialLesson();
}

function current(): LessonState {
  if (state === null) state = load();
  return state;
}

export function dispatch(action: LessonAction) {
  state = lessonReducer(current(), action);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the lesson still works, it just won't survive a refresh */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  // Another tab changed the lesson: pick it up.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** The lesson, plus whether we've read the saved copy yet (false during server render and hydration). */
export function useLesson(): { lesson: LessonState; ready: boolean } {
  const lesson = useSyncExternalStore(subscribe, current, () => SERVER);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return { lesson, ready };
}

// ---------------------------------------------------------------------------
// How the learner arrived on a screen, for one-off entrance choreography (the
// basics screen "assembles" into the Step 1 board). Read once, then cleared.
// ---------------------------------------------------------------------------
let arrival: string | null = null;
export const markArrival = (kind: string) => {
  arrival = kind;
};
export const takeArrival = () => {
  const a = arrival;
  arrival = null;
  return a;
};
