import { describe as group, expect, it } from "vitest";
import { aiChooseBlocks } from "@/lib/rules/ai";
import { canWinNow, checkAssign, finalTheirAttack, flyingBoard, judgeAttack, judgeBlock, judgeFlying, judgeTheirTurn } from "./steps";

group("Step 2 checks", () => {
  it("Golem is the right block", () => expect(judgeBlock("mossGolem").ok).toBe(true));
  it("Pup dies and the Boar lives (M4)", () => expect(judgeBlock("emberPup")).toMatchObject({ ok: false, myth: "M4" }));
  it("no block costs 3 life (M3: the new Golem could block)", () =>
    expect(judgeBlock(null)).toMatchObject({ ok: false, myth: "M3", message: expect.stringMatching(/take 3/) }));
});

const FLY_ATTACKERS = ["nightBat", "thornBoar"];

group("Step 3 checks", () => {
  it("Golem can't block the Bat (M5)", () => expect(checkAssign(flyingBoard(), FLY_ATTACKERS, "mossGolem", "nightBat")).toMatchObject({ ok: false, myth: "M5" }));
  it("Archer can block the Bat; Finch can block the Boar (M6 myth is wrong)", () => {
    expect(checkAssign(flyingBoard(), FLY_ATTACKERS, "vineArcher", "nightBat").ok).toBe(true);
    expect(checkAssign(flyingBoard(), FLY_ATTACKERS, "skyFinch", "thornBoar").ok).toBe(true);
  });
  it("Archer on Bat + Golem on Boar loses nothing", () =>
    expect(judgeFlying({ vineArcher: "nightBat", mossGolem: "thornBoar" }).ok).toBe(true));
  it("Finch on the Bat works but Finch dies (M4)", () =>
    expect(judgeFlying({ skyFinch: "nightBat", mossGolem: "thornBoar" })).toMatchObject({ myth: "M4", message: expect.stringMatching(/Finch dies/) }));
  it("leaving an attacker unblocked is a choice, not a myth", () =>
    expect(judgeFlying({ vineArcher: "nightBat" })).toEqual({ ok: false, message: "You'd take 3. Block both attackers." }));
  it("leaving the Bat unblocked costs 2", () => expect(judgeFlying({ mossGolem: "thornBoar" }).message).toMatch(/take 2/));
});

group("Step 5: their turn, then win on yours", () => {
  const { state: declared, attackers } = finalTheirAttack();
  const turn = (blocks: Record<string, string>) => judgeTheirTurn(declared, attackers, blocks);

  it("they attack with Bat and Boar; Spider (reach) stays home", () => expect([...attackers].sort()).toEqual(["nightBat", "thornBoar"]));

  it("best blocks: both attackers die, you lose nothing, and you can win", () => {
    const r = turn({ vineArcher: "nightBat", mossGolem: "thornBoar" });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.next.creatures).sort()).toEqual(["cliffSpider", "mossGolem", "stormHawk", "vineArcher"]);
    expect(r.blockedAndLived.sort()).toEqual(["mossGolem", "vineArcher"]);
    expect(r.next.active).toBe("you");
  });

  it("letting Bat through still works: you take 2 and Bat stays tapped", () => {
    const r = turn({ mossGolem: "thornBoar" });
    expect(r.ok).toBe(true);
    expect(r.next.life.you).toBe(3);
    expect(r.next.creatures.nightBat.tapped).toBe(true);
    expect(r.message).toMatch(/Night Bat is still tapped/);
  });

  it("trading Hawk for Bat leaves no way to win (M4), and says why", () => {
    const r = turn({ stormHawk: "nightBat", mossGolem: "thornBoar" });
    expect(r).toMatchObject({ ok: false, myth: "M4" });
    expect(r.message).toMatch(/Vine Archer could block Night Bat/);
  });

  it("Archer blocking Boar dies, and you can't win", () => {
    const r = turn({ vineArcher: "thornBoar" });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Moss Golem can block Thorn Boar/);
  });

  it("no blocks: 5 damage, you lose", () => {
    const r = turn({});
    expect(r.ok).toBe(false);
    expect(r.next.life.you).toBe(0);
  });

  const yourTurn = turn({ vineArcher: "nightBat", mossGolem: "thornBoar" }).next;

  it("the defender chump-blocks with Spider when it must: it blocks a 3-power attacker", () => {
    const blocks = aiChooseBlocks(yourTurn, ["stormHawk", "mossGolem", "vineArcher"]);
    expect(Object.keys(blocks)).toEqual(["cliffSpider"]);
    expect(["stormHawk", "mossGolem"]).toContain(blocks.cliffSpider);
  });

  it("all three attacking wins (7 power, Spider stops 3, 4 gets through)", () =>
    expect(judgeAttack(yourTurn, ["stormHawk", "mossGolem", "vineArcher"])).toMatchObject({ win: true }));

  it("leaving Archer home falls 1 short", () => expect(judgeAttack(yourTurn, ["stormHawk", "mossGolem"])).toMatchObject({ win: false, lifeLeft: 1 }));

  it("there is a winning attack on the good paths", () => expect(canWinNow(yourTurn)).toBe(true));
});

group("Step 5 checks", () => {
  it("only attacking creatures can be blocked (Cliff Spider stays home)", () => {
    const { state, attackers } = finalTheirAttack();
    expect(checkAssign(state, attackers, "mossGolem", "cliffSpider")).toMatchObject({ ok: false, message: expect.stringMatching(/attacking/) });
    expect(checkAssign(state, attackers, "mossGolem", "thornBoar").ok).toBe(true);
  });
});
