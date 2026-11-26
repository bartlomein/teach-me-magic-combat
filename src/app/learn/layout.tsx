// Plain on purpose: the page transition wrapper lives in the root layout, so each
// screen has exactly one (Safari stacks nested ones). The step tabs are in StepScreen.
export default function LearnLayout({ children }: LayoutProps<"/learn">) {
  return children;
}
