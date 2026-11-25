"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type Ref } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";
import { checkAssign, FLYING, flyingBoard, flyingLighterBoard, judgeFlying } from "@/lib/lesson/steps";
import { describe as describeCombat, resolveCombat, type Blocks, type Myth } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row, useBoardFx } from "../board/Board";
import { FeedbackBox, HintButton, HintText, OnSpot, PinKey, Primary, Secondary, type Feedback } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { usePinLinks } from "./usePinLinks";

const now = () => Date.now();
/** Time to read a caption. Not scaled by the motion setting: reading speed isn't motion. */
const readPause = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Phase = "explain" | "watch" | "pick" | "resolving" | "missed" | "follow" | "done";
type Fate = "alive" | "dying" | "gone";

/**
 * Step 3: Flying + reach. Two attackers (Night Bat flies, Thorn Boar doesn't).
 * Assign blockers by tapping your creature, then the attacker it blocks; a line
 * joins them. A ground creature on a flyer bounces off (myth M6). After a
 * perfect block, one follow-up question checks myth M7.
 */
export function StepFlying({
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
  const board = useMemo(() => (lighter ? flyingLighterBoard() : flyingBoard()), [lighter]);
  const attackers = useMemo(() => Object.values(board.creatures).filter((c) => c.controller === "opp").map((c) => c.id), [board]);

  const [phase, setPhase] = useState<Phase>("explain");
  const [watched, setWatched] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Blocks>({});
  const [damage, setDamage] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [youLife, setYouLife] = useState(20);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [follow, setFollow] = useState<"yes" | "no" | null>(null);
  const [lighterPassed, setLighterPassed] = useState(false);
  const [announce, setAnnounce] = useState("");

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (phase === "pick" || phase === "done" || phase === "follow") headlineRef.current?.focus();
  }, [phase, lighter]);

  const explaining = phase === "explain" || phase === "watch";
  const pinShown = (id: string) => !lighter && (explaining || (phase === "pick" && progress.hints >= 2)) && FLYING.pins.some((p) => p.id === id);
  const { cardProps, keyProps } = usePinLinks(FLYING.pins, pinShown, fx.mode === "full");

  function miss(note: string, myth?: Myth, soft = false) {
    dispatch({ type: "miss", step: "flying", myth, note, at: now(), soft });
    return !soft && lighterNext;
  }

  function reset() {
    setSelected(null);
    setBlocks({});
    setDamage({});
    setFates({});
    setYouLife(20);
    fx.clearFx();
  }

  /** Animate a set of blocks exactly as the engine resolves them. */
  async function play(b: Blocks, atk: string[]) {
    const s = lighter ? flyingLighterBoard() : flyingBoard();
    const r = resolveCombat(s, atk, b);
    const fights = Object.entries(b).map(([blocker, attacker]) => ({
      attacker,
      blocker,
      toBlocker: s.creatures[attacker].power,
      toAttacker: s.creatures[blocker].power,
    }));
    const unblocked = atk.filter((a) => !Object.values(b).includes(a)).map((id) => ({ id, amount: s.creatures[id].power }));
    const dmg: Record<string, number> = {};
    for (const f of fights) {
      dmg[f.blocker] = (dmg[f.blocker] ?? 0) + f.toBlocker;
      dmg[f.attacker] = (dmg[f.attacker] ?? 0) + f.toAttacker;
    }
    await Promise.all([
      fights.length ? fx.clash(fights, () => setDamage(dmg)) : Promise.resolve(),
      unblocked.length ? fx.hitPlayer(unblocked, "you", () => setYouLife(r.state.life.you)) : Promise.resolve(),
    ]);
    const dead = r.state.graveyard;
    if (dead.length) {
      setFates(Object.fromEntries(dead.map((id) => [id, "dying" as Fate])));
      await fx.wait(fx.mode === "full" ? 900 : 600);
      setFates(Object.fromEntries(dead.map((id) => [id, "gone" as Fate])));
    }
    setAnnounce(describeCombat(s, r.events));
  }

  async function watch() {
    reset();
    setFeedback(null);
    setPhase("watch");
    // Five beats, each held long enough to read twice. Reading pauses are real
    // time in every motion mode (Off speeds up animation, not reading).
    setFeedback({ tone: "info", text: "Night Bat flies at you." });
    await readPause(2200);
    setBlocks({ mossGolem: "nightBat" });
    setFeedback({ tone: "info", text: "Moss Golem tries to block it…" });
    await readPause(2200);
    fx.nope("mossGolem");
    setBlocks({});
    setFeedback({ tone: "info", text: "Golem can't block a flyer. It has no flying or reach." });
    await readPause(3000);
    setBlocks({ vineArcher: "nightBat" });
    setFeedback({ tone: "info", text: "Vine Archer has reach. It can block flyers." });
    await readPause(2800);
    await play({ vineArcher: "nightBat" }, ["nightBat"]);
    setFeedback({ tone: "good", text: "Archer stops the Bat." });
    await readPause(2600);
    // The result stays on the board until "Try it" or "Watch again" (both reset it).
    setWatched(true);
    setPhase("explain");
  }

  function startTry() {
    reset();
    setFeedback(null);
    setFollow(null);
    setPhase("pick");
  }

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
        miss(`Lighter: tried ${board.creatures[id].name} on the Bat`, v.myth, true);
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
      const toLighter = miss(`Tried ${board.creatures[selected].name} on ${board.creatures[id].name}`, v.myth);
      setFeedback({ tone: "bad", text: toLighter ? `${v.message} Let's try a simpler board.` : v.message });
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
      await readPause(2600);
      // The follow-up question only names cards you can see: clear the board
      // down to the two it's about (a question figure).
      reset();
      setFeedback(null);
      setPhase("follow");
      return;
    }
    const toLighter = miss(`Blocks: ${JSON.stringify(blocks)}`, v.myth);
    setFeedback({ tone: "bad", text: toLighter ? `${v.message} Let's try a simpler board.` : v.message });
    if (toLighter) {
      await fx.wait(900);
      reset();
      setPhase("pick");
    } else setPhase("missed");
  }

  function answerFollow(v: "yes" | "no") {
    setFollow(v);
    if (v === "yes") {
      dispatch({ type: "complete", step: "flying", at: now() });
      setFeedback({ tone: "good", text: "Flying limits who blocks you, not who you block." });
      setPhase("done");
    } else {
      miss("Thought flyers can't block ground creatures", FLYING.followUp.myth, true);
      setFeedback({ tone: "bad", text: FLYING.followUp.wrong });
    }
  }

  function backToFull() {
    dispatch({ type: "lighter-cleared", step: "flying" });
    setLighterPassed(false);
    reset();
    setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    setPhase("pick");
  }

  // The follow-up question gets its own figure: just the two cards it asks about.
  const figure = phase === "follow" || (phase === "done" && follow === "yes");
  const theirs = Object.values(board.creatures).filter((c) => c.controller === "opp" && (!figure || c.id === "thornBoar"));
  const yours = Object.values(board.creatures).filter((c) => c.controller === "you" && (!figure || c.id === "skyFinch"));
  const canPick = phase === "pick";
  const hintOn = progress.hints >= 3 && canPick && !lighter;
  const pairs = Object.entries(blocks).map(([from, to]) => ({ from, to }));
  const nBlocks = pairs.length;

  const headline = explaining
    ? FLYING.headline
    : lighter && canPick
      ? FLYING.lighter.prompt
      : phase === "follow"
        ? FLYING.followUp.question
        : phase === "done"
          ? "Step complete"
          : FLYING.prompt;

  return (
    <StepFrame
      n={3}
      title="Flying + reach"
      headingRef={headingRef}
      headline={headline}
      headlineRef={headlineRef}
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
                  fate={fates[c.id]}
                  card={CARDS[c.id as keyof typeof CARDS] as CardDef}
                  status="attacking"
                  tapped={c.tapped}
                  damage={damage[c.id]}
                  highlight={hintOn && (FLYING.hintHighlight as readonly string[]).includes(c.id)}
                  {...cardProps(c.id)}
                  onSelect={selected && !lighter ? () => onAttacker(c.id) : undefined}
                  disabled={!canPick}
                />
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
                  status={blocks[c.id] || (figure && follow === "yes" && c.id === "skyFinch") ? "blocking" : null}
                  damage={damage[c.id]}
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
              <HintButton level={progress.hints} total={FLYING.hints.length} onMore={() => dispatch({ type: "hint", step: "flying" })} />
            </>
          )}
          {canPick && lighter && lighterPassed && <Primary onClick={backToFull}>Back to the full board</Primary>}
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
          {canPick && !lighter && <HintText level={progress.hints} hints={FLYING.hints} />}
          <PinKey {...keyProps} />
        </>
      }
      announce={announce}
    />
  );
}
