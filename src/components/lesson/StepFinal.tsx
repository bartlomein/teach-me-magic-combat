"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cardName, CARDS, type CardDef } from "@/lib/cards";
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
import { declareAttackers, type Blocks, type GameState } from "@/lib/rules/engine";
import { Board, BlockLines, CardSlot, Row } from "../board/Board";
import { HintButton, HintText, OnSpot, Primary, Secondary } from "./Coach";
import { Choice, StepFrame } from "./StepFrame";
import { useCombat, type Fate } from "./useCombat";
import { useStep, type StepProps } from "./useStep";

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

const YOURS = ["stormHawk", "mossGolem", "vineArcher"] as const;
const THEIRS = ["cliffSpider", "thornBoar", "nightBat"] as const;
const name = cardName;

export function StepFinal(props: StepProps) {
  const { onNext, nextTitle, headingRef } = props;
  const step = useStep<Phase>("final", props, "intro", ["block", "ask", "attack", "won"]);
  const { fx, phase, setPhase, feedback, setFeedback, lighter } = step;
  const combat = useCombat(fx, FINAL_LIFE);

  const [game, setGame] = useState<GameState>(finalBoard);
  const [theirAttackers, setTheirAttackers] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Blocks>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [shown, setShown] = useState<{ attackers: string[]; blocks: Blocks }>({ attackers: [], blocks: {} });
  const [yourTurnStart, setYourTurnStart] = useState<GameState | null>(null);
  const [askAbout, setAskAbout] = useState<string | null>(null);
  const [asked, setAsked] = useState<"yes" | "no" | null>(null);
  // Separate hints per turn: block hints must never reveal the attack answer.
  const [turnHints, setTurnHints] = useState({ block: 0, attack: 0 });
  const moreHint = (turn: "block" | "attack") => {
    setTurnHints((h) => ({ ...h, [turn]: h[turn] + 1 }));
    step.hint();
  };

  function clearBoard() {
    setPick(null);
    setBlocks({});
    setSelected([]);
    setShown({ attackers: [], blocks: {} });
    combat.clear();
    setFeedback(null);
    fx.clearFx();
  }

  function start() {
    clearBoard();
    const { state, attackers } = finalTheirAttack();
    setGame(finalBoard());
    setTheirAttackers(attackers);
    setYourTurnStart(null);
    setAskAbout(null);
    setAsked(null);
    setPhase("declaring");
    setFeedback({ tone: "info", text: `Their turn. ${attackers.map(name).join(" and ")} attack you.` });
    void step.sequence(async (beat) => {
      await beat(700);
      setGame(state); // attackers turn sideways
      setShown({ attackers, blocks: {} });
      await beat(1100);
      setPhase("block");
    });
  }

  function retryYourTurn() {
    if (!yourTurnStart) return start();
    step.run.cancel();
    clearBoard();
    setGame(yourTurnStart);
    combat.setLife({ ...yourTurnStart.life });
    setFeedback({ tone: "info", text: `Your turn again. They have ${yourTurnStart.life.opp} life.` });
    setPhase("attack");
  }

  async function fight(state: GameState, attackers: string[], b: Blocks, defender: "you" | "opp") {
    const r = await combat.play(state, attackers, b, defender);
    step.setAnnounce(r.text);
    return r.state;
  }

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
    const v = checkAssign(game, theirAttackers, pick, id);
    if (!v.ok) {
      fx.nope(pick);
      step.miss(`Tried ${name(pick)} on ${name(id)}`, v.myth, true);
      setFeedback({ tone: "bad", text: v.message });
      setPick(null);
      return;
    }
    setBlocks((cur) => ({ ...Object.fromEntries(Object.entries(cur).filter(([, a]) => a !== id)), [pick]: id }));
    setPick(null);
  }

  function confirmBlocks() {
    setPhase("resolving1");
    setFeedback(null);
    setShown({ attackers: theirAttackers, blocks });
    void step.sequence(async (beat) => {
      await beat(fight(game, theirAttackers, blocks, "you"));
      const r = judgeTheirTurn(game, theirAttackers, blocks);
      if (!r.ok) {
        step.miss(`Blocked: ${Object.keys(blocks).map(name).join(", ") || "nothing"}`, r.myth);
        setFeedback({ tone: "bad", text: r.message });
        setPhase("fail1");
        return;
      }
      setFeedback({ tone: "good", text: r.message });
      await beat(2800);

      clearBoard();
      setGame(r.next);
      combat.setLife({ ...r.next.life });
      setYourTurnStart(r.next);
      setFeedback({ tone: "info", text: `Your turn. They have ${r.next.life.opp} life.` });
      setPhase("handoff");
      await beat(2200);
      const subject = r.blockedAndLived.includes("mossGolem") ? "mossGolem" : (r.blockedAndLived[0] ?? null);
      setAskAbout(subject);
      setFeedback(null);
      setPhase(subject ? "ask" : "attack");
    });
  }

  function answerAsk(v: "yes" | "no") {
    if (asked) return;
    setAsked(v);
    if (v === "yes") setFeedback({ tone: "good", text: "Right. Blocking doesn't tap. Only attacking does." });
    else {
      step.miss(`Thought ${name(askAbout!)} was tapped from blocking`, "M8", true);
      setFeedback({ tone: "bad", text: "It can. Blocking doesn't tap. Only attacking does." });
    }
  }

  function toggleAttacker(id: string) {
    if (phase !== "attack") return;
    setFeedback(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function attack() {
    const before = game;
    const attackers = selected;
    setPhase("resolving2");
    const declared = declareAttackers(before, attackers); // attackers tap (508.1f)
    setGame(declared);
    const j = judgeAttack(before, attackers);
    setShown({ attackers, blocks: j.blocks });
    const blocked = Object.entries(j.blocks).map(([b, a]) => `${name(b)} blocks ${name(a)}.`);
    setFeedback({ tone: "info", text: blocked.length ? blocked.join(" ") : "They don't block." });
    void step.sequence(async (beat) => {
      await beat(fx.wait(1200));
      const ending = fight(declared, attackers, j.blocks, "opp");
      await beat(ending);
      setGame(await ending);
      if (j.win) {
        setFeedback({ tone: "good", text: "You win! Spider could only block one of your three." });
        if (lighter) step.clearLighter();
        step.complete();
        setPhase("won");
      } else {
        step.miss(`Attacked with ${attackers.map(name).join(", ")}`);
        setFeedback({ tone: "bad", text: missedWinMessage(before, attackers, j.lifeLeft, j.blocks) });
        setPhase("fail2");
      }
    });
  }

  const intro = phase === "intro";
  const theirTurn = phase === "declaring" || phase === "block" || phase === "resolving1" || phase === "fail1";
  const yourTurn = !intro && !theirTurn;
  const status = (id: string): "attacking" | "blocking" | "tapped" | null => {
    if (phase === "attack" && selected.includes(id)) return "attacking";
    if (shown.attackers.includes(id)) return "attacking";
    if (phase === "block" && blocks[id]) return "blocking";
    if (Object.keys(shown.blocks).includes(id)) return "blocking";
    if (yourTurn && game.creatures[id]?.tapped) return "tapped";
    return null;
  };
  const linePairs =
    phase === "block"
      ? Object.entries(blocks).map(([from, to]) => ({ from, to }))
      : phase === "resolving1" || phase === "resolving2"
        ? Object.entries(shown.blocks).map(([from, to]) => ({ from, to }))
        : [];
  const hintLevel = lighter ? 3 : theirTurn ? turnHints.block : turnHints.attack;
  const hints = theirTurn ? FINAL.blockHints : FINAL.attackHints;
  const highlightIds: readonly string[] =
    hintLevel >= 3 ? (phase === "block" ? FINAL.blockHighlight : phase === "attack" ? readyAttackers(game) : []) : [];
  const ready = phase === "attack" ? readyAttackers(game) : [];

  const slot = (id: string) => {
    const c = game.creatures[id];
    const fate: Fate = combat.fates[id] ?? (c ? "alive" : "gone");
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
      focusKey={step.focusKey}
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
            <Row side="opp" life={combat.life.opp}>
              {THEIRS.map((id) => {
                const { fate, c } = slot(id);
                return (
                  <CardSlot
                    key={id}
                    fate={fate}
                    card={CARDS[id] as CardDef}
                    status={status(id)}
                    tapped={c?.tapped}
                    damage={combat.damage[id]}
                    // Always a button: swapping it for a plain card mid-assign would drop keyboard focus.
                    onSelect={() => onAttacker(id)}
                    disabled={phase !== "block"}
                  />
                );
              })}
            </Row>
          }
          you={
            <Row side="you" life={combat.life.you}>
              {YOURS.map((id) => {
                const { fate, c } = slot(id);
                return (
                  <CardSlot
                    key={id}
                    fate={fate}
                    card={CARDS[id] as CardDef}
                    status={status(id)}
                    tapped={c?.tapped}
                    damage={combat.damage[id]}
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
              {!lighter && <HintButton level={turnHints.block} total={FINAL.blockHints.length} onMore={() => moreHint("block")} />}
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
              {!lighter && <HintButton level={turnHints.attack} total={FINAL.attackHints.length} onMore={() => moreHint("attack")} />}
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
      asking={phase === "ask"}
      feedback={feedback}
      below={
        <>
          {(phase === "block" || phase === "attack") && <HintText level={hintLevel} hints={hints} />}
          {lighter && (phase === "block" || phase === "attack") && <p className="text-sm text-ink-soft">Extra help is on: the highlighted cards are the answer.</p>}
        </>
      }
      announce={step.announce}
      done={phase === "won"}
      doneHeadline="You win!"
      onNext={onNext}
      nextTitle={nextTitle}
    />
  );
}
