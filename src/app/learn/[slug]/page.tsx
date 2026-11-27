import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepScreen } from "@/components/lesson/steps/StepScreen";
import { SLUGS, STEPS, stepFromSlug } from "@/lib/lesson/lesson";

// Prebuilt so it arrives in one pass: transitions run once and shared elements morph.
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
