import { ViewTransition, type ReactNode } from "react";

/**
 * The one page-transition wrapper, mounted once in the root layout around every
 * page. It never unmounts, so each navigation is an *update* of this boundary:
 * the browser gets one old snapshot (the page you left) and one new snapshot
 * (the page you arrive on), and we animate that pair by navigation type:
 * "nav-forward" slides in from the right, "nav-back" from the left, anything
 * untagged (browser Back, a redirect) crossfades.
 *
 * Why not one wrapper per page with enter/exit? Next keeps visited pages alive
 * in the background, so whether a page "exits" differs by browser: Chrome
 * animated the old page but not the new one, Safari the reverse, and nested
 * wrappers stacked the old page on top. A single persistent boundary behaves
 * the same everywhere.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      name="page"
      update={{ "nav-forward": "nav-forward", "nav-back": "nav-back", assemble: "assemble", default: "fade" }}
      default="none"
    >
      <div className="flex flex-col">{children}</div>
    </ViewTransition>
  );
}
