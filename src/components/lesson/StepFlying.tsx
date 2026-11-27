"use client";

import { useMemo, useState } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import { checkAssign, FLYING, flyingBoard, flyingLighterBoard, judgeFlying } from "@/lib/lesson/steps";
import type { Blocks } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row } from "../board/Board";
import { HintButton, HintText, PinKey, Primary } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";
import { sides, useCombat } from "./useCombat";
import { useDemo } from "./useDemo";
import { useStep, type StepProps } from "./useStep";

type Phase = "explain" | "watch" | "pick" | "resolving" | "missed" | "follow" | "done";

export function StepFlying(props: StepProps) {
  const { onNext, nextTitle, headingRef } = props;
  const step = useStep<Phase>("flying", props, "explain", ["pick", "done", "follow", "explain"]);
  const { fx, phase, setPhase, feedback, setFeedback } = step;
  // The easier board waits until the missed fight's result is cleared.
  const lighter = step.lighter && phase !== "resolving";
  const board = useMemo(() => (lighter ? flyingLighterBoard() : flyingBoard()), [lighter]);
  const attackers = useMemo(() => sides(board).theirs.map((c) => c.id), [board]);
  const combat = useCombat(fx);

  const [selected, setSelected] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Blocks>({});
  const [follow, setFollow] = useState<"yes" | "no" | null>(null);
  const [lighterPassed, setLighterPassed] = useState(false);

  function reset() {
    setSelected(null);
    setBlocks({});
    setFollow(null);
    setLighterPassed(false);
    combat.clear();
    fx.clearFx();
  }

  async function play(b: Blocks, atk: string[]) {
    step.setAnnounce((await combat.play(board, atk, b)).text);
  }

  const demo = useDemo(step, reset, async (beat) => {
    // Reading pauses are real time in every motion mode.
    setFeedback({ tone: "info", text: "Night Bat flies at you." });
    await beat(2200);
    setBlocks({ mossGolem: "nightBat" });
    setFeedback({ tone: "info", text: "Moss Golem tries to block it…" });
    await beat(2200);
    fx.nope("mossGolem");
    setBlocks({});
    setFeedback({ tone: "info", text: "Golem can't block a flyer. It has no flying or reach." });
    await beat(3000);
    setBlocks({ vineArcher: "nightBat" });
    setFeedback({ tone: "info", text: "Vine Archer has reach. It can block flyers." });
    await beat(2800);
    await beat(play({ vineArcher: "nightBat" }, ["nightBat"]));
    setFeedback({ tone: "good", text: "Archer stops the Bat." });
    await beat(2600);
  });
  const { explaining } = demo;

  const pinShown = (id: string) => !lighter && (explaining || (phase === "pick" && step.hints >= 2)) && FLYING.pins.some((p) => p.id === id);
  const { cardProps, keyProps } = usePinLinks(FLYING.pins, pinShown, fx.mode === "full");

  function onYours(id: string) {
    if (phase !== "pick") return;
    setFeedback(null);
    if (lighter) {
      const v = checkAssign(board, attackers, id, "nightBat");
      if (v.ok) {
        setBlocks({ [id]: "nightBat" });
        setLighterPassed(true);
        setFeedback({ tone: "good", text: "Vine Archer has reach, so it can block a flyer." });
      } else {
        fx.nope(id);
        step.miss(`Lighter: tried ${board.creatures[id].name} on the Bat`, v.myth, true);
        setFeedback({ tone: "bad", text: v.message });
      }
      return;
    }
    if (blocks[id]) {
      setBlocks((cur) => Object.fromEntries(Object.entries(cur).filter(([b]) => b !== id)));
      setSelected(null);
      return;
    }
    setSelected((cur) => (cur === id ? null : id));
  }

  function onAttacker(id: string) {
    if (phase !== "pick" || lighter || !selected) return;
    const v = checkAssign(board, attackers, selected, id);
    if (!v.ok) {
      fx.nope(selected);
      const toLighter = step.wrong(`Tried ${board.creatures[selected].name} on ${board.creatures[id].name}`, v);
      setSelected(null);
      if (toLighter) reset();
      return;
    }
    setBlocks((cur) => ({ ...Object.fromEntries(Object.entries(cur).filter(([, a]) => a !== id)), [selected]: id }));
    setSelected(null);
  }

  async function confirm() {
    setPhase("resolving");
    setFeedback(null);
    setSelected(null);
    await play(blocks, attackers);
    const v = judgeFlying(blocks);
    if (v.ok) {
      setFeedback({ tone: "good", text: v.message });
      if (!(await step.sequence((beat) => beat(2600)))) return;
      reset();
      setFeedback(null);
      setPhase("follow");
      return;
    }
    const said = Object.entries(blocks).map(([b, a]) => `${board.creatures[b].name} on ${board.creatures[a].name}`);
    if (step.wrong(`Blocked: ${said.join(", ") || "nothing"}`, v)) {
      await fx.wait(900);
      reset();
      setPhase("pick");
    } else setPhase("missed");
  }

  function answerFollow(v: "yes" | "no") {
    if (follow === v) return;
    setFollow(v);
    if (v === "yes") {
      step.complete();
      setFeedback({ tone: "good", text: "Flying limits who blocks you, not who you block." });
      setPhase("done");
    } else {
      step.miss("Thought flyers can't block ground creatures", FLYING.followUp.myth, true);
      setFeedback({ tone: "bad", text: FLYING.followUp.wrong });
    }
  }

  const figure = phase === "follow" || (phase === "done" && follow === "yes");
  const theirs = sides(board).theirs.filter((c) => !figure || c.id === "thornBoar");
  const yours = sides(board).yours.filter((c) => !figure || c.id === "skyFinch");
  const canPick = phase === "pick";
  const hintOn = step.hints >= 3 && canPick && !lighter;
  const pairs = Object.entries(blocks).map(([from, to]) => ({ from, to }));
  const nBlocks = pairs.length;

  const headline = explaining
    ? FLYING.headline
    : lighter && canPick
      ? FLYING.lighter.prompt
      : phase === "follow"
        ? FLYING.followUp.question
        : FLYING.prompt;

  return (
    <StepFrame
      n={3}
      title="Flying + reach"
      headingRef={headingRef}
      headline={headline}
      focusKey={step.focusKey}
      speak={explaining ? FLYING.speak : headline}
      howTo={
        canPick && !lighter
          ? selected
            ? `Now tap the attacker ${board.creatures[selected].name} blocks.`
            : FLYING.howTo
          : phase === "missed"
            ? "Watch what happened, then try again."
            : phase === "follow"
              ? "Finch flies. The Boar doesn't."
              : undefined
      }
      bandActions={demo.bandActions}
      board={
        <Board
          scope={fx.scope}
          layer={
            <>
              {fx.layer}
              {(phase === "pick" || phase === "watch") && pairs.length > 0 && <BlockLines scope={fx.scope} pairs={pairs} />}
              {figure && follow === "yes" && <BlockLines scope={fx.scope} pairs={[{ from: "skyFinch", to: "thornBoar" }]} />}
            </>
          }
          className="border-y-[3px] border-ink lg:border-y-0"
          caption={
            <>
              {figure ? (
                <>
                  Sky Finch flies. Thorn Boar doesn&apos;t.
                </>
              ) : (
                <>
                  Their turn. A flyer and a ground creature attack.
                </>
              )}
            </>
          }
          opp={
            <Row side="opp" life={20}>
              {theirs.map((c) => (
                <CardSlot
                  key={c.id}
                  fate={combat.fates[c.id]}
                  card={CARDS[c.id as keyof typeof CARDS] as CardDef}
                  status="attacking"
                  tapped={c.tapped}
                  damage={combat.damage[c.id]}
                  highlight={hintOn && (FLYING.hintHighlight as readonly string[]).includes(c.id)}
                  {...cardProps(c.id)}
                  // Always a button: swapping it for a plain card mid-assign would drop keyboard focus.
                  onSelect={lighter ? undefined : () => onAttacker(c.id)}
                  disabled={!canPick}
                />
              ))}
            </Row>
          }
          you={
            <Row side="you" life={combat.life.you}>
              {yours.map((c) => (
                <CardSlot
                  key={c.id}
                  fate={combat.fates[c.id]}
                  card={CARDS[c.id as keyof typeof CARDS] as CardDef}
                  status={blocks[c.id] || (figure && follow === "yes" && c.id === "skyFinch") ? "blocking" : null}
                  damage={combat.damage[c.id]}
                  pressed={canPick ? selected === c.id || !!blocks[c.id] : undefined}
                  highlight={hintOn && (FLYING.hintHighlight as readonly string[]).includes(c.id)}
                  {...cardProps(c.id)}
                  onSelect={() => onYours(c.id)}
                  disabled={!canPick}
                />
              ))}
            </Row>
          }
        />
      }
      actions={
        <>
          {canPick && !lighter && (
            <>
              <Primary onClick={confirm} disabled={nBlocks === 0}>
                {nBlocks === 0 ? "Assign blockers" : `Block with ${nBlocks}`}
              </Primary>
              <HintButton level={step.hints} total={FLYING.hints.length} onMore={step.hint} />
            </>
          )}
          {canPick && lighter && lighterPassed && <Primary onClick={demo.backToFull}>Back to the full board</Primary>}
          {phase === "follow" && (
            <Choice
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              answered={follow}
              correct="yes"
              onAnswer={answerFollow}
            />
          )}
          {phase === "missed" && <Primary onClick={demo.startTry}>Try again</Primary>}
        </>
      }
      asking={phase === "follow"}
      feedback={feedback}
      below={
        <>
          {canPick && !lighter && <HintText level={step.hints} hints={FLYING.hints} />}
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
