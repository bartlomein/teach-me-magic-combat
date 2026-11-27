"use client";

import { animate, stagger } from "motion/react";
import { useLayoutEffect, useMemo, useState } from "react";
import { CARDS } from "@/lib/cards";
import { takeArrival } from "@/lib/lesson/store";
import {
  ATTACK,
  attackBoard,
  attackLighterBoard,
  checkAttackers,
  checkPick,
} from "@/lib/lesson/step-attack";
import { declareAttackers, resolveCombat, type Creature } from "@/lib/rules/engine";
import { AttackArrow, Board, Row } from "../board/Board";
import { Card } from "../Card";
import { HintButton, HintText, PinKey, Primary } from "./Coach";
import { StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";
import { sides, useDemo, useStep, type StepProps } from "./useStep";

type Phase = "explain" | "watch" | "pick" | "resolving" | "done";

export function StepAttack(props: StepProps) {
  const { onNext, nextTitle, headingRef } = props;
  const step = useStep<Phase>("attack", props, "explain", ["pick", "done", "explain"]);
  const { fx, phase, setPhase, feedback, setFeedback, lighter } = step;

  // Before paint so cards never flash in; no cleanup on purpose (dev double-run would freeze them mid-deal).
  useLayoutEffect(() => {
    if (takeArrival() !== "assemble" || fx.mode === "off") return;
    const els = ["mossGolem", "stormHawk"]
      .map((id) => document.querySelector<HTMLElement>(`[data-card-id="${id}"]`))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    els.forEach((el) => (el.style.opacity = "0"));
    animate(
      els,
      fx.mode === "full"
        ? { opacity: [0, 1], y: [-28, 0], rotate: [-6, 0], scale: [1.05, 1] }
        : { opacity: [0, 1] },
      { delay: stagger(0.14, { startDelay: 0.45 }), duration: 0.65, ease: [0.16, 1, 0.3, 1] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const board = useMemo(() => (lighter ? attackLighterBoard() : attackBoard()), [lighter]);

  const [selected, setSelected] = useState<string[]>([]);
  const [tapped, setTapped] = useState<string[]>([]);
  const [attacking, setAttacking] = useState<string[]>([]);
  const [oppLife, setOppLife] = useState(20);
  const [flagged, setFlagged] = useState<string | null>(null);
  const [lighterPassed, setLighterPassed] = useState(false);

  const { theirs, yours } = sides(board);
  const hintOn = step.hints >= 3 && phase === "pick" && !lighter;

  function namePin(message: string, c: Creature) {
    const pin = lighter ? undefined : ATTACK.pins.find((p) => p.id === c.id)?.letter;
    return pin ? message.replace(c.name, `${c.name} (${pin})`) : message;
  }

  function resetBoard() {
    setFlagged(null);
    setSelected([]);
    setTapped([]);
    setAttacking([]);
    setOppLife(20);
    setLighterPassed(false);
    fx.clearFx();
  }

  const demo = useDemo(step, resetBoard, async (beat) => {
    step.setAnnounce("");
    await beat(fx.wait(300));
    setTapped(["emberPup"]);
    setAttacking(["emberPup"]);
    await beat(fx.wait(650));
    await beat(fx.hitPlayer([{ id: "emberPup", amount: 2 }], "opp", () => setOppLife(18)));
    step.setAnnounce("Ember Pup turns sideways to attack, and hits your opponent for 2. Their life goes from 20 to 18.");
    await beat(fx.wait(1200));
  });
  const { explaining } = demo;

  function onCard(c: Creature) {
    if (phase === "pick") {
      const v = checkPick(board, c.id);
      if (!v.ok) {
        fx.nope(c.id);
        const text = namePin(v.message, c);
        const toLighter = step.wrong(`Tried to attack with ${c.name}`, { message: text, myth: v.myth });
        if (toLighter) resetBoard();
        else setFlagged(c.id);
        return;
      }
      if (lighter) {
        setSelected([c.id]);
        setLighterPassed(true);
        setFeedback({
          tone: "good",
          text: `${c.name} has been here since last turn, so it can attack.`,
        });
        return;
      }
      setFeedback(null);
      setFlagged(null);
      setSelected((s) =>
        s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id],
      );
      return;
    }
  }

  async function confirmAttackers() {
    const v = checkAttackers(board, selected);
    if (!v.ok) {
      if (step.wrong(`Attacked with ${selected.length} of 2`, v)) resetBoard();
      return;
    }
    setTapped(selected);
    setAttacking(selected);
    setFlagged(null);
    setFeedback(null);
    setPhase("resolving");
    const declared = declareAttackers(board, selected);
    const result = resolveCombat(declared, selected, {});
    await fx.wait(450);
    await fx.hitPlayer(
      selected.map((id) => ({ id, amount: board.creatures[id].power })),
      "opp",
      () => setOppLife(result.state.life.opp),
    );
    step.setAnnounce(
      `Ember Pup and Moss Golem attack your opponent and hit for 5. Their life goes from 20 to ${result.state.life.opp}.`,
    );
    step.complete();
    setFeedback({ tone: "good", text: `${ATTACK.win} ${ATTACK.after}` });
    setPhase("done");
  }

  const prompt = phase === "pick" ? (lighter ? ATTACK.prompts.pickLighter : ATTACK.prompts.pick) : "Attack!";

  const n = selected.length;

  const pinVisible = (id: string) => {
    if (lighter) return false;
    if (id === flagged) return true;
    const pin = ATTACK.pins.find((p) => p.id === id);
    if (!pin) return false;
    if (explaining) return pin.when.includes("explain");
    if (phase === "pick") return step.hints >= 2 && pin.when.includes("pick-hint");
    return false;
  };
  const { cardProps, keyProps } = usePinLinks(ATTACK.pins, pinVisible, fx.mode === "full");
  const arrowOn = phase === "watch" || phase === "resolving" || phase === "done";

  return (
    <StepFrame
      n={1}
      title={ATTACK.title}
      headingRef={headingRef}
      headline={explaining ? ATTACK.headline : prompt}
      focusKey={step.focusKey}
      speak={explaining ? ATTACK.headline : prompt}
      howTo={
        phase === "pick"
          ? lighter
            ? "A smaller board first. Then back to the full one."
            : "Pick your creatures, then press Attack."
          : phase === "resolving"
            ? "Attackers go at the player."
            : undefined
      }
      bandActions={demo.bandActions}
      board={
        <Board
          scope={fx.scope}
          layer={fx.layer}
          className="border-y-[3px] border-ink lg:border-y-0"
          between={arrowOn ? <AttackArrow label="attacks the player" /> : null}
          caption={<>{arrowOn ? "Creatures that attack turn sideways." : "Your turn."}</>}
          opp={
            <Row side="opp" life={oppLife}>
              {theirs.map((c) => (
                <Card
                  key={c.id}
                  card={CARDS[c.id as keyof typeof CARDS]}
                  status={c.tapped ? "tapped" : null}
                  tapped={c.tapped}
                  {...cardProps(c.id)}
                  onSelect={() => onCard(c)}
                  disabled={phase !== "pick"}
                />
              ))}
            </Row>
          }
          you={
            <Row side="you" life={20}>
              {yours.map((c) => (
                <Card
                  key={c.id}
                  card={CARDS[c.id as keyof typeof CARDS]}
                  status={
                    attacking.includes(c.id) || (phase === "pick" && selected.includes(c.id) && !lighter)
                      ? "attacking"
                      : c.enteredThisTurn
                        ? "new"
                        : null
                  }
                  tapped={tapped.includes(c.id)}
                  pressed={phase === "pick" ? selected.includes(c.id) : undefined}
                  highlight={hintOn && (ATTACK.hintHighlight as readonly string[]).includes(c.id)}
                  {...cardProps(c.id)}
                  transitionName={c.id === "mossGolem" ? "card-mossGolem" : c.id === "emberPup" ? "card-emberPup" : undefined}
                  callout={c.enteredThisTurn ? ATTACK.callouts[c.id as keyof typeof ATTACK.callouts] : undefined}
                  onSelect={() => onCard(c)}
                  disabled={phase !== "pick"}
                />
              ))}
            </Row>
          }
        />
      }
      actions={
        explaining ? undefined : (
          <>
            {phase === "pick" && !lighter && (
              <>
                <Primary onClick={confirmAttackers} disabled={n === 0}>
                  {n === 0 ? "Pick attackers" : `Attack with ${n}`}
                </Primary>
                <HintButton level={step.hints} total={ATTACK.hints.length} onMore={step.hint} />
              </>
            )}
            {phase === "pick" && lighter && lighterPassed && <Primary onClick={demo.backToFull}>Back to the full board</Primary>}
          </>
        )
      }
      feedback={feedback}
      below={
        <>
          {phase === "pick" && !lighter && <HintText level={step.hints} hints={ATTACK.hints} />}
          <PinKey {...keyProps} />
        </>
      }
      announce={step.announce}
      done={phase === "done"}
      onNext={onNext}
      nextTitle={nextTitle}
    />
  );
}
