"use client";

import { useMemo, useState } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import { BLOCK, blockBoard, blockLighterBoard, judgeBlock } from "@/lib/lesson/steps";
import { Board, BlockLines, CardSlot, Row } from "../board/Board";
import { HintButton, HintText, PinKey, Primary, Secondary } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";
import { sides, useCombat, useDemo, useStep, type StepProps } from "./useStep";

type Phase = "ask" | "explain" | "watch" | "pick" | "resolving" | "missed" | "done";

/** Lighter version: the math, pinned to both cards. */
const LIGHTER_PINS = [
  { id: "mossGolem", letter: "A", text: "Moss Golem hits for 3. The Boar has 3 toughness." },
  { id: "thornBoar", letter: "B", text: "The Boar hits for 3. Moss Golem has 4 toughness." },
] as const;

/**
 * Step 2: Blocking. A quick "who picks blockers?" first (myth M3), then the rule,
 * a Watch demo (Pup blocks and dies), and the try: block so the Boar dies and
 * yours lives. Two misses swap in the lighter version (one blocker, the math
 * shown in the Key, a yes/no question).
 */
export function StepBlock(props: StepProps) {
  const { progress, onNext, nextTitle, headingRef } = props;
  const step = useStep<Phase>("block", props, progress.status === "done" ? "explain" : "ask", ["pick", "done", "explain"]);
  const { fx, phase, setPhase, feedback, setFeedback, lighter } = step;
  const board = useMemo(() => (lighter ? blockLighterBoard() : blockBoard()), [lighter]);
  const combat = useCombat(fx);

  const [asked, setAsked] = useState<"me" | "them" | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [lighterAnswer, setLighterAnswer] = useState<"yes" | "no" | null>(null);

  function reset() {
    setBlocker(null);
    setLighterAnswer(null);
    combat.clear();
    fx.clearFx();
  }

  /** Animate a block (or none) exactly as the engine resolves it. */
  async function play(blockId: string | null) {
    const r = await combat.play(board, ["thornBoar"], blockId ? { [blockId]: "thornBoar" } : {});
    step.setAnnounce((blockId ? `${board.creatures[blockId].name} blocks Thorn Boar. ` : "No block. ") + r.text);
  }

  const demo = useDemo(step, reset, async (beat) => {
    // Beats held long enough to read twice (real time in every motion mode).
    setFeedback({ tone: "info", text: "Thorn Boar attacks you." });
    await beat(2000);
    setBlocker("emberPup");
    setFeedback({ tone: "info", text: "You block with Ember Pup." });
    await beat(2200);
    setFeedback(null);
    await beat(play("emberPup"));
    setFeedback({ tone: "info", text: `Both hit at once. ${BLOCK.watchCaption}` });
    await beat(3200);
  });
  const { explaining } = demo;

  const pinShown = (id: string) => !lighter && id === "mossGolem" && (explaining || (phase === "pick" && progress.hints >= 2));
  const { cardProps, keyProps } = usePinLinks(BLOCK.pins, pinShown, fx.mode === "full");
  const lighterLinks = usePinLinks(LIGHTER_PINS, () => lighter, fx.mode === "full");
  const pinsFor = (id: string) => (lighter ? lighterLinks.cardProps(id) : cardProps(id));

  function answerAsk(v: "me" | "them") {
    setAsked(v);
    if (v === "me") {
      setFeedback({ tone: "good", text: "The defender chooses. That's you." });
      setPhase("explain");
    } else {
      step.miss("Thought the attacker picks blockers", BLOCK.ask.myth, true);
      setFeedback({ tone: "bad", text: BLOCK.ask.wrong });
    }
  }

  async function confirm(blockId: string | null) {
    setPhase("resolving");
    setFeedback(null);
    await play(blockId);
    const v = judgeBlock(blockId);
    if (v.ok) {
      step.complete();
      setFeedback({ tone: "good", text: v.message });
      setPhase("done");
      return;
    }
    if (step.wrong(blockId ? `Blocked with ${board.creatures[blockId].name}` : "Didn't block", v)) {
      // Straight to the simpler question: no extra click.
      await fx.wait(900);
      reset();
      setPhase("pick");
    } else setPhase("missed");
  }

  function answerLighter(v: "yes" | "no") {
    setLighterAnswer(v);
    if (v === "yes") setFeedback({ tone: "good", text: "Yes: Golem deals 3 (Boar dies) and takes 3 of its 4 (lives)." });
    else {
      step.miss("Lighter: thought Golem dies or misses", "M5", true);
      setFeedback({ tone: "bad", text: "Golem deals 3: enough for the Boar. It takes 3, but has 4." });
    }
  }

  const { theirs, yours } = sides(board);
  const hintOn = progress.hints >= 3 && phase === "pick" && !lighter;
  const canPick = phase === "pick" && !lighter;

  // The finished state (headline, Next button) comes from StepFrame.
  const headline =
    phase === "ask"
      ? BLOCK.ask.question
      : explaining
        ? BLOCK.headline
        : lighter && phase === "pick"
          ? BLOCK.lighter.question
          : BLOCK.prompt;

  return (
    <StepFrame
      n={2}
      title="Blocking"
      headingRef={headingRef}
      headline={headline}
      headlineRef={step.headlineRef}
      speak={explaining ? BLOCK.speak : headline}
      howTo={
        canPick ? "Tap one of your creatures, then press Block." : phase === "missed" ? "Watch what happened, then try again." : undefined
      }
      bandActions={demo.bandActions}
      board={
        <Board
          scope={fx.scope}
          layer={
            <>
              {fx.layer}
              {blocker && (phase === "pick" || phase === "watch") && (
                <BlockLines scope={fx.scope} pairs={[{ from: blocker, to: "thornBoar" }]} />
              )}
            </>
          }
          className="border-y-[3px] border-ink lg:border-y-0"
          caption={
            <>
              Their turn. Thorn Boar attacks you.
            </>
          }
          opp={
            <Row side="opp" life={20}>
              {theirs.map((c) => (
                <CardSlot key={c.id} fate={combat.fates[c.id]} card={CARDS[c.id as keyof typeof CARDS] as CardDef} status="attacking" tapped={c.tapped} damage={combat.damage[c.id]} {...pinsFor(c.id)} />
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
                  status={blocker === c.id ? "blocking" : c.enteredThisTurn ? "new" : null}
                  // "New this turn" goes above the card, like Step 1. Not while it blocks: then the card says "Blocking".
                  callout={c.enteredThisTurn && blocker !== c.id ? BLOCK.callouts[c.id as keyof typeof BLOCK.callouts] : undefined}
                  damage={combat.damage[c.id]}
                  pressed={canPick ? blocker === c.id : undefined}
                  highlight={hintOn && (BLOCK.hintHighlight as readonly string[]).includes(c.id)}
                  {...pinsFor(c.id)}
                  onSelect={() => {
                    if (!canPick) return;
                    setFeedback(null);
                    setBlocker((b) => (b === c.id ? null : c.id));
                  }}
                  disabled={!canPick}
                />
              ))}
            </Row>
          }
        />
      }
      actions={
        <>
          {phase === "ask" && (
            <Choice
              options={[
                { value: "me", label: "Me" },
                { value: "them", label: "Them" },
              ]}
              answered={asked}
              correct="me"
              onAnswer={answerAsk}
            />
          )}
          {canPick && (
            <>
              <Primary onClick={() => confirm(blocker)} disabled={!blocker}>
                {blocker ? `Block with ${board.creatures[blocker].name}` : "Pick a blocker"}
              </Primary>
              <Secondary onClick={() => confirm(null)}>Don&apos;t block</Secondary>
              <HintButton level={progress.hints} total={BLOCK.hints.length} onMore={step.hint} />
            </>
          )}
          {lighter && phase === "pick" && (
            <Choice
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              answered={lighterAnswer}
              correct="yes"
              onAnswer={answerLighter}
            />
          )}
          {lighter && lighterAnswer === "yes" && <Primary onClick={demo.backToFull}>Back to the full board</Primary>}
          {phase === "missed" && <Primary onClick={demo.startTry}>Try again</Primary>}
        </>
      }
      feedback={feedback}
      below={
        <>
          {canPick && <HintText level={progress.hints} hints={BLOCK.hints} />}
          {lighter ? <PinKey {...lighterLinks.keyProps} /> : <PinKey {...keyProps} />}
        </>
      }
      announce={step.announce}
      done={phase === "done"}
      onNext={onNext}
      nextTitle={nextTitle}
    />
  );
}
