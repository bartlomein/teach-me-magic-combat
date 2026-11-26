import { describe as group, expect, it } from "vitest";
import { declareAttackers, resolveCombat } from "@/lib/rules/engine";
import {
  initialLesson,
  isLessonState,
  lessonReducer as r,
  resultOf,
  type LessonState,
} from "./lesson";
import {
  attackBoard,
  attackLighterBoard,
  checkAttackers,
  checkPick,
} from "./step-attack";

const started = (): LessonState =>
  r(initialLesson(), { type: "start", experience: "new", at: 1 });

group("lesson flow", () => {
  it("starts on the welcome screen with every step locked", () => {
    const s = initialLesson();
    expect(Object.values(s.steps).every((p) => p.status === "locked")).toBe(
      true,
    );
  });

  it("starting opens Step 1", () => {
    const s = started();
    expect(s.steps.attack.status).toBe("open");
    expect(s.steps.attack.startedAt).toBe(1);
  });

  it("starting twice changes nothing (a stale button can't reset Step 1)", () => {
    const s = r(started(), { type: "complete", step: "attack", at: 5 });
    expect(r(s, { type: "start", experience: "some", at: 6 })).toBe(s);
  });

  it("won't open a locked step", () => {
    const s = started();
    expect(r(s, { type: "open", step: "final", at: 2 })).toBe(s);
  });

  it("finishing a step unlocks the next one, which can then be opened", () => {
    let s = r(started(), { type: "complete", step: "attack", at: 5 });
    expect(s.steps.attack.status).toBe("done");
    expect(s.steps.block.status).toBe("open");
    s = r(s, { type: "open", step: "block", at: 6 });
    expect(s.steps.block.startedAt).toBe(6);
  });

  it("finished steps can be reviewed", () => {
    let s = r(started(), { type: "complete", step: "attack", at: 5 });
    s = r(s, { type: "open", step: "block", at: 6 });
    s = r(s, { type: "miss", step: "attack", note: "x", at: 7 });
    expect(r(s, { type: "open", step: "attack", at: 8 }).steps.attack.replayMisses).toBe(0);
  });

  it("two misses switch on the lighter version, and it stays cleared afterward", () => {
    let s = started();
    s = r(s, {
      type: "miss",
      step: "attack",
      myth: "M1",
      note: "picked Hawk",
      at: 2,
    });
    expect(s.steps.attack.lighter).toBe("no");
    s = r(s, { type: "miss", step: "attack", note: "left out Pup", at: 3 });
    expect(s.steps.attack.lighter).toBe("active");
    s = r(s, { type: "lighter-cleared", step: "attack" });
    s = r(s, { type: "miss", step: "attack", at: 4, note: "again" });
    expect(s.steps.attack.lighter).toBe("cleared"); // no endless loop back to the lighter board
  });

  it("soft misses are logged but don't switch on the lighter version", () => {
    let s = started();
    s = r(s, {
      type: "miss",
      step: "attack",
      myth: "M1",
      note: "picked new Storm Hawk",
      at: 2,
      soft: true,
    });
    s = r(s, {
      type: "miss",
      step: "attack",
      myth: "M1",
      note: "picked new Storm Hawk",
      at: 3,
      soft: true,
    });
    expect(s.steps.attack.lighter).toBe("no");
    expect(s.steps.attack.misses).toBe(2);
    expect(s.mistakes).toHaveLength(2);
  });

  it("logs every mistake with its myth for the report card", () => {
    const s = r(started(), {
      type: "miss",
      step: "attack",
      myth: "M1",
      note: "picked Hawk",
      at: 2,
    });
    expect(s.mistakes).toEqual([
      { step: "attack", myth: "M1", note: "picked Hawk", at: 2 },
    ]);
  });

  it("replaying a finished step doesn't add misses", () => {
    let s = r(started(), { type: "complete", step: "attack", at: 5 });
    s = r(s, { type: "miss", step: "attack", note: "x", at: 6 });
    expect(s.steps.attack.misses).toBe(0);
    expect(s.mistakes).toHaveLength(0);
    expect(s.steps.attack.replayMisses).toBe(1);
  });

  it("a replay is recorded as practice: clean, or not yet", () => {
    let s = r(started(), { type: "complete", step: "attack", at: 5 });
    s = r(s, { type: "open", step: "attack", at: 6 });
    s = r(s, { type: "miss", step: "attack", note: "x", at: 7 });
    s = r(s, { type: "complete", step: "attack", at: 8 });
    expect(s.steps.attack.practiced).toBe("missed");
    s = r(s, { type: "complete", step: "attack", at: 9 });
    expect(s.steps.attack.practiced).toBe("clean");
    expect(s.steps.attack.finishedAt).toBe(5); // the first-try record is untouched
  });

  it("hints cap at level 3", () => {
    let s = started();
    for (let i = 0; i < 5; i++) s = r(s, { type: "hint", step: "attack" });
    expect(s.steps.attack.hints).toBe(3);
  });

  it("grades a finished step", () => {
    const done = (s: LessonState) =>
      resultOf(r(s, { type: "complete", step: "attack", at: 9 }).steps.attack);
    expect(done(started())).toBe("first-try");
    expect(done(r(started(), { type: "hint", step: "attack" }))).toBe("hint");
    expect(
      done(r(started(), { type: "miss", step: "attack", note: "x", at: 2 })),
    ).toBe("retry");
  });
});

