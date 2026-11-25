/**
 * The welcome page's Storm Hawk leap: when to play it, and how to stop it.
 *
 * This file never imports three.js. The scene (./leapScene) is loaded only when
 * the leap actually plays, so the welcome page's first paint and Lighthouse
 * scores don't pay for it.
 */

type Running = { stop: () => void; done: Promise<void> };

let running: Running | null = null;
/** Bumped by every play and stop, so a leap that's still loading knows it was cancelled. */
let token = 0;

/**
 * Should this device play it at all? Only in Full motion (reduced-motion users
 * start in Calm), with WebGL that isn't software-rendered, and not on data
 * saver or low-memory phones. Everyone else keeps the normal painted card.
 */
export function canLeap(motion: "full" | "calm" | "off"): boolean {
  if (motion !== "full" || typeof window === "undefined") return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Play the leap from this card. Resolves when it's over:
 * - "played": it ran (to the end, or until stopped),
 * - "failed": it couldn't start (WebGL or assets), and the card is unchanged,
 * - "superseded": a newer play or a stop took over before it started.
 * `onStart` runs once the first frame is on screen.
 */
export async function playHawkLeap(card: HTMLElement, onStart?: () => void): Promise<"played" | "failed" | "superseded"> {
  stopHawkLeap();
  const mine = ++token;
  const img = card.querySelector<HTMLImageElement>("img.art-fg");
  if (!img) return "failed";
  try {
    const { runLeap } = await import("./leapScene");
    if (mine !== token || !card.isConnected) return "superseded";
    const r = await runLeap(img);
    if (mine !== token) {
      r.stop(); // stopped while it was loading
      return "superseded";
    }
    running = r;
    onStart?.();
    await r.done;
    return "played";
  } catch {
    return "failed";
  } finally {
    if (mine === token) running = null;
  }
}

/** Stop at once and put the card back as it was (e.g. right before a page change). */
export function stopHawkLeap() {
  token++;
  running?.stop();
  running = null;
}
