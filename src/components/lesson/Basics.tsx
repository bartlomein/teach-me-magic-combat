"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, ViewTransition, type ReactNode } from "react";
import { CARDS } from "@/lib/cards";
import { stepHref } from "@/lib/lesson/lesson";
import { dispatch, markArrival, useLesson } from "@/lib/lesson/store";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../ui/Card";
import { HeartIcon } from "../ui/icons";
import { Primary } from "./Coach";
import { useArrivalFocus } from "./hooks/useArrivalFocus";

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
      ? { initial: false, animate: { opacity: 1, y: 0 } }
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
        <div className="on-spot flex flex-col gap-1.5 bg-spot px-5 py-4 text-panel sm:gap-3 [grid-area:task] sm:p-6 lg:border-r-[3px] lg:border-ink">
          <h1
            id="basics-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]"
          >
            What&apos;s the game?
          </h1>
          <p className="text-base text-panel/90 sm:text-lg">Combat is how you win.</p>
        </div>
      </ViewTransition>

      <ol className="m-0 grid list-none gap-[2px] border-y-[3px] border-ink bg-ink p-0 [grid-area:panels] sm:grid-cols-3 lg:border-y-0">
        <Panel n={1} caption="You each start with 20 life." motionProps={reveal(0)}>
          <div className="flex items-center gap-2.5 sm:flex-col">
            <LifeChip who="Opponent" life={20} transitionName="life-opp" />
            <span aria-hidden className="text-sm font-bold text-ink-soft">
              vs
            </span>
            <LifeChip who="You" life={20} transitionName="life-you" />
          </div>
        </Panel>

        <Panel n={2} caption="Creatures fight for you." motionProps={reveal(1)}>
          <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
            <div className="[--card-w:clamp(96px,26vw,150px)]">
              <Card card={CARDS.emberPup} transitionName="card-emberPup" />
            </div>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 text-[15px]">
              <Legend n="2" text="Power: hits for 2" delay={PANEL_START + PANEL_GAP + 0.6} mode={mode} />
              <Legend n="1" text="Toughness: dies at 1 damage" delay={PANEL_START + PANEL_GAP + 1.0} mode={mode} />
            </dl>
          </div>
        </Panel>

        <Panel n={3} caption="Bring their life to 0 to win." motionProps={reveal(2)}>
          <WinCountdown mode={mode} />
        </Panel>
      </ol>

      <div className="flex flex-col gap-2 px-5 py-4 [grid-area:act] sm:gap-3 sm:p-6 lg:border-r-[3px] lg:border-ink">
        <Primary onClick={start} className="w-full justify-center sm:w-fit">
          Start Step 1
        </Primary>
        <p className="text-center text-sm text-ink-soft sm:text-left">5 short steps, about 2 minutes each.</p>
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
      <motion.div {...motionProps} className="flex flex-1 flex-col gap-3 px-5 py-4 sm:gap-4 sm:p-6">
        <p className="flex items-start gap-2.5 text-[17px] leading-snug font-bold">
          <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-ink text-xs">
            {n}
          </span>
          {caption}
        </p>
        <div className="flex flex-1 items-center justify-center sm:min-h-[13rem]">{children}</div>
      </motion.div>
    </li>
  );
}

function Legend({ n, text, delay, mode }: { n: string; text: string; delay: number; mode: "full" | "calm" | "off" }) {
  const anim =
    mode === "off"
      ? { initial: false, animate: { opacity: 1 } }
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.6, ease: "easeOut" as const } };
  return (
    <>
      <motion.dt {...anim} className="grid h-7 min-w-7 place-items-center bg-hi px-1.5 font-extrabold tabular-nums">
        {n}
      </motion.dt>
      <motion.dd {...anim} className="m-0">
        <span className="block font-bold">{text.split(": ")[0]}</span>
        {text.split(": ")[1]}
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

const WIN = "bg-spot px-3 py-1 text-sm font-extrabold text-panel";

function WinCountdown({ mode }: { mode: "full" | "calm" | "off" }) {
  const life = useMotionValue(20);
  const shown = useTransform(life, (v) => Math.round(v));
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (mode !== "full") return;
    const controls = animate(life, 0, {
      delay: PANEL_START + 2 * PANEL_GAP + 0.9,
      duration: 2.6,
      ease: [0.33, 0, 0.2, 1],
      onComplete: () => setFinished(true),
    });
    return () => controls.stop();
  }, [life, mode]);

  return (
    <div aria-hidden className="flex items-center gap-3 sm:flex-col">
      <span className="inline-flex items-center gap-2.5 border-2 border-ink bg-panel px-3 py-1.5 font-bold">
        <span className="text-[15px]">Opponent</span>
        <span className="inline-flex min-w-[3ch] items-center gap-1.5 tabular-nums">
          <HeartIcon className="size-4 text-miss" />
          {mode === "full" ? <motion.span>{shown}</motion.span> : 0}
        </span>
      </span>
      {mode === "full" ? (
        <motion.span
          initial={false}
          animate={{ opacity: finished ? 1 : 0, scale: finished ? 1 : 0.92 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={WIN}
        >
          You win
        </motion.span>
      ) : (
        <span className={WIN}>You win</span>
      )}
    </div>
  );
}
