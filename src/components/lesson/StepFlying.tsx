"use client";

import { useMemo, useState } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import { checkAssign, FLYING, flyingBoard, flyingLighterBoard, judgeFlying } from "@/lib/lesson/steps";
import type { Blocks } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row } from "../board/Board";
import { HintButton, HintText, PinKey, Primary } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";
import { sides, useCombat, useDemo, useStep, type StepProps } from "./useStep";

type Phase = "explain" | "watch" | "pick" | "resolving" | "missed" | "follow" | "done";

/**
 * Step 3: Flying + reach. Two attackers (Night Bat flies, Thorn Boar doesn't).
 * Assign blockers by tapping your creature, then the attacker it blocks; a line
 * joins them. A ground creature on a flyer bounces off (myth M6). After a
 * perfect block, one follow-up question checks myth M7.
 */
export function StepFlying(props: StepProps) {
  const { progress, onNext, nextTitle, headingRef } = props;
  const step = useStep<Phase>("flying", props, "explain", ["pick", "done", "follow"]);
  const { fx, phase, setPhase, feedback, setFeedback, lighter } = step;
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

  /** Animate a set of blocks exactly as the engine resolves them. */
  async function play(b: Blocks, atk: string[]) {
    step.setAnnounce((await combat.play(board, atk, b)).text);
  }

  const demo = useDemo(step, reset, async (beat) => {
    // Five beats, each held long enough to read twice. Reading pauses are real
    // time in every motion mode (Off speeds up animation, not reading).
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

  const pinShown = (id: string) => !lighter && (explaining || (phase === "pick" && progress.hints >= 2)) && FLYING.pins.some((p) => p.id === id);
  const { cardProps, keyProps } = usePinLinks(FLYING.pins, pinShown, fx.mode === "full");

  // ---- Assigning blockers: your creature, then the attacker it blocks ----
  function onYours(id: string) {
    if (phase !== "pick") return;
    setFeedback(null);
    if (lighter) {
      // Lighter version: one tap answers "Who can block the Bat?"
      const v = checkAssign(board, id, "nightBat");
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
      // Tap an assigned blocker again: unassign it.
      setBlocks((cur) => Object.fromEntries(Object.entries(cur).filter(([b]) => b !== id)));
      setSelected(null);
      return;
    }
    setSelected((cur) => (cur === id ? null : id));
  }

  function onAttacker(id: string) {
    if (phase !== "pick" || lighter || !selected) return;
    const v = checkAssign(board, selected, id);
    if (!v.ok) {
      fx.nope(selected);
      const toLighter = step.wrong(`Tried ${board.creatures[selected].name} on ${board.creatures[id].name}`, v);
      setSelected(null);
      if (toLighter) reset();
      return;
    }
    // One blocker per attacker in this lesson (double blocks come in Lesson 2).
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
      // The follow-up question only names cards you can see: clear the board
      // down to the two it's about (a question figure).
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

  // The follow-up question gets its own figure: just the two cards it asks about.
  const figure = phase === "follow" || (phase === "done" && follow === "yes");
  const theirs = sides(board).theirs.filter((c) => !figure || c.id === "thornBoar");
  const yours = sides(board).yours.filter((c) => !figure || c.id === "skyFinch");
  const canPick = phase === "pick";
  const hintOn = progress.hints >= 3 && canPick && !lighter;
  const pairs = Object.entries(blocks).map(([from, to]) => ({ from, to }));
  const nBlocks = pairs.length;

  // The finished state (headline, Next button) comes from StepFrame.
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
      headlineRef={step.headlineRef}
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
                  onSelect={selected && !lighter ? () => onAttacker(c.id) : undefined}
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
              <HintButton level={progress.hints} total={FLYING.hints.length} onMore={step.hint} />
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
      feedback={feedback}
      below={
        <>
          {canPick && !lighter && <HintText level={progress.hints} hints={FLYING.hints} />}
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
