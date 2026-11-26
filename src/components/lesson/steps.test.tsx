// @vitest-environment jsdom
/**
 * Screen tests: click through each step like a learner would, with the real
 * lesson reducer behind it. They check the teaching loop, not the pixels:
 * a miss is logged, two misses swap in the lighter board, and passing it
 * leads back to the full board and on to "Step complete".
 */
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe as group, expect, it } from "vitest";
import { renderStep } from "@/test/harness";
import { StepAttack } from "./StepAttack";
import { StepBlock } from "./StepBlock";
import { StepFinal } from "./StepFinal";
import { StepFlying } from "./StepFlying";
import { StepHeal } from "./StepHeal";
import { FINAL } from "@/lib/lesson/steps";
import { reading } from "./useStep";

const button = (name: string | RegExp) => screen.getByRole("button", { name });
/** A card on the board (the Key's lines can start with a card's name too). */
const card = (name: string) => {
  const onBoard = screen.getAllByRole("button", { name: new RegExp(`^${name}`) }).filter((b) => b.closest("[data-card-id]"));
  expect(onBoard).toHaveLength(1);
  return onBoard[0];
};
// Reading pauses at 2% speed: a 2.8 s pause takes 56 ms. Animations are already
// instant (the harness turns motion off).
beforeEach(() => {
  reading.scale = 0.02;
});
afterEach(() => {
  reading.scale = 1;
});

group("Step 1: Attacking", () => {
  it("two misses swap in the smaller board; passing it leads back and on to the win", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("attack", StepAttack);

    await u.click(button("Skip to try"));
    await u.click(card("Storm Hawk")); // new this turn: miss 1
    expect(lesson().steps.attack.misses).toBe(1);
    expect(lesson().mistakes[0].myth).toBe("M1");

    await u.click(card("Storm Hawk")); // miss 2: the lighter board
    expect(lesson().steps.attack.lighter).toBe("active");
    expect(screen.getByRole("heading", { name: "Which one can attack?" })).toBeTruthy();

    await u.click(card("Ember Pup"));
    await u.click(button("Back to the full board"));
    expect(lesson().steps.attack.lighter).toBe("cleared");

    await u.click(card("Ember Pup"));
    await u.click(card("Moss Golem"));
    await u.click(button("Attack with 2"));
    await screen.findByRole("heading", { name: "Step complete" });
    expect(lesson().steps.attack.status).toBe("done");
  });
});

group("Step 2: Blocking", () => {
  it("locks Try it and Watch again while the demo plays", async () => {
    reading.scale = 0.2; // long enough to look at the buttons mid-demo
    const u = userEvent.setup();
    renderStep("block", StepBlock);
    await u.click(button("Me"));
    await u.click(button("Watch it"));
    expect(button("Watching…").hasAttribute("disabled")).toBe(true);
    expect(button("Skip to try").hasAttribute("disabled")).toBe(true);
    await screen.findByRole("button", { name: "Watch again" }, { timeout: 4000 });
    expect(button("Try it").hasAttribute("disabled")).toBe(false);
  });

  it("a wrong first answer is a soft miss: logged, but no lighter board", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("block", StepBlock);
    await u.click(button("Them"));
    expect(lesson().mistakes).toHaveLength(1);
    expect(lesson().mistakes[0].soft).toBe(true);
    await u.click(button(/^Me/));
    expect(button("Watch it")).toBeTruthy();
  });

  it("two misses: the yes/no question; then the full board and the right block", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("block", StepBlock);
    await u.click(button("Me"));
    await u.click(button("Skip to try"));

    await u.click(button("Don't block"));
    await u.click(await screen.findByRole("button", { name: "Try again" }));
    expect(lesson().steps.block.misses).toBe(1);

    await u.click(button("Don't block"));
    await screen.findByRole("heading", { name: "Does Moss Golem kill the Boar and live?" });
    expect(lesson().steps.block.lighter).toBe("active");

    await u.click(button("Yes"));
    await u.click(button("Back to the full board"));
    await u.click(card("Moss Golem"));
    await u.click(button("Block with Moss Golem"));
    await screen.findByRole("heading", { name: "Step complete" });
    expect(lesson().steps.block.status).toBe("done");
  });
});

group("Step 3: Flying + reach", () => {
  it("a ground creature can't block the flyer; the right blocks lead to the follow-up", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("flying", StepFlying);
    await u.click(button("Skip to try"));

    await u.click(card("Moss Golem"));
    await u.click(card("Night Bat"));
    expect(lesson().mistakes.at(-1)?.myth).toBe("M5");

    await u.click(card("Vine Archer"));
    await u.click(card("Night Bat"));
    await u.click(card("Moss Golem"));
    await u.click(card("Thorn Boar"));
    await u.click(button("Block with 2"));
    await u.click(await screen.findByRole("button", { name: "Yes" }));
    await screen.findByRole("heading", { name: "Step complete" });
    expect(lesson().steps.flying.status).toBe("done");
  });
});

group("Step 4: Damage wears off", () => {
  it("predict, watch it heal, then see Golem survive", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("heal", StepHeal);
    await u.click(button("No, fully healed"));
    await u.click(await screen.findByRole("button", { name: "Yes, it survives" }));
    await screen.findByRole("heading", { name: "Step complete" });
    expect(lesson().steps.heal.status).toBe("done");
    expect(lesson().mistakes).toHaveLength(0);
  });
});

group("Step 5: Final challenge", () => {
  it("hints on their turn don't give away your turn's answer", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("final", StepFinal);
    await u.click(button("Start their turn"));
    await screen.findByText(/^Turn 1 of 2/);
    for (let i = 0; i < FINAL.blockHints.length; i++) await u.click(button(/hint/i));
    expect(lesson().steps.final.hints).toBe(3);

    await u.click(card("Vine Archer"));
    await u.click(card("Night Bat"));
    await u.click(card("Moss Golem"));
    await u.click(card("Thorn Boar"));
    await u.click(button("Block with 2"));
    await u.click(await screen.findByRole("button", { name: "Yes" }));
    await u.click(button("Continue"));

    // Your turn starts with no hint showing, and the Hint button back.
    for (const h of FINAL.attackHints) expect(screen.queryByText(h)).toBeNull();
    expect(button(/^Hint/)).toBeTruthy();
    expect(card("Storm Hawk").closest("[data-highlight='true']")).toBeNull();
  });

  it("block well on their turn, then attack with all three to win", async () => {
    const u = userEvent.setup();
    const { lesson, nextClicks } = renderStep("final", StepFinal);
    await u.click(button("Start their turn"));
    // Blocking opens once both attackers have turned sideways.
    await screen.findByText(/^Turn 1 of 2/, undefined);

    await u.click(card("Vine Archer"));
    await u.click(card("Night Bat"));
    await u.click(card("Moss Golem"));
    await u.click(card("Thorn Boar"));
    await u.click(button("Block with 2"));

    await u.click(await screen.findByRole("button", { name: "Yes" }));
    await u.click(button("Continue"));
    for (const name of ["Storm Hawk", "Moss Golem", "Vine Archer"]) await u.click(card(name));
    await u.click(button("Attack with 3"));
    await screen.findByRole("heading", { name: "You win!" });
    expect(lesson().steps.final.status).toBe("done");

    await act(() => u.click(button(/^Next:/)));
    expect(nextClicks()).toBe(1);
  });
});
