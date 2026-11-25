"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type Dispatch, type Ref } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";
import {
  checkAssign,
  FINAL,
  FINAL_LIFE,
  finalBoard,
  finalTheirAttack,
  judgeAttack,
  judgeTheirTurn,
  missedWinMessage,
  readyAttackers,
} from "@/lib/lesson/steps";
import { declareAttackers, describe as describeCombat, resolveCombat, type Blocks, type GameState } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row, useBoardFx } from "../board/Board";
import { HintButton, HintText, OnSpot, Primary, Secondary, type Feedback } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";

const now = () => Date.now();

/** Reading time between beats. Not scaled by motion mode: it is for reading, not animation. */
const readPause = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase =
  | "intro"
  | "declaring" // their turn: Bat and Boar turn sideways as they attack
  | "block" // their turn: you pick blockers
  | "resolving1"
  | "fail1" // their turn left you no way to win
  | "handoff" // "Your turn."
  | "ask" // "Golem blocked. Can it attack now?"
  | "attack" // your turn: pick attackers
  | "resolving2"
  | "fail2" // the attack didn't win
  | "won";
type Fate = "alive" | "dying" | "gone";

const YOURS = ["stormHawk", "mossGolem", "vineArcher"] as const;
const THEIRS = ["cliffSpider", "thornBoar", "nightBat"] as const;
const name = (id: string) => (CARDS as Record<string, CardDef>)[id]?.name ?? id;

/**
 * Step 5: the final challenge, with everything visible. Their turn first: Bat
 * and Boar attack and you block. Then your turn: they have 4 life and one
 * untapped blocker, so you can work out the win from the board. Every answer is
 * checked by trying all the options on the real engine. Two misses switch on
 * the lighter version: the last hint and highlights show by themselves.
 */
