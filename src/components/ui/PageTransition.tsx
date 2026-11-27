import { ViewTransition, type ReactNode } from "react";

// One persistent boundary: per-page wrappers animate inconsistently in Chrome vs Safari.
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
