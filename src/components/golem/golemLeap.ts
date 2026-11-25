/**
 * The welcome page's Moss Golem: when to play it, and how to stop it.
 *
 * This file never imports three.js. The scene (./golemScene) is loaded only when
 * the golem actually plays, so the welcome page's first paint and Lighthouse
 * scores don't pay for it.
 */

type Running = { stop: () => void; done: Promise<void> };

let running: Running | null = null;
/** Bumped by every play and stop, so a play that's still loading knows it was cancelled. */
let token = 0;

/**
 * Should this device play it at all? Only in Full motion (reduced-motion users
 * start in Calm), with WebGL that isn't software-rendered, and not on data
 * saver or low-memory phones. Everyone else keeps the normal painted card.
 */
export function canLeap(motion: "full" | "calm" | "off"): boolean {
  if (motion !== "full" || typeof window === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return false;
  try {
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Bumped only by a new play, so a play can tell "a newer play took over" from "it was stopped". */
let playId = 0;

/**
 * Play the golem from this card wrapper. Resolves when it's over:
 * - "played": it ran (to the end, or until stopped),
 * - "stopped": it was stopped before it started, and the card is unchanged,
 * - "failed": it couldn't start (WebGL or assets), and the card is unchanged,
 * - "superseded": a newer play took over before it started.
 * `onStart` runs once the first frame is on screen.
 */
export async function playGolemLeap(
  host: HTMLElement,
  onStart?: () => void,
): Promise<"played" | "stopped" | "failed" | "superseded"> {
  stopGolemLeap();
  const mine = ++token;
  const id = ++playId;
  const cancelled = () => mine !== token || !host.isConnected;
  const why = () => (id !== playId ? "superseded" : "stopped");
  try {
    const { runGolem } = await import("./golemScene");
    if (cancelled()) return why();
    const r = await runGolem(host, cancelled);
    if (!r) return why(); // stopped while the model was loading: nothing was shown
    if (mine !== token) {
      r.stop(); // stopped during its first frame
      return why();
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
export function stopGolemLeap() {
  token++;
  running?.stop();
  running = null;
}
