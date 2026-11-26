// Never import three.js here: the scene loads lazily so first paint doesn't pay for it.

type Running = { stop: () => void; done: Promise<void> };

let running: Running | null = null;
// Bumped by every play and stop, so a still-loading play knows it was cancelled.
let token = 0;

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

let playId = 0;

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

export function stopGolemLeap() {
  token++;
  running?.stop();
  running = null;
}
