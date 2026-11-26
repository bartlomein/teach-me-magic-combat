"use client";

import { useSyncExternalStore } from "react";
import { initialLesson, isLessonState, lessonReducer, type LessonAction, type LessonState } from "./lesson";

const KEY = "teach-me:lesson:v2";
const listeners = new Set<() => void>();
const SERVER = initialLesson();
let state: LessonState | null = null;

function load(): LessonState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (isLessonState(saved)) return saved;
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
    /* storage full or blocked: keep going without saving */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
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

/** `ready` is false during server render and hydration. */
export function useLesson(): { lesson: LessonState; ready: boolean } {
  const lesson = useSyncExternalStore(subscribe, current, () => SERVER);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return { lesson, ready };
}

let arrival: string | null = null;
export const markArrival = (kind: string) => {
  arrival = kind;
};
export const takeArrival = () => {
  const a = arrival;
  arrival = null;
  return a;
};
