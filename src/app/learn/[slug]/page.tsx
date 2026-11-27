import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StepLoading, StepScreen } from "@/components/lesson/steps/StepScreen";
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

// Reading params sits inside Suspense so navigation can show the outline instantly.
export default function Page({ params }: PageProps<"/learn/[slug]">) {
  return (
    <Suspense fallback={<StepLoading />}>
      <Step params={params} />
    </Suspense>
  );
}

async function Step({ params }: Pick<PageProps<"/learn/[slug]">, "params">) {
  const step = stepFromSlug((await params).slug);
  if (!step) notFound();
  return <StepScreen step={step} />;
}
