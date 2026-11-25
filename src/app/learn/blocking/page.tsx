import { StepScreen } from "@/components/lesson/StepScreen";

// A fully static page per step: prebuilt, instant, and it arrives in one pass,
// so page transitions run once and the shared elements can morph.
export const metadata = { title: "Step 2: Blocking · Magic combat" };

export default function Page() {
  return <StepScreen step="block" />;
}
