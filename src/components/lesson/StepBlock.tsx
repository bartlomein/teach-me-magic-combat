"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type Ref } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";
import { BLOCK, blockBoard, blockLighterBoard, judgeBlock } from "@/lib/lesson/steps";
import { describe as describeCombat, resolveCombat, type Myth } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row, useBoardFx } from "../board/Board";
import { FeedbackBox, HintButton, HintText, OnSpot, PinKey, Primary, Secondary, type Feedback } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";

const now = () => Date.now();
/** Time to read a caption. Not scaled by the motion setting: reading speed isn't motion. */
const readPause = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Phase = "ask" | "explain" | "watch" | "pick" | "resolving" | "missed" | "done";
type Fate = "alive" | "dying" | "gone";

/**
 * Step 2: Blocking. A quick "who picks blockers?" first (myth M3), then the rule,
 * a Watch demo (Pup blocks and dies), and the try: block so the Boar dies and
 * yours lives. Two misses swap in the lighter version (one blocker, the math
 * shown in the Key, a yes/no question).
 */
export function StepBlock({
  progress,
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
  const lighter = progress.lighter === "active";
  const board = useMemo(() => (lighter ? blockLighterBoard() : blockBoard()), [lighter]);

  const [phase, setPhase] = useState<Phase>(progress.status === "done" ? "explain" : "ask");
  const [asked, setAsked] = useState<"me" | "them" | null>(null);
  const [watched, setWatched] = useState(false);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [damage, setDamage] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [youLife, setYouLife] = useState(20);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lighterAnswer, setLighterAnswer] = useState<"yes" | "no" | null>(null);
  const [announce, setAnnounce] = useState("");

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (phase === "pick" || phase === "done" || phase === "explain") headlineRef.current?.focus();
  }, [phase, lighter]);

  const explaining = phase === "explain" || phase === "watch";
  const pinShown = (id: string) => !lighter && id === "mossGolem" && (explaining || (phase === "pick" && progress.hints >= 2));
  const { cardProps, keyProps } = usePinLinks(BLOCK.pins, pinShown, fx.mode === "full");
  // Lighter version: the math, pinned to both cards.
  const lighterPins = [
    { id: "mossGolem", letter: "A", text: "Moss Golem hits for 3. The Boar has 3 toughness." },
    { id: "thornBoar", letter: "B", text: "The Boar hits for 3. Moss Golem has 4 toughness." },
  ] as const;
  const lighterLinks = usePinLinks(lighterPins, () => lighter, fx.mode === "full");
  const pinsFor = (id: string) => (lighter ? lighterLinks.cardProps(id) : cardProps(id));

  function miss(note: string, myth?: Myth, soft = false) {
    dispatch({ type: "miss", step: "block", myth, note, at: now(), soft });
    return !soft && lighterNext;
  }

  function reset() {
    setBlocker(null);
    setDamage({});
    setFates({});
    setYouLife(20);
    fx.clearFx();
  }

  /** Animate a block (or none) exactly as the engine resolves it. */
  async function play(blockId: string | null) {
    const s = lighter ? blockLighterBoard() : blockBoard();
    const r = resolveCombat(s, ["thornBoar"], blockId ? { [blockId]: "thornBoar" } : {});
    if (blockId) {
      await fx.clash(
        [{ attacker: "thornBoar", blocker: blockId, toBlocker: s.creatures.thornBoar.power, toAttacker: s.creatures[blockId].power }],
        () => setDamage({ [blockId]: s.creatures.thornBoar.power, thornBoar: s.creatures[blockId].power }),
      );
    } else {
      await fx.hitPlayer([{ id: "thornBoar", amount: 3 }], "you", () => setYouLife(r.state.life.you));
    }
    const dead = r.state.graveyard;
    if (dead.length) {
      setFates(Object.fromEntries(dead.map((id) => [id, "dying" as Fate])));
      await fx.wait(fx.mode === "full" ? 900 : 600);
      setFates(Object.fromEntries(dead.map((id) => [id, "gone" as Fate])));
    }
    setAnnounce((blockId ? `${s.creatures[blockId].name} blocks Thorn Boar. ` : "No block. ") + describeCombat(s, r.events));
  }

  async function watch() {
    reset();
    setFeedback(null);
    setPhase("watch");
    // Beats held long enough to read twice (real time in every motion mode).
    setFeedback({ tone: "info", text: "Thorn Boar attacks you." });
    await readPause(2000);
    setBlocker("emberPup");
    setFeedback({ tone: "info", text: "You block with Ember Pup." });
    await readPause(2200);
    setFeedback(null);
    await play("emberPup");
    setFeedback({ tone: "info", text: `Both hit at once. ${BLOCK.watchCaption}` });
    await readPause(3200);
    reset();
    setWatched(true);
    setPhase("explain");
  }

  function startTry() {
    reset();
    setFeedback(null);
    setPhase("pick");
  }

  function answerAsk(v: "me" | "them") {
    setAsked(v);
    if (v === "me") {
      setFeedback({ tone: "good", text: "The defender chooses. That's you." });
      setPhase("explain");
    } else {
      miss("Thought the attacker picks blockers", BLOCK.ask.myth, true);
      setFeedback({ tone: "bad", text: BLOCK.ask.wrong });
    }
  }

  async function confirm(blockId: string | null) {
    setPhase("resolving");
    setFeedback(null);
    await play(blockId);
    const v = judgeBlock(blockId);
    if (v.ok) {
      dispatch({ type: "complete", step: "block", at: now() });
      setFeedback({ tone: "good", text: v.message });
      setPhase("done");
      return;
    }
    const toLighter = miss(blockId ? `Blocked with ${board.creatures[blockId].name}` : "Didn't block", v.myth);
    setFeedback({ tone: "bad", text: toLighter ? `${v.message} Let's try a simpler board.` : v.message });
    if (toLighter) {
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
      miss("Lighter: thought Golem dies or misses", "M5", true);
      setFeedback({ tone: "bad", text: "Golem deals 3: enough for the Boar. It takes 3, but has 4." });
    }
  }

  function backToFull() {
    dispatch({ type: "lighter-cleared", step: "block" });
    setLighterAnswer(null);
    reset();
    setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    setPhase("pick");
  }

  const theirs = Object.values(board.creatures).filter((c) => c.controller === "opp");
  const yours = Object.values(board.creatures).filter((c) => c.controller === "you");
  const hintOn = progress.hints >= 3 && phase === "pick" && !lighter;
  const canPick = phase === "pick" && !lighter;

  const headline =
    phase === "ask"
      ? BLOCK.ask.question
      : explaining
        ? BLOCK.headline
        : lighter && phase === "pick"
          ? BLOCK.lighter.question
          : phase === "done"
            ? "Step complete"
            : BLOCK.prompt;


  return (
    <StepFrame
      n={2}
      title="Blocking"
      headingRef={headingRef}
      headline={headline}
      headlineRef={headlineRef}
      speak={explaining ? BLOCK.speak : headline}
      howTo={
        canPick ? "Tap one of your creatures, then press Block." : phase === "missed" ? "Watch what happened, then try again." : undefined
      }
      bandActions={
        explaining ? (
          watched ? (
            <>
              <OnSpot primary onClick={startTry}>
                Try it
              </OnSpot>
              <OnSpot onClick={watch}>Watch again</OnSpot>
            </>
          ) : (
            <>
              <OnSpot primary onClick={watch} disabled={phase === "watch"}>
                {phase === "watch" ? "Watching…" : "Watch it"}
              </OnSpot>
              <OnSpot onClick={startTry} disabled={phase === "watch"}>
                Skip to try
              </OnSpot>
            </>
          )
        ) : undefined
      }
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
                <CardSlot key={c.id} fate={fates[c.id]} card={CARDS[c.id as keyof typeof CARDS] as CardDef} status="attacking" tapped={c.tapped} damage={damage[c.id]} {...pinsFor(c.id)} />
              ))}
            </Row>
          }
          you={
            <Row side="you" life={youLife}>
              {yours.map((c) => (
                <CardSlot
                  key={c.id}
                  fate={fates[c.id]}
                  card={CARDS[c.id as keyof typeof CARDS] as CardDef}
                  status={blocker === c.id ? "blocking" : c.enteredThisTurn ? "new" : null}
                  damage={damage[c.id]}
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
              <HintButton level={progress.hints} total={BLOCK.hints.length} onMore={() => dispatch({ type: "hint", step: "block" })} />
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
          {lighter && lighterAnswer === "yes" && <Primary onClick={backToFull}>Back to the full board</Primary>}
          {phase === "missed" && <Primary onClick={startTry}>Try again</Primary>}
          {phase === "done" && (
            <>
              {nextTitle && <Primary onClick={onNext}>Next: {nextTitle}</Primary>}
              <Secondary onClick={startTry}>Play again</Secondary>
            </>
          )}
        </>
      }
      below={
        <>
          <FeedbackBox feedback={feedback} />
          {canPick && <HintText level={progress.hints} hints={BLOCK.hints} />}
          {lighter ? <PinKey {...lighterLinks.keyProps} /> : <PinKey {...keyProps} />}
        </>
      }
      announce={announce}
    />
  );
}
