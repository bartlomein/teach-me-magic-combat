// Plain on purpose: the step tabs and the page transition live in StepScreen, so
// each screen has exactly one transition wrapper (Safari stacks nested ones).
export default function LearnLayout({ children }: LayoutProps<"/learn">) {
  return children;
}
