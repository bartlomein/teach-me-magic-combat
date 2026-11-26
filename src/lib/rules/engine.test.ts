import { describe as group, expect, it } from "vitest";
import { CARDS } from "@/lib/cards";
import {
  canAttack,
  canBlock,
  creatureFrom,
  declareAttackers,
  describe,
  endTurn,
  newGame,
  resolveCombat,
} from "./engine";

const c = creatureFrom;

group("attacking", () => {
  it("taps attackers when declared (508.1f)", () => {
    const s = newGame({ active: "you", creatures: [c(CARDS.emberPup)] });
    expect(declareAttackers(s, ["emberPup"]).creatures.emberPup.tapped).toBe(true);
  });

  it("stops a creature that is new this turn from attacking (302.6)", () => {
    const s = newGame({ active: "you", creatures: [c(CARDS.stormHawk, { enteredThisTurn: true })] });
    const v = canAttack(s, "stormHawk");
    expect(v).toMatchObject({ ok: false, reason: "new-this-turn", myth: "M1" });
    expect(() => declareAttackers(s, ["stormHawk"])).toThrow(/new this turn/);
  });

  it("stops tapped creatures and the non-active player's creatures from attacking", () => {
    const s = newGame({ active: "you", creatures: [c(CARDS.emberPup, { tapped: true }), c(CARDS.thornBoar)] });
    expect(canAttack(s, "emberPup")).toMatchObject({ ok: false, reason: "tapped" });
    expect(canAttack(s, "thornBoar")).toMatchObject({ ok: false, reason: "not-yours" });
  });

  it("deals an unblocked attacker's power to the defending player (510.1a)", () => {
    let s = newGame({ active: "you", creatures: [c(CARDS.emberPup), c(CARDS.mossGolem)] });
    s = declareAttackers(s, ["emberPup", "mossGolem"]);
    const r = resolveCombat(s, ["emberPup", "mossGolem"], {});
    expect(r.state.life.opp).toBe(15);
  });
});

group("blocking", () => {
  const defending = () =>
    newGame({
      active: "opp",
      creatures: [c(CARDS.thornBoar), c(CARDS.emberPup), c(CARDS.mossGolem, { enteredThisTurn: true })],
    });

  it("lets a creature that is new this turn block (302.6 only limits attacking)", () => {
    expect(canBlock(defending(), "mossGolem", "thornBoar").ok).toBe(true);
  });

  it("only lets the defending player block", () => {
    expect(canBlock(defending(), "thornBoar", "emberPup")).toMatchObject({ ok: false, myth: "M2" });
  });

  it("stops tapped creatures from blocking (509.1a)", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.mossGolem, { tapped: true })] });
    expect(canBlock(s, "mossGolem", "thornBoar")).toMatchObject({ ok: false, reason: "tapped", myth: "M7" });
  });

  it("deals damage simultaneously, so both creatures can die (510.2)", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.nightBat), c(CARDS.skyFinch)] });
    const r = resolveCombat(s, ["nightBat"], { skyFinch: "nightBat" });
    expect(r.state.graveyard.sort()).toEqual(["nightBat", "skyFinch"]);
  });

  it("keeps a blocked attacker's damage off the player (510.1c)", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.emberPup)] });
    const r = resolveCombat(s, ["thornBoar"], { emberPup: "thornBoar" });
    expect(r.state.life.you).toBe(20);
  });

  it("lets the attacker split damage freely between two blockers (510.1c, no damage order)", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.emberPup), c(CARDS.skyFinch)] });
    const r = resolveCombat(
      s,
      ["thornBoar"],
      { emberPup: "thornBoar", skyFinch: "thornBoar" },
      { thornBoar: { emberPup: 1, skyFinch: 2 } },
    );
    expect(r.state.graveyard).toEqual(expect.arrayContaining(["emberPup", "skyFinch"]));
  });

  it("rejects a split that doesn't add up to the attacker's power", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.emberPup), c(CARDS.skyFinch)] });
    expect(() =>
      resolveCombat(s, ["thornBoar"], { emberPup: "thornBoar", skyFinch: "thornBoar" }, { thornBoar: { emberPup: 1 } }),
    ).toThrow(/exactly 3/);
  });
});

group("flying and reach (702.9b, 702.17b)", () => {
  const s = newGame({
    active: "opp",
    creatures: [c(CARDS.nightBat), c(CARDS.thornBoar), c(CARDS.mossGolem), c(CARDS.vineArcher), c(CARDS.skyFinch)],
  });

  it("stops a ground creature from blocking a flyer", () => {
    expect(canBlock(s, "mossGolem", "nightBat")).toMatchObject({ ok: false, myth: "M4" });
  });

  it("lets reach and flying creatures block a flyer", () => {
    expect(canBlock(s, "vineArcher", "nightBat").ok).toBe(true);
    expect(canBlock(s, "skyFinch", "nightBat").ok).toBe(true);
  });

  it("lets a flyer block a ground creature", () => {
    expect(canBlock(s, "skyFinch", "thornBoar").ok).toBe(true);
  });
});

group("end of turn", () => {
  it("removes all damage (514.2)", () => {
    const s = newGame({ active: "you", creatures: [c(CARDS.mossGolem, { damage: 3 })] });
    expect(endTurn(s).creatures.mossGolem.damage).toBe(0);
  });

  it("untaps only the next player's creatures (502.3)", () => {
    const s = newGame({
      active: "you",
      creatures: [c(CARDS.mossGolem, { tapped: true }), c(CARDS.thornBoar, { tapped: true })],
    });
    const next = endTurn(s);
    expect(next.active).toBe("opp");
    expect(next.creatures.thornBoar.tapped).toBe(false); // opponent untaps
    expect(next.creatures.mossGolem.tapped).toBe(true); // yours stays tapped through their turn
  });

  it("clears 'new this turn' when its controller's turn begins", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.stormHawk, { enteredThisTurn: true })] });
    expect(endTurn(s).creatures.stormHawk.enteredThisTurn).toBe(false);
  });
});

group("losing (704.5a)", () => {
  it("reports a loss at 0 life", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar)], life: { you: 3 } });
    const r = resolveCombat(s, ["thornBoar"], {});
    expect(r.events).toContainEqual({ type: "loses", player: "you" });
  });
});

group("text twin", () => {
  it("describes a combat in one plain sentence for screen readers", () => {
    const s = newGame({ active: "opp", creatures: [c(CARDS.thornBoar), c(CARDS.mossGolem)] });
    const r = resolveCombat(s, ["thornBoar"], { mossGolem: "thornBoar" });
    expect(describe(s, r.events)).toBe(
      "Thorn Boar deals 3 to Moss Golem. Moss Golem deals 3 to Thorn Boar. Thorn Boar dies.",
    );
  });
});
