"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type Dispatch, type Ref } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";
import { HEAL, healBoard } from "@/lib/lesson/steps";
import { endTurn, resolveCombat, declareAttackers, type Myth } from "@/lib/rules/engine";
import { Board, CardSlot, Row, useBoardFx } from "../board/Board";
import { FeedbackBox, PinKey, Primary, Secondary, type Feedback } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";

const now = () => Date.now();
type Phase = "q1" | "healing" | "q2" | "playing" | "done";
type Fate = "alive" | "dying" | "gone";

/**
 * Step 4: Damage wears off. Predict first, then watch: does Golem keep its 3
 * damage into next turn? (myth M8). The turn ends, the damage fades, and Golem
 * blocks another 3/3 and survives. The lighter version plays the heal first,
 * then asks again.
 */
export function StepHeal({
  lighterNext,
  dispatch,
  onNext,
  nextTitle,
  headingRef,
}: {
  progress: StepProgress;
  lighterNext: boolean;
  dispatch: Dispatch<LessonAction>;
  onNext: () => void;
  nextTitle: string | null;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const fx = useBoardFx();
  const board = healBoard();
  const [phase, setPhase] = useState<Phase>("q1");
  const [q1, setQ1] = useState<"yes" | "no" | null>(null);
  const [q2, setQ2] = useState<"yes" | "no" | null>(null);
  const [golemDamage, setGolemDamage] = useState(3);
  const [boarDamage, setBoarDamage] = useState(0);
  const [boarFate, setBoarFate] = useState<Fate>("alive");
  const [turnEnded, setTurnEnded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announce, setAnnounce] = useState("");

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (phase === "q2" || phase === "done") headlineRef.current?.focus();
  }, [phase]);

  const pinShown = (id: string) => id === "mossGolem" && golemDamage > 0;
  const { cardProps, keyProps } = usePinLinks(HEAL.pins, pinShown, fx.mode === "full");

  function miss(note: string, myth?: Myth) {
    dispatch({ type: "miss", step: "heal", myth, note, at: now() });
    return lighterNext;
  }

  /** The turn ends: a clock mark, then the damage fades away (514.2). */
  async function heal() {
    setPhase("healing");
    setTurnEnded(true);
    await fx.wait(900);
    const after = endTurn(board);
    setGolemDamage(after.creatures.mossGolem.damage);
    setAnnounce("The turn ends. Moss Golem's damage is removed. It's back to full health.");
    await fx.wait(900);
  }

  async function answerQ1(v: "yes" | "no") {
    setQ1(v);
    if (v === "no") {
      setFeedback({ tone: "good", text: "Watch it heal at end of turn." });
      await heal();
      setPhase("q2");
      return;
    }
    const toLighter = miss("Thought damage stays", HEAL.q1.myth);
    setFeedback({ tone: "bad", text: HEAL.q1.wrong });
    if (toLighter) {
      // Lighter version: show the heal, then ask the first question again.
      await heal();
      setGolemDamage(3);
      setTurnEnded(false);
      setQ1(null);
      setFeedback({ tone: "info", text: "You saw it heal. Same question again." });
      setPhase("q1");
    }
  }

  async function answerQ2(v: "yes" | "no") {
    setQ2(v);
    if (v === "no") {
      dispatch({ type: "miss", step: "heal", note: "Thought healed Golem dies to a 3/3", at: now(), soft: true });
      setFeedback({ tone: "bad", text: HEAL.q2.wrong });
    } else setFeedback({ tone: "good", text: "Let's see it." });
    // Either way, play it out so the learner sees it.
    setPhase("playing");
    const s = declareAttackers(endTurn(endTurn(board)), ["thornBoar"]);
    const r = resolveCombat(s, ["thornBoar"], { mossGolem: "thornBoar" });
    await fx.clash([{ attacker: "thornBoar", blocker: "mossGolem", toBlocker: 3, toAttacker: 3 }], () => {
      setGolemDamage(r.state.creatures.mossGolem?.damage ?? 3);
      setBoarDamage(3);
    });
    setBoarFate("dying");
    await fx.wait(fx.mode === "full" ? 900 : 600);
    setBoarFate("gone");
    setAnnounce("Thorn Boar deals 3 to Moss Golem. Moss Golem deals 3 to Thorn Boar. Thorn Boar dies. Moss Golem survives.");
    dispatch({ type: "complete", step: "heal", at: now() });
    setFeedback({ tone: "good", text: HEAL.win });
    setPhase("done");
  }

  function replay() {
    setPhase("q1");
    setQ1(null);
    setQ2(null);
    setGolemDamage(3);
    setBoarDamage(0);
    setBoarFate("alive");
    setTurnEnded(false);
    setFeedback(null);
    fx.clearFx();
  }

  const headline =
    phase === "q1" ? HEAL.q1.question : phase === "q2" || phase === "playing" ? HEAL.q2.question : phase === "done" ? "Step complete" : HEAL.headline;

  return (
    <StepFrame
      n={4}
      title="Damage wears off"
      headingRef={headingRef}
      headline={headline}
      headlineRef={headlineRef}
      speak={phase === "q1" ? `${HEAL.speak} ${HEAL.q1.question}` : headline}
      howTo={phase === "q1" ? "Golem took 3 damage this turn. Predict first." : undefined}
      board={
        <Board
          scope={fx.scope}
          layer={fx.layer}
          className="border-y-[3px] border-ink lg:border-y-0"
          between={
            turnEnded ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 border-2 border-ink bg-hi px-3 py-1 text-sm font-bold"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" strokeLinecap="round" />
                </svg>
                {phase === "healing" || phase === "q2" ? "End of turn: damage heals" : "Next turn"}
              </motion.span>
            ) : null
          }
          caption={
            <>
              {golemDamage > 0 ? "Golem has 3 damage marked." : "A new turn. Golem is fully healed."}
            </>
          }
          opp={
            <Row side="opp" life={20}>
              <CardSlot
                fate={boarFate}
                card={CARDS.thornBoar as CardDef}
                status={phase === "playing" || phase === "done" ? "attacking" : null}
                tapped={phase === "playing" || phase === "done"}
                damage={boarDamage}
              />
            </Row>
          }
          you={
            <Row side="you" life={20}>
              <CardSlot
                card={CARDS.mossGolem as CardDef}
                status={phase === "playing" || phase === "done" ? "blocking" : null}
                damage={golemDamage}
                {...cardProps("mossGolem")}
              />
            </Row>
          }
        />
      }
      actions={
        <>
          {phase === "q1" && (
            <Choice
              options={[
                { value: "yes", label: "Yes, 3 damage" },
                { value: "no", label: "No, fully healed" },
              ]}
              answered={q1}
              correct="no"
              onAnswer={answerQ1}
            />
          )}
          {phase === "q2" && (
            <Choice
              options={[
                { value: "yes", label: "Yes, it survives" },
                { value: "no", label: "No, it dies" },
              ]}
              answered={q2}
              correct="yes"
              onAnswer={answerQ2}
            />
          )}
          {phase === "done" && (
            <>
              {nextTitle && <Primary onClick={onNext}>Next: {nextTitle}</Primary>}
              <Secondary onClick={replay}>Play again</Secondary>
            </>
          )}
        </>
      }
      below={
        <>
          <FeedbackBox feedback={feedback} />
          <PinKey {...keyProps} />
        </>
      }
      announce={announce}
    />
  );
}
