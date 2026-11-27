import { render } from "@testing-library/react";
import { useReducer, useRef, type ComponentType } from "react";
import { initialLesson, lessonReducer, nextMissGoesLighter, type LessonState, type StepId } from "@/lib/lesson/lesson";
import { MotionProvider } from "@/lib/motion-pref";
import type { StepProps } from "@/components/lesson/steps/hooks/useStep";

export function renderStep(step: StepId, Body: ComponentType<StepProps>) {
  // Effects off: animations finish at once.
  localStorage.setItem("teachme.motion", "off");
  const seen: { state: LessonState; next: number } = { state: openStep(step), next: 0 };

  function Harness() {
    const [state, dispatch] = useReducer(lessonReducer, seen.state);
    seen.state = state;
    const headingRef = useRef<HTMLHeadingElement>(null);
    return (
      <MotionProvider>
        <Body
          headingRef={headingRef}
          progress={state.steps[step]}
          lighterNext={nextMissGoesLighter(state, step)}
          dispatch={dispatch}
          onNext={() => seen.next++}
          nextTitle="Next step"
        />
      </MotionProvider>
    );
  }

  const view = render(<Harness />);
  return { ...view, lesson: () => seen.state, nextClicks: () => seen.next };
}

function openStep(step: StepId): LessonState {
  const s = lessonReducer(initialLesson(), { type: "start", experience: "new", at: 0 });
  return { ...s, steps: { ...s.steps, [step]: { ...s.steps[step], status: "open", startedAt: 0 } } };
}
