// No transition wrapper here: Safari stacks nested ones (it lives in the root layout).
export default function LearnLayout({ children }: LayoutProps<"/learn">) {
  return children;
}
