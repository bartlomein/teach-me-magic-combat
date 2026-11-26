import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepScreen } from "@/components/lesson/StepScreen";
import { SLUGS, STEPS, stepFromSlug } from "@/lib/lesson/lesson";

// Every step is prebuilt at build time: static, instant, and it arrives in one
// pass, so page transitions run once and the shared elements can morph.
export function generateStaticParams() {
  return STEPS.map((s) => ({ slug: SLUGS[s.id] }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const step = stepFromSlug((await params).slug);
  const i = STEPS.findIndex((s) => s.id === step);
  return { title: i < 0 ? "Magic combat" : `Step ${i + 1}: ${STEPS[i].title} · Magic combat` };
}

export default async function Page({ params }: PageProps<"/learn/[slug]">) {
  const step = stepFromSlug((await params).slug);
  if (!step) notFound();
  return <StepScreen step={step} />;
}
