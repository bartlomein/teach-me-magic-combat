// @vitest-environment jsdom
/**
 * Screen tests: click through each step like a learner would, with the real
 * lesson reducer behind it. They check the teaching loop, not the pixels:
 * a miss is logged, two misses swap in the lighter board, and passing it
 * leads back to the full board and on to "Step complete".
 */
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe as group, expect, it } from "vitest";
import { renderStep } from "@/test/harness";
import { StepAttack } from "./StepAttack";
import { StepBlock } from "./StepBlock";
import { StepFinal } from "./StepFinal";
import { StepFlying } from "./StepFlying";
import { StepHeal } from "./StepHeal";

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const card = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
/** Reading pauses are real time (they're for reading, not animation). */
const slow = { timeout: 9000 };

group("Step 1: Attacking", () => {
  it("two misses swap in the smaller board; passing it leads back and on to the win", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("attack", StepAttack);

    await u.click(button("Skip to try"));
    await u.click(card("Storm Hawk")); // new this turn: miss 1
    expect(lesson().steps.attack.misses).toBe(1);
    expect(lesson().mistakes[0].myth).toBe("M2");

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

  it("the opponent's creature is a pointer, not a mistake", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("attack", StepAttack);
    await u.click(button("Skip to try"));
    const theirs = screen.getAllByRole("button").find((b) => /opponent's creature/.test(b.getAttribute("aria-label") ?? ""));
    await u.click(theirs!);
    expect(lesson().mistakes).toHaveLength(0);
  });

  it("locks Try it and Watch again while the demo plays", async () => {
    localStorage.setItem("teachme.motion", "full");
    const u = userEvent.setup();
    renderStep("attack", StepAttack);
    localStorage.setItem("teachme.motion", "full");
    await u.click(button("Watch it"));
    expect(button("Watching…").hasAttribute("disabled")).toBe(true);
    expect(button("Skip to try").hasAttribute("disabled")).toBe(true);
    await screen.findByRole("button", { name: "Watch again" }, slow);
    expect(button("Try it").hasAttribute("disabled")).toBe(false);
  }, 12000);
});

group("Step 2: Blocking", () => {
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
    await screen.findByRole("heading", { name: "Does Moss Golem kill the Boar and live?" }, slow);
    expect(lesson().steps.block.lighter).toBe("active");

    await u.click(button("Yes"));
    await u.click(button("Back to the full board"));
    await u.click(card("Moss Golem"));
    await u.click(button("Block with Moss Golem"));
    await screen.findByRole("heading", { name: "Step complete" }, slow);
    expect(lesson().steps.block.status).toBe("done");
  }, 15000);
});

group("Step 3: Flying + reach", () => {
  it("a ground creature can't block the flyer; the right blocks lead to the follow-up", async () => {
    const u = userEvent.setup();
    const { lesson } = renderStep("flying", StepFlying);
    await u.click(button("Skip to try"));

    await u.click(card("Moss Golem"));
    await u.click(card("Night Bat"));
    expect(lesson().mistakes.at(-1)?.myth).toBe("M6");

    await u.click(card("Vine Archer"));
    await u.click(card("Night Bat"));
    await u.click(card("Moss Golem"));
    await u.click(card("Thorn Boar"));
    await u.click(button("Block with 2"));
    await u.click(await screen.findByRole("button", { name: "Yes" }, slow));
    await screen.findByRole("heading", { name: "Step complete" });
    expect(lesson().steps.flying.status).toBe("done");
  }, 15000);
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
  it("block well on their turn, then attack with all three to win", async () => {
    const u = userEvent.setup();
    const { lesson, nextClicks } = renderStep("final", StepFinal);
    await u.click(button("Start their turn"));
    // Blocking opens once both attackers have turned sideways.
    await screen.findByText(/^Turn 1 of 2/, undefined, slow);

    await u.click(card("Vine Archer"));
    await u.click(card("Night Bat"));
    await u.click(card("Moss Golem"));
    await u.click(card("Thorn Boar"));
    await u.click(button("Block with 2"));

    await u.click(await screen.findByRole("button", { name: "Yes" }, slow));
    await u.click(button("Continue"));
    for (const name of ["Storm Hawk", "Moss Golem", "Vine Archer"]) await u.click(card(name));
    await u.click(button("Attack with 3"));
    await screen.findByRole("heading", { name: "You win!" }, slow);
    expect(lesson().steps.final.status).toBe("done");

    await act(() => u.click(button(/^Next:/)));
    expect(nextClicks()).toBe(1);
  }, 20000);
});