group("Step 1 checks", () => {
  const s = attackBoard();

  it("explains why Storm Hawk can't attack (M1)", () => {
    expect(checkPick(s, "stormHawk")).toMatchObject({ ok: false, myth: "M1" });
  });


  it("asks for every creature that can attack", () => {
    expect(checkAttackers(s, ["emberPup"])).toMatchObject({
      ok: false,
      message: expect.stringContaining("Moss Golem"),
    });
    expect(checkAttackers(s, ["emberPup", "mossGolem"]).ok).toBe(true);
  });


  it("the right attack takes them from 20 to 15", () => {
    const ids = ["emberPup", "mossGolem"];
    expect(
      resolveCombat(declareAttackers(s, ids), ids, {}).state.life.opp,
    ).toBe(15);
  });

  it("the lighter board has exactly one legal attacker", () => {
    const l = attackLighterBoard();
    expect(
      ["emberPup", "stormHawk"].filter((id) => checkPick(l, id).ok),
    ).toEqual(["emberPup"]);
  });
});

import { direction, resumeStep, SLUGS, stepFromSlug, stepHref } from "./lesson";

group("step URLs", () => {
  it("maps every step to a readable slug and back", () => {
    for (const [id, slug] of Object.entries(SLUGS)) expect(stepFromSlug(slug)).toBe(id);
    expect(stepHref("flying")).toBe("/learn/flying-and-reach");
    expect(stepFromSlug("nope")).toBeNull();
  });

  it("continues at the first open step", () => {
    let s = r(initialLesson(), { type: "start", experience: "new", at: 1 });
    expect(resumeStep(s)).toBe("attack");
    s = r(s, { type: "complete", step: "attack", at: 2 });
    expect(resumeStep(s)).toBe("block");
  });

  it("slides forward to later steps and back to earlier ones", () => {
    expect(direction("welcome", "attack")).toBe("nav-forward");
    expect(direction("flying", "attack")).toBe("nav-back");
    expect(direction("attack", "welcome")).toBe("nav-back");
  });
});

import { nextToDo } from "./lesson";

group("quick check (Played a bit)", () => {
  const qc = (attack: boolean, block: boolean, flying: boolean) =>
    r(initialLesson(), {
      type: "quick-check",
      at: 1,
      results: [
        { step: "attack", correct: attack, myth: "M1", note: "Q1" },
        { step: "block", correct: block, myth: "M2", note: "Q2" },
        { step: "flying", correct: flying, myth: "M5", note: "Q3" },
      ],
    });

  it("skips every step whose question was right and opens the first one left", () => {
    const s = qc(true, true, false);
    expect(s.steps.attack.status).toBe("skipped");
    expect(s.steps.block.status).toBe("skipped");
    expect(s.steps.flying.status).toBe("open");
  });

  it("logs wrong answers with their myth for the report card", () => {
    const s = qc(false, true, false);
    expect(s.mistakes.map((m) => m.myth)).toEqual(["M1", "M5"]);
    expect(s.steps.attack.status).toBe("open");
  });

  it("finishing a step passes over skipped steps to the next one to do", () => {
    let s = qc(false, true, true);
    s = r(s, { type: "complete", step: "attack", at: 2 });
    expect(s.steps.heal.status).toBe("open");
    expect(nextToDo(s, "attack")).toBe("heal");
  });

  it("skipped steps can still be opened for review", () => {
    const s = qc(true, false, false);
    expect(r(s, { type: "open", step: "attack", at: 3 })).not.toBe(s);
  });

  it("practicing a skipped step keeps it skipped: misses go to practice, not the first-try record", () => {
    let s = qc(true, false, false);
    s = r(s, { type: "open", step: "attack", at: 2 });
    s = r(s, { type: "miss", step: "attack", note: "x", at: 3 });
    s = r(s, { type: "miss", step: "attack", note: "y", at: 4 });
    expect(s.steps.attack.misses).toBe(0);
    expect(s.steps.attack.lighter).toBe("no");
    s = r(s, { type: "complete", step: "attack", at: 5 });
    expect(s.steps.attack.status).toBe("skipped");
    expect(s.steps.attack.practiced).toBe("missed");
    expect(resultOf(s.steps.attack)).toBe("skipped");
  });

  it("all three right still leaves Damage wears off (it's too short to skip)", () => {
    const s = qc(true, true, true);
    expect(s.steps.heal.status).toBe("open");
    expect(resultOf(s.steps.attack)).toBe("skipped");
  });

  it("taking it again after real progress changes nothing (Back button)", () => {
    let s = qc(false, false, false);
    s = r(s, { type: "complete", step: "attack", at: 2 });
    const again = r(s, {
      type: "quick-check",
      at: 3,
      results: [
        { step: "attack", correct: true, myth: "M1", note: "Q1" },
        { step: "block", correct: false, myth: "M2", note: "Q2" },
        { step: "flying", correct: false, myth: "M5", note: "Q3" },
      ],
    });
    expect(again).toBe(s);
    expect(again.steps.attack.status).toBe("done");
  });
});

group("saved lesson check", () => {
  it("accepts a real lesson, before and after progress", () => {
    const s = initialLesson();
    expect(isLessonState(s)).toBe(true);
    expect(isLessonState(JSON.parse(JSON.stringify(r(s, { type: "start", experience: "new", at: 1 }))))).toBe(true);
  });

  it("rejects old or broken saves instead of crashing later", () => {
    const s = initialLesson();
    const partial: Partial<typeof s.steps> = { ...s.steps };
    delete partial.block;
    expect(isLessonState({ ...s, steps: partial })).toBe(false);
    expect(isLessonState({ ...s, mistakes: "none" })).toBe(false);
    expect(isLessonState({ ...s, steps: { ...s.steps, attack: { ...s.steps.attack, status: "won" } } })).toBe(false);
    expect(isLessonState(null)).toBe(false);
  });
});
