/**
 * Shared setup. Screen tests opt into a browser with `// @vitest-environment jsdom`;
 * the rules and lesson tests run in plain Node and skip all of this.
 */
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });
  // jsdom has no matchMedia or ResizeObserver.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // No real scrolling in jsdom.
  Element.prototype.scrollIntoView ??= () => {};
}
