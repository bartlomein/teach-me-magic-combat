"use client";

import { animate, stagger } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type Ref } from "react";
import { CARDS } from "@/lib/cards";
import type { LessonAction, StepProgress } from "@/lib/lesson/lesson";
import { takeArrival } from "@/lib/lesson/store";
import {
  ATTACK,
  attackBoard,
  attackLighterBoard,
  checkAttackers,
  checkPick,
} from "@/lib/lesson/step-attack";
import {
  declareAttackers,
  resolveCombat,
  type Creature,
  type Myth,
} from "@/lib/rules/engine";
import { AttackArrow, Board, Row, useBoardFx } from "../board/Board";
import { Card } from "../Card";
import { HintButton, HintText, OnSpot, PinKey, Primary, type Feedback } from "./Coach";
import { StepFrame } from "./StepFrame";

/**
 * Step 1: Attacking. Loop: Explain → Watch → Try (pick attackers, then pick a
 * target) → Feedback. Two misses swap in the lighter board, then back.
 */

/** Clock for the mistake log. Only called from event handlers, never during render. */
const now = () => Date.now();

type Phase = "explain" | "watch" | "pick" | "resolving" | "done";

export function StepAttack({
  progress,
  lighterNext,
  dispatch,
  onNext,
  nextTitle,
  headingRef,
}: {
  progress: StepProgress;
  /** The lesson focuses this heading when the step opens. */
  headingRef: Ref<HTMLHeadingElement>;
  /** True when one more miss switches on the lighter board (from the lesson reducer). */
  lighterNext: boolean;
  dispatch: Dispatch<LessonAction>;
  onNext: () => void;
  nextTitle: string | null;
}) {
  const fx = useBoardFx();

  // Arriving from the basics screen: Ember Pup and both life totals fly in from
  // the primer (shared elements), and the rest of the table is dealt around them,
  // one card at a time. Runs before paint so the cards never flash in first; no
  // cleanup on purpose, so React's dev double-run can't freeze them mid-deal.
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
  const lighter = progress.lighter === "active";
  const board = useMemo(
    () => (lighter ? attackLighterBoard() : attackBoard()),
    [lighter],
  );

  const [phase, setPhase] = useState<Phase>("explain");
  const [watched, setWatched] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [tapped, setTapped] = useState<string[]>([]);
  const [attacking, setAttacking] = useState<string[]>([]);
  const [oppLife, setOppLife] = useState(20);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  /** The card the current correction is about: its pin and Key line stay visible. */
  const [flagged, setFlagged] = useState<string | null>(null);
  /** The pinned card in focus (hover, keyboard focus or tap), shared by the board and the Key. */
  const [activePin, setActivePin] = useState<string | null>(null);
  const [lighterPassed, setLighterPassed] = useState(false);
  const [announce, setAnnounce] = useState("");

  // Move focus to the prompt whenever the task changes, so keyboard and
  // screen-reader users always land on "what to do next".
  const promptRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (phase === "pick" || phase === "done")
      promptRef.current?.focus();
  }, [phase, lighter]);

  const yours = Object.values(board.creatures).filter(
    (c) => c.controller === "you",
  );
  const theirs = Object.values(board.creatures).filter(
    (c) => c.controller === "opp",
  );
  const hintOn = progress.hints >= 3 && phase === "pick" && !lighter;

  /** Ties a correction to the board: "Storm Hawk" becomes "Storm Hawk (B)" when it has a pin. */
  function namePin(message: string, c: Creature) {
    const pin = lighter ? undefined : ATTACK.pins.find((p) => p.id === c.id)?.letter;
    return pin ? message.replace(c.name, `${c.name} (${pin})`) : message;
  }

  /** Records a mistake. Returns true when it switches on the lighter board. */
  function recordMiss(note: string, myth?: Myth, soft = false) {
    dispatch({ type: "miss", step: "attack", myth, note, at: now(), soft });
    return !soft && lighterNext;
  }

  function resetBoard() {
    setFlagged(null);
    setSelected([]);
    setTapped([]);
    setAttacking([]);
    setOppLife(20);
    fx.clearFx();
  }

  // ---- Watch: Ember Pup taps, rushes their life total, 20 → 18. Then the board resets. ----
  async function watch() {
    resetBoard();
    setFeedback(null);
    setPhase("watch");
    setAnnounce("");
    await fx.wait(300);
    setTapped(["emberPup"]);
    setAttacking(["emberPup"]);
    await fx.wait(650);
    await fx.hitPlayer([{ id: "emberPup", amount: 2 }], "opp", () =>
      setOppLife(18),
    );
    setAnnounce(
      "Ember Pup turns sideways to attack, and hits your opponent for 2. Their life goes from 20 to 18.",
    );
    await fx.wait(1200);
    // Leave the result on the board (Pup tapped, opponent at 18) so it can be
    // studied. "Try it" and "Watch again" both reset it.
    setWatched(true);
    setPhase("explain");
  }

  function startTry() {
    resetBoard();
    setFlagged(null);
    setFeedback(null);
    setPhase("pick");
  }

  // ---- Pick attackers ----
  function onCard(c: Creature) {
    if (phase === "pick") {
      const v = checkPick(board, c.id);
      if (!v.ok) {
        fx.nope(c.id);
        const text = namePin(v.message, c);
        if (c.controller === "opp") {
          setFlagged(c.id);
          setFeedback({ tone: "info", text }); // just a pointer, not a mistake
          return;
        }
        const toLighter = recordMiss(`Tried to attack with ${c.name}`, v.myth);
        setFeedback({ tone: "bad", text: toLighter ? `${text} Let's try a smaller board.` : text });
        if (toLighter) resetBoard();
        else setFlagged(c.id);
        return;
      }
      if (lighter) {
        // Lighter version: one tap answers "Which one can attack?"
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

  function backToFull() {
    dispatch({ type: "lighter-cleared", step: "attack" });
    setLighterPassed(false);
    resetBoard();
    setFeedback({ tone: "info", text: "Now the full board. Same idea." });
    setPhase("pick");
  }

  async function confirmAttackers() {
    const v = checkAttackers(board, selected);
    if (!v.ok) {
      const toLighter = recordMiss(
        `Attacked with ${selected.length} of 2`,
        v.myth,
      );
      setFeedback({
        tone: "bad",
        text: toLighter ? `${v.message} Let's try a smaller board.` : v.message,
      });
      if (toLighter) resetBoard();
      return;
    }
    // Declaring attackers taps them (508.1f): they turn sideways. With no
    // planeswalkers or battles in this lesson, attacks always go at the player.
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
    setAnnounce(
      `Ember Pup and Moss Golem attack your opponent and hit for 5. Their life goes from 20 to ${result.state.life.opp}.`,
    );
    dispatch({ type: "complete", step: "attack", at: now() });
    setFeedback({ tone: "good", text: `${ATTACK.win} ${ATTACK.after}` });
    setPhase("done");
  }

  // The finished state (headline, Next button) comes from StepFrame.
  const prompt = phase === "pick" ? (lighter ? ATTACK.prompts.pickLighter : ATTACK.prompts.pick) : "Attack!";

  const n = selected.length;

  const explaining = phase === "explain" || phase === "watch";
  // Pins mark only what matters right now: B (new this turn) while explaining and
  // from hint 2; any card a correction names.
  const pinVisible = (id: string) => {
    if (lighter) return false;
    if (id === flagged) return true;
    const pin = ATTACK.pins.find((p) => p.id === id);
    if (!pin) return false;
    if (explaining) return pin.when.includes("explain");
    if (phase === "pick") return progress.hints >= 2 && pin.when.includes("pick-hint");
    return false;
  };
  const pinFor = (id: string) => (pinVisible(id) ? ATTACK.pins.find((p) => p.id === id)?.letter : undefined);
  const keyPins = ATTACK.pins.filter((p) => pinVisible(p.id));

  // ---- Linked highlighting: a pinned card and its Key line light up together. ----
  const letterOf = (id: string | null) => ATTACK.pins.find((p) => p.id === id)?.letter ?? null;
  const idOf = (letter: string | null) => ATTACK.pins.find((p) => p.letter === letter)?.id ?? null;
  const shownActive = activePin && pinFor(activePin) ? activePin : null;
  const scrollTo = (el: Element | null | undefined) =>
    el?.scrollIntoView({ block: "nearest", behavior: fx.mode === "full" ? "smooth" : "auto" });
  const pinProps = (id: string) => {
    const letter = pinFor(id);
    if (!letter) return {};
    const note = ATTACK.pins.find((p) => p.id === id)!;
    return {
      pinState: shownActive ? (shownActive === id ? "active" : "dim") : undefined,
      pinNote: `Note ${letter}: ${note.text}`,
      onPinHover: (on: boolean) => setActivePin((cur) => (on ? id : cur === id ? null : cur)),
      // Phones: the Key sits under the board, so bring its line into view.
      onPinTap: () => {
        setActivePin(id);
        scrollTo(document.getElementById(`key-${letter}`));
      },
    } as const;
  };
  const arrowOn = phase === "watch" || phase === "resolving" || phase === "done";

  return (
    <StepFrame
      n={1}
      title={ATTACK.title}
      headingRef={headingRef}
      // One sentence while explaining. The Watch demo shows the rest (attackers
      // turn sideways), and the board marks the exception (pin A: new this turn).
      headline={explaining ? ATTACK.headline : prompt}
      headlineRef={promptRef}
      speak={explaining ? ATTACK.explain : prompt}
      howTo={
        phase === "pick"
          ? lighter
            ? "A smaller board first. Then back to the full one."
            : "Tap your creatures, then press Attack."
          : phase === "resolving"
            ? "Attackers go at the player."
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
                  pin={pinFor(c.id)}
                  {...pinProps(c.id)}
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
                  pin={pinFor(c.id)}
                  {...pinProps(c.id)}
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
                <HintButton level={progress.hints} total={ATTACK.hints.length} onMore={() => dispatch({ type: "hint", step: "attack" })} />
              </>
            )}
            {phase === "pick" && lighter && lighterPassed && <Primary onClick={backToFull}>Back to the full board</Primary>}
          </>
        )
      }
      feedback={feedback}
      below={
        <>
          {phase === "pick" && !lighter && <HintText level={progress.hints} hints={ATTACK.hints} />}
          <PinKey
            pins={keyPins}
            active={letterOf(shownActive)}
            onHover={(letter) => setActivePin(idOf(letter))}
            onTap={(letter) => {
              const id = idOf(letter);
              setActivePin(id);
              scrollTo(document.querySelector(`[data-card-id="${id}"]`));
            }}
          />
        </>
      }
      announce={announce}
      done={phase === "done"}
      onNext={onNext}
      nextTitle={nextTitle}
    />
  );
}
