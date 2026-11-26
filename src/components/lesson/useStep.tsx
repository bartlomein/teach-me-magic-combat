"use client";

import type { Dispatch, Ref } from "react";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";

/** What every step screen gets from the lesson (see StepScreen). */
export type StepProps = {
  progress: StepProgress;
  /** True when one more miss switches on the lighter board (from the lesson reducer). */
  lighterNext: boolean;
  dispatch: Dispatch<LessonAction>;
  onNext: () => void;
  nextTitle: string | null;
  /** The lesson focuses this heading when the step opens. */
  headingRef: Ref<HTMLHeadingElement>;
};