export function StepFinal({
  progress,
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

  const [phase, setPhase] = useState<Phase>("intro");
  // Before Start nobody has attacked yet, so every creature is untapped.
  const [game, setGame] = useState<GameState>(finalBoard);
  const [theirAttackers, setTheirAttackers] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Blocks>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [combat, setCombat] = useState<{ attackers: string[]; blocks: Blocks }>({ attackers: [], blocks: {} });
  const [yourTurnStart, setYourTurnStart] = useState<GameState | null>(null);
  const [askAbout, setAskAbout] = useState<string | null>(null);
  const [asked, setAsked] = useState<"yes" | "no" | null>(null);
  const [dmg, setDmg] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [lives, setLives] = useState<{ you: number; opp: number }>({ ...FINAL_LIFE });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [announce, setAnnounce] = useState("");

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (phase === "block" || phase === "ask" || phase === "attack" || phase === "won") headlineRef.current?.focus();
  }, [phase]);

  function clearBoard() {
    setPick(null);
    setBlocks({});
    setSelected([]);
    setCombat({ attackers: [], blocks: {} });
    setDmg({});
    setFates({});
    setFeedback(null);
    fx.clearFx();
  }

  /** Their turn: Bat and Boar attack. They tap on screen as they attack (508.1f), then you block. */
  async function start() {
    clearBoard();
    const { state, attackers } = finalTheirAttack();
    setGame(finalBoard());
    setTheirAttackers(attackers);
    setLives({ ...FINAL_LIFE });
    setYourTurnStart(null);
    setAskAbout(null);
    setAsked(null);
    setPhase("declaring");
    setFeedback({ tone: "info", text: `Their turn. ${attackers.map(name).join(" and ")} attack you.` });
    await readPause(700);
    setGame(state); // attackers turn sideways
    setCombat({ attackers, blocks: {} });
    await readPause(1100);
    setPhase("block");
  }

  /** Back to the start of your turn (their turn's result stays). */
  function retryYourTurn() {
    if (!yourTurnStart) return start();
    clearBoard();
    setGame(yourTurnStart);
    setLives({ ...yourTurnStart.life });
    setFeedback({ tone: "info", text: `Your turn again. They have ${yourTurnStart.life.opp} life.` });
    setPhase("attack");
  }

  /** Animate one combat (clashes + unblocked hits at once), then deaths. Returns the new state. */
  async function fight(state: GameState, attackers: string[], b: Blocks, defender: "you" | "opp") {
    const r = resolveCombat(state, attackers, b);
    const fights = Object.entries(b).map(([blocker, attacker]) => ({
      attacker,
      blocker,
      toBlocker: state.creatures[attacker].power,
      toAttacker: state.creatures[blocker].power,
    }));
    const unblocked = attackers.filter((a) => !Object.values(b).includes(a)).map((id) => ({ id, amount: state.creatures[id].power }));
    const marks: Record<string, number> = {};
    for (const f of fights) {
      marks[f.blocker] = (marks[f.blocker] ?? 0) + f.toBlocker;
      marks[f.attacker] = (marks[f.attacker] ?? 0) + f.toAttacker;
    }
    await Promise.all([
      fights.length ? fx.clash(fights, () => setDmg(marks)) : Promise.resolve(),
      unblocked.length ? fx.hitPlayer(unblocked, defender, () => setLives({ ...r.state.life })) : Promise.resolve(),
    ]);
    setLives({ ...r.state.life });
    const dead = r.state.graveyard.filter((id) => !state.graveyard.includes(id));
    if (dead.length) {
      setFates((f) => ({ ...f, ...Object.fromEntries(dead.map((id) => [id, "dying" as Fate])) }));
      await fx.wait(fx.mode === "full" ? 900 : 600);
      setFates((f) => ({ ...f, ...Object.fromEntries(dead.map((id) => [id, "gone" as Fate])) }));
    }
    setAnnounce(describeCombat(state, r.events));
    return r.state;
  }

  // ---- Their turn: you block ----
  function onYours(id: string) {
    if (phase !== "block") return;
    if (blocks[id]) {
      setBlocks((cur) => Object.fromEntries(Object.entries(cur).filter(([b]) => b !== id)));
      setPick(null);
      return;
    }
    setFeedback(null);
    setPick((cur) => (cur === id ? null : id));
  }

  function onAttacker(id: string) {
    if (phase !== "block" || !pick) return;
    const v = checkAssign(game, pick, id);
    if (!v.ok) {
      fx.nope(pick);
      dispatch({ type: "miss", step: "final", myth: v.myth, note: `Tried ${name(pick)} on ${name(id)}`, at: now(), soft: true });
      setFeedback({ tone: "bad", text: v.message });
      setPick(null);
      return;
    }
    setBlocks((cur) => ({ ...Object.fromEntries(Object.entries(cur).filter(([, a]) => a !== id)), [pick]: id }));
    setPick(null);
  }

  async function confirmBlocks() {
    setPhase("resolving1");
    setFeedback(null);
    setCombat({ attackers: theirAttackers, blocks });
    await fight(game, theirAttackers, blocks, "you");
    const r = judgeTheirTurn(game, theirAttackers, blocks);
    if (!r.ok) {
      dispatch({ type: "miss", step: "final", myth: r.myth, note: `Blocked: ${Object.keys(blocks).map(name).join(", ") || "nothing"}`, at: now() });
      setFeedback({ tone: "bad", text: r.message });
      setPhase("fail1");
      return;
    }
    setFeedback({ tone: "good", text: r.message });
    await readPause(2800);

    // Your turn. Damage wears off; their attackers that lived stay tapped.
    clearBoard();
    setGame(r.next);
    setLives({ ...r.next.life });
    setYourTurnStart(r.next);
    setFeedback({ tone: "info", text: `Your turn. They have ${r.next.life.opp} life.` });
    setPhase("handoff");
    await readPause(2200);
    const subject = r.blockedAndLived.includes("mossGolem") ? "mossGolem" : (r.blockedAndLived[0] ?? null);
    setAskAbout(subject);
    setFeedback(null);
    setPhase(subject ? "ask" : "attack");
  }

  // ---- Your turn: a quick check, then attack ----
  function answerAsk(v: "yes" | "no") {
    if (asked) return;
    setAsked(v);
    if (v === "yes") setFeedback({ tone: "good", text: "Right. Blocking doesn't tap. Only attacking does." });
    else {
      dispatch({ type: "miss", step: "final", myth: "M10", note: `Thought ${name(askAbout!)} was tapped from blocking`, at: now(), soft: true });
      setFeedback({ tone: "bad", text: "It can. Blocking doesn't tap. Only attacking does." });
    }
  }

  function toggleAttacker(id: string) {
    if (phase !== "attack") return;
    setFeedback(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function attack() {
    const before = game;
    const attackers = selected;
    setPhase("resolving2");
    const declared = declareAttackers(before, attackers); // attackers tap (508.1f)
    setGame(declared);
    const j = judgeAttack(before, attackers);
    setCombat({ attackers, blocks: j.blocks });
    const blocked = Object.entries(j.blocks).map(([b, a]) => `${name(b)} blocks ${name(a)}.`);
    setFeedback({ tone: "info", text: blocked.length ? blocked.join(" ") : "They don't block." });
    await fx.wait(1200);
    const end = await fight(declared, attackers, j.blocks, "opp");
    setGame(end);
    if (j.win) {
      setFeedback({ tone: "good", text: "You win! Spider could only block one of your three." });
      if (lighter) dispatch({ type: "lighter-cleared", step: "final" });
      dispatch({ type: "complete", step: "final", at: now() });
      setPhase("won");
    } else {
      dispatch({ type: "miss", step: "final", note: `Attacked with ${attackers.map(name).join(", ")}`, at: now() });
      setFeedback({ tone: "bad", text: missedWinMessage(before, attackers, j.lifeLeft, j.blocks) });
      setPhase("fail2");
    }
  }

  // ---- What the board shows ----
  const intro = phase === "intro";
  const theirTurn = phase === "declaring" || phase === "block" || phase === "resolving1" || phase === "fail1";
  const yourTurn = !intro && !theirTurn;
  const status = (id: string): "attacking" | "blocking" | "tapped" | null => {
    if (phase === "attack" && selected.includes(id)) return "attacking";
    if (combat.attackers.includes(id)) return "attacking";
    if (phase === "block" && blocks[id]) return "blocking";
    if (Object.keys(combat.blocks).includes(id)) return "blocking";
    if (yourTurn && game.creatures[id]?.tapped) return "tapped";
    return null;
  };
  const linePairs =
    phase === "block"
      ? Object.entries(blocks).map(([from, to]) => ({ from, to }))
      : phase === "resolving1" || phase === "resolving2"
        ? Object.entries(combat.blocks).map(([from, to]) => ({ from, to }))
        : [];
  const hintLevel = lighter ? 3 : progress.hints;
  const hints = theirTurn ? FINAL.blockHints : FINAL.attackHints;
  const highlightIds: readonly string[] =
    hintLevel >= 3 ? (phase === "block" ? FINAL.blockHighlight : phase === "attack" ? readyAttackers(game) : []) : [];
  const ready = phase === "attack" ? readyAttackers(game) : [];

  const slot = (id: string) => {
    const c = game.creatures[id];
    const fate: Fate = fates[id] ?? (c ? "alive" : "gone");
    return { fate, c };
  };

  const headline =
    intro
      ? FINAL.headline
      : theirTurn
        ? phase === "fail1"
          ? "Not this time."
          : FINAL.promptBlock
        : phase === "handoff"
          ? "Your turn."
          : phase === "ask"
            ? `${name(askAbout ?? "")} blocked last turn. Can it attack now?`
            : phase === "fail2"
              ? "So close."
              : FINAL.promptAttack;

  return (
    <StepFrame
      n={5}
      title="Final challenge"
      headingRef={headingRef}
      headline={headline}
      headlineRef={headlineRef}
      speak={intro ? FINAL.speak : headline}
      howTo={
        intro
          ? FINAL.howTo
          : phase === "block"
            ? pick
              ? `Now tap the attacker ${name(pick)} blocks.`
              : "Turn 1 of 2. Tap your creature, then the attacker it blocks."
            : phase === "attack"
              ? `Turn 2 of 2. They have ${game.life.opp} life. Tap your attackers.`
              : undefined
      }
      bandActions={
        intro ? (
          <OnSpot primary onClick={start}>
            Start their turn
          </OnSpot>
        ) : undefined
      }
      board={
        <Board
          scope={fx.scope}
          layer={
            <>
              {fx.layer}
              {linePairs.length > 0 && <BlockLines scope={fx.scope} pairs={linePairs} />}
            </>
          }
          className="border-y-[3px] border-ink lg:border-y-0"
          between={
            intro ? null : (
              <motion.span
                key={theirTurn ? "them" : "you"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`inline-flex items-center gap-2 border-2 border-ink px-3 py-1 text-sm font-bold ${theirTurn ? "bg-hi" : "bg-panel"}`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  {theirTurn ? (
                    <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                {theirTurn ? "Turn 1: their turn" : "Turn 2: your turn"}
              </motion.span>
            )
          }
          caption={
            <>
              
              {theirTurn || intro
                ? `Their turn. You have ${FINAL_LIFE.you} life. Bat and Boar attack; Spider stays home.`
                : `Your turn. They have ${game.life.opp} life. Tapped creatures can't block.`}
            </>
          }
          opp={
            <Row side="opp" life={lives.opp}>
              {THEIRS.map((id) => {
                const { fate, c } = slot(id);
                return (
                  <CardSlot
                    key={id}
                    fate={fate}
                    card={CARDS[id] as CardDef}
                    status={status(id)}
                    tapped={c?.tapped}
                    damage={dmg[id]}
                    onSelect={phase === "block" && pick ? () => onAttacker(id) : undefined}
                    disabled={phase !== "block"}
                  />
                );
              })}
            </Row>
          }
          you={
            <Row side="you" life={lives.you}>
              {YOURS.map((id) => {
                const { fate, c } = slot(id);
                return (
                  <CardSlot
                    key={id}
                    fate={fate}
                    card={CARDS[id] as CardDef}
                    status={status(id)}
                    tapped={c?.tapped}
                    damage={dmg[id]}
                    pressed={phase === "attack" ? selected.includes(id) : phase === "block" ? pick === id || !!blocks[id] : undefined}
                    highlight={highlightIds.includes(id)}
                    onSelect={() => (phase === "attack" ? toggleAttacker(id) : onYours(id))}
                    disabled={phase === "attack" ? !ready.includes(id) : phase !== "block"}
                  />
                );
              })}
            </Row>
          }
        />
      }
      actions={
        <>
          {phase === "block" && (
            <>
              <Primary onClick={confirmBlocks}>{Object.keys(blocks).length ? `Block with ${Object.keys(blocks).length}` : "Don't block"}</Primary>
              {!lighter && <HintButton level={progress.hints} total={FINAL.blockHints.length} onMore={() => dispatch({ type: "hint", step: "final" })} />}
            </>
          )}
          {phase === "fail1" && <Primary onClick={start}>Try their turn again</Primary>}
          {phase === "ask" && (
            <>
              <Choice
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                answered={asked}
                correct="yes"
                onAnswer={answerAsk}
              />
              {asked && (
                <Primary
                  className="w-fit"
                  onClick={() => {
                    setFeedback(null);
                    setPhase("attack");
                  }}
                >
                  Continue
                </Primary>
              )}
            </>
          )}
          {phase === "attack" && (
            <>
              <Primary onClick={attack} disabled={selected.length === 0}>
                {selected.length ? `Attack with ${selected.length}` : "Pick attackers"}
              </Primary>
              {!lighter && <HintButton level={progress.hints} total={FINAL.attackHints.length} onMore={() => dispatch({ type: "hint", step: "final" })} />}
            </>
          )}
          {phase === "fail2" && (
            <>
              <Primary onClick={retryYourTurn}>Try your turn again</Primary>
              <Secondary onClick={start}>Start over</Secondary>
            </>
          )}
        </>
      }
      feedback={feedback}
      below={
        <>
          {(phase === "block" || phase === "attack") && <HintText level={hintLevel} hints={hints} />}
          {lighter && (phase === "block" || phase === "attack") && <p className="text-sm text-ink-soft">Extra help is on: the highlighted cards are the answer.</p>}
        </>
      }
      announce={announce}
      // Same finished state as every step; only the headline is its own.
      done={phase === "won"}
      doneHeadline="You win!"
      onNext={onNext}
      nextTitle={nextTitle}
    />
  );
}
