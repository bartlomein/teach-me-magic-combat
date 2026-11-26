"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, ViewTransition, type ReactNode } from "react";
import { CARDS } from "@/lib/cards";
import { stepHref } from "@/lib/lesson/lesson";
import { dispatch, markArrival, useLesson } from "@/lib/lesson/store";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../Card";
import { HeartIcon } from "../icons";
import { Primary } from "./Coach";
import { useArrivalFocus } from "./useArrivalFocus";

const PANEL_START = 0.6;
const PANEL_GAP = 1.1;

export function Basics() {
  const router = useRouter();
  const { lesson, ready } = useLesson();
  const mode = useMotionMode();
  const headingRef = useArrivalFocus<HTMLHeadingElement>();

  useEffect(() => {
    router.prefetch(stepHref("attack"));
  }, [router]);

  function start() {
    // Arriving by a link (not the welcome buttons) still starts the lesson.
    if (ready && lesson.experience === null) dispatch({ type: "start", experience: "new", at: Date.now() });
    markArrival("assemble");
    router.push(stepHref("attack"), { transitionTypes: ["assemble"] });
  }

  const reveal = (i: number) =>
    mode === "off"
      ? {}
      : {
          initial: { opacity: 0, y: mode === "full" ? 14 : 0 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: PANEL_START + i * PANEL_GAP, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section
      aria-labelledby="basics-title"
      className="grid grid-cols-[minmax(0,1fr)] border-[3px] border-ink bg-panel [grid-template-areas:'task'_'panels'_'act'] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'task_panels'_'act_panels']"
    >
      <ViewTransition name="task-band" share="morph" default="none">
        <div className="on-spot flex flex-col gap-3 bg-spot p-5 text-panel [grid-area:task] sm:p-6 lg:border-r-[3px] lg:border-ink">
          <h1
            id="basics-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-[clamp(2rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]"
          >
            What&apos;s the game?
          </h1>
          <p className="text-lg text-panel/90">Combat is how you win.</p>
        </div>
      </ViewTransition>

      <ol className="m-0 grid list-none gap-[2px] border-y-[3px] border-ink bg-ink p-0 [grid-area:panels] sm:grid-cols-3 lg:border-y-0">
        <Panel n={1} caption="You each start with 20 life." motionProps={reveal(0)}>
          <div className="flex flex-col items-center gap-2.5">
            <LifeChip who="Opponent" life={20} transitionName="life-opp" />
            <span aria-hidden className="text-sm font-bold text-ink-soft">
              vs
            </span>
            <LifeChip who="You" life={20} transitionName="life-you" />
          </div>
        </Panel>

        <Panel n={2} caption="Creatures fight for you." motionProps={reveal(1)}>
          <div className="flex flex-col items-center gap-3">
            <div className="[--card-w:clamp(120px,30vw,150px)]">
              <Card card={CARDS.emberPup} transitionName="card-emberPup" />
            </div>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 text-[15px]">
              <Legend n="2" text="hits for 2" delay={PANEL_START + PANEL_GAP + 0.6} mode={mode} />
              <Legend n="1" text="dies after 1 damage" delay={PANEL_START + PANEL_GAP + 1.0} mode={mode} />
            </dl>
          </div>
        </Panel>

        <Panel n={3} caption="Bring their life to 0 to win." motionProps={reveal(2)}>
          <WinCountdown mode={mode} />
        </Panel>
      </ol>

      <div className="flex flex-col gap-3 p-5 [grid-area:act] sm:p-6 lg:border-r-[3px] lg:border-ink">
        <Primary onClick={start} className="w-fit">
          Start Step 1
        </Primary>
        <p className="text-sm text-ink-soft">5 short steps, about 2 minutes each.</p>
      </div>
    </section>
  );
}

function Panel({
  n,
  caption,
  children,
  motionProps,
}: {
  n: number;
  caption: string;
  children: ReactNode;
  motionProps: object;
}) {
  return (
    // Fading the whole panel would show the divider ink as a dark block.
    <li className="paper flex">
      <motion.div {...motionProps} className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <p className="flex items-start gap-2.5 text-[17px] leading-snug font-bold">
          <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-ink text-xs">
            {n}
          </span>
          {caption}
        </p>
        <div className="flex min-h-[8rem] flex-1 items-center justify-center sm:min-h-[13rem]">{children}</div>
      </motion.div>
    </li>
  );
}

function Legend({ n, text, delay, mode }: { n: string; text: string; delay: number; mode: "full" | "calm" | "off" }) {
  const anim =
    mode === "off"
      ? {}
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.6, ease: "easeOut" as const } };
  return (
    <>
      <motion.dt {...anim} className="grid h-7 min-w-7 place-items-center bg-hi px-1.5 font-extrabold tabular-nums">
        {n}
      </motion.dt>
      <motion.dd {...anim} className="m-0">
        {text}
      </motion.dd>
    </>
  );
}

function LifeChip({ who, life, transitionName }: { who: string; life: number | string; transitionName?: string }) {
  const chip = (
    <span className="inline-flex items-center gap-2.5 border-2 border-ink bg-panel px-3 py-1.5 font-bold">
      <span className="text-[15px]">{who}</span>
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <HeartIcon className="size-4 text-miss" />
        {life}
      </span>
    </span>
  );
  return transitionName ? (
    <ViewTransition name={transitionName} share="morph" default="none">
      {chip}
    </ViewTransition>
  ) : (
    chip
  );
}

function WinCountdown({ mode }: { mode: "full" | "calm" | "off" }) {
  const life = useMotionValue(mode === "full" ? 20 : 0);
  const shown = useTransform(life, (v) => Math.round(v));
  const [won, setWon] = useState(mode !== "full");

  useEffect(() => {
    if (mode !== "full") return;
    const controls = animate(life, 0, {
      delay: PANEL_START + 2 * PANEL_GAP + 0.9,
      duration: 2.6,
      ease: [0.33, 0, 0.2, 1],
      onComplete: () => setWon(true),
    });
    return () => controls.stop();
  }, [life, mode]);

  return (
    <div aria-hidden className="flex flex-col items-center gap-3">
      <span className="inline-flex items-center gap-2.5 border-2 border-ink bg-panel px-3 py-1.5 font-bold">
        <span className="text-[15px]">Opponent</span>
        <span className="inline-flex min-w-[3ch] items-center gap-1.5 tabular-nums">
          <HeartIcon className="size-4 text-miss" />
          <motion.span>{shown}</motion.span>
        </span>
      </span>
      <motion.span
        initial={false}
        animate={{ opacity: won ? 1 : 0, scale: won ? 1 : 0.92 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-spot px-3 py-1 text-sm font-extrabold text-panel"
      >
        You win
      </motion.span>
    </div>
  );
}
