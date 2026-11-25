import { QuickCheck } from "@/components/lesson/QuickCheck";

export const metadata = { title: "Quick check · Magic combat" };

// "Played a bit": three questions; a right answer skips that step.
export default function QuickCheckPage() {
  return <QuickCheck />;
}
