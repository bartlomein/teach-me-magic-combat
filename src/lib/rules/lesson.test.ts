/**
 * Plays every lesson board and checks the outcomes the lesson promises.
 * If someone edits a card's stats, these tests catch a lesson that no longer works.
 */
import { describe as group, expect, it } from "vitest";
import { CARDS } from "@/lib/cards";
import { aiChooseAttackers } from "./ai";
import { canAttack, creatureFrom as c, declareAttackers, endTurn, newGame, resolveCombat } from "./engine";

group("Step 1: attacking", () => {
  const s = newGame({
    active: "you",
    creatures: [c(CARDS.emberPup), c(CARDS.mossGolem), c(CARDS.stormHawk, { enteredThisTurn: true })],
  });

  it("only Ember Pup and Moss Golem can attack", () => {
    const can = ["emberPup", "mossGolem", "stormHawk"].filter((id) => canAttack(s, id).ok);
    expect(can).toEqual(["emberPup", "mossGolem"]);
  });

  it("the right attack takes the opponent from 20 to 15", () => {
    const r = resolveCombat(declareAttackers(s, ["emberPup", "mossGolem"]), ["emberPup", "mossGolem"], {});
    expect(r.state.life.opp).toBe(15);
  });
});

group("Step 2: blocking", () => {
  const s = newGame({
    active: "opp",
    creatures: [c(CARDS.thornBoar), c(CARDS.emberPup), c(CARDS.mossGolem, { enteredThisTurn: true })],
  });

  it("Moss Golem kills the Boar and survives", () => {
    const r = resolveCombat(s, ["thornBoar"], { mossGolem: "thornBoar" });
    expect(r.state.graveyard).toEqual(["thornBoar"]);
    expect(r.state.creatures.mossGolem.damage).toBe(3);
  });

  it("Ember Pup dies and the Boar lives (myth M4)", () => {
    const r = resolveCombat(s, ["thornBoar"], { emberPup: "thornBoar" });
    expect(r.state.graveyard).toEqual(["emberPup"]);
    expect(r.state.creatures.thornBoar.damage).toBe(2);
  });

  it("no block costs 3 life", () => {
    expect(resolveCombat(s, ["thornBoar"], {}).state.life.you).toBe(17);
  });
});

group("Step 3: flying + reach", () => {
  const s = newGame({
    active: "opp",
    creatures: [c(CARDS.nightBat), c(CARDS.thornBoar), c(CARDS.mossGolem), c(CARDS.vineArcher), c(CARDS.skyFinch)],
  });

  it("Archer blocks Bat and Golem blocks Boar: both attackers die, you lose nothing", () => {
    const r = resolveCombat(s, ["nightBat", "thornBoar"], { vineArcher: "nightBat", mossGolem: "thornBoar" });
    expect(r.state.graveyard.sort()).toEqual(["nightBat", "thornBoar"]);
    expect(r.state.life.you).toBe(20);
  });

  it("Golem can't block the Bat (myth M5)", () => {
    expect(() => resolveCombat(s, ["nightBat"], { mossGolem: "nightBat" })).toThrow(/can't block a flyer/);
  });

  it("Finch blocking the Bat works, but Finch dies too", () => {
    const r = resolveCombat(s, ["nightBat"], { skyFinch: "nightBat" });
    expect(r.state.graveyard.sort()).toEqual(["nightBat", "skyFinch"]);
  });
});

group("Step 4: damage wears off", () => {
  it("Golem with 3 damage is fully healed next turn and survives another 3/3", () => {
    let s = newGame({ active: "opp", creatures: [c(CARDS.mossGolem, { damage: 3 }), c(CARDS.thornBoar)] });
    s = endTurn(endTurn(s)); // their turn ends, yours ends, their next turn
    expect(s.creatures.mossGolem.damage).toBe(0);
    const r = resolveCombat(s, ["thornBoar"], { mossGolem: "thornBoar" });
    expect(r.state.creatures.mossGolem).toBeDefined();
  });
});

group("Step 5: final challenge (the turn rules it relies on)", () => {
  // The full puzzle (their turn, then win on yours) is tested in lesson/steps.test.ts.
  const start = () =>
    newGame({
      active: "opp",
      life: { you: 5, opp: 4 },
      creatures: [c(CARDS.stormHawk), c(CARDS.mossGolem), c(CARDS.vineArcher), c(CARDS.cliffSpider), c(CARDS.nightBat), c(CARDS.thornBoar)],
    });

  it("the AI attacks with Night Bat and Thorn Boar; Cliff Spider (reach) stays home", () => {
    expect(aiChooseAttackers(start()).sort()).toEqual(["nightBat", "thornBoar"]);
  });

  it("their attackers stay tapped through your turn (502.3), so they can't block you", () => {
    let s = declareAttackers(start(), ["nightBat"]);
    s = endTurn(resolveCombat(s, ["nightBat"], {}).state);
    expect(s.active).toBe("you");
    expect(s.creatures.nightBat.tapped).toBe(true);
  });

  it("blocking doesn't tap: your blocker can attack on your turn (508.1f taps attackers only)", () => {
    let s = declareAttackers(start(), ["thornBoar"]);
    s = endTurn(resolveCombat(s, ["thornBoar"], { mossGolem: "thornBoar" }).state);
    expect(s.creatures.mossGolem.tapped).toBe(false);
    expect(canAttack(s, "mossGolem").ok).toBe(true);
  });
});
