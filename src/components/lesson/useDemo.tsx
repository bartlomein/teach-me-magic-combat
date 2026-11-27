import { useState } from "react";
import { OnSpot } from "./Coach";
import type { Beat, StepCore } from "./useStep";

type DemoPhase = "explain" | "watch" | "pick";

export function useDemo<P extends string>(
  core: StepCore<P> & (DemoPhase extends P ? unknown : never),
  reset: () => void,
  script: (beat: Beat) => Promise<void>,
) {
  const [watched, setWatched] = useState(false);
  const to = (p: DemoPhase) => core.setPhase(p as P);

  async function watch() {
    reset();
    core.setFeedback(null);
    to("watch");
    if (!(await core.sequence(script))) return;
    setWatched(true);
    to("explain");
  }

  function startTry() {
    core.run.cancel();
    reset();
    core.setFeedback(null);
    to("pick");
  }

  function backToFull() {
    core.clearLighter();
    reset();
    core.setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    to("pick");
  }

  const watching = core.phase === "watch";
  const explaining = core.phase === "explain" || watching;
  const label = watching ? "Watching…" : watched ? "Watch again" : "Watch it";
  const bandActions = explaining ? (
    watched ? (
      <>
        <OnSpot primary onClick={startTry} disabled={watching}>
          Try it
        </OnSpot>
        <OnSpot onClick={watch} disabled={watching}>
          {label}
        </OnSpot>
      </>
    ) : (
      <>
        <OnSpot primary onClick={watch} disabled={watching}>
          {label}
        </OnSpot>
        <OnSpot onClick={startTry} disabled={watching}>
          Skip to try
        </OnSpot>
      </>
    )
  ) : undefined;

  return { watch, startTry, backToFull, explaining, bandActions };
}
