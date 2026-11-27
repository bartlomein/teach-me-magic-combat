"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CARDS, type CardDef } from "@/lib/cards";
import { useMotionMode } from "@/lib/motion-pref";
import { Card } from "../ui/Card";
import { ShieldIcon } from "../ui/icons";
import { Secondary } from "./Coach";

const BEAT_MS = 2600;

const BEATS = [
  "Thorn Boar attacks. Ember Pup blocks. Pup should lose.",
  "Before damage, you cast a spell: +3/+3 until end of turn.",
  "Ember Pup is now 5/4.",
  "Pup deals 5. Boar dies. Pup lives.",
] as const;

const PUP = CARDS.emberPup as CardDef;
const BOAR = CARDS.thornBoar as CardDef;
const BIG_PUP: CardDef = { ...PUP, power: PUP.power + 3, toughness: PUP.toughness + 3 };

export function Lesson2Demo() {
  const mode = useMotionMode();
  const [beat, setBeat] = useState(-1); // -1 = not started
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playing = beat >= 0 && beat < BEATS.length - 1;

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => setBeat((b) => b + 1), BEAT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [beat, playing]);

  const pupBig = beat >= 2;
  const boarDead = beat >= 3;
  const spellIn = beat === 1 || beat === 2;
  const anim = mode !== "off";

  return (
    <figure className="flex flex-col gap-4">
      <div className="paper relative grid min-h-[22rem] grid-cols-[1fr_auto_1fr] items-center gap-2 border-2 border-ink p-3 [--card-w:clamp(92px,26vw,150px)] sm:gap-3 sm:p-6">
        <div className="relative justify-self-end">
          <motion.div
            animate={anim ? { opacity: boarDead ? 0.35 : 1, rotate: boarDead ? -8 : 0, filter: boarDead ? "grayscale(1)" : "grayscale(0)" } : undefined}
            style={!anim && boarDead ? { opacity: 0.35, filter: "grayscale(1)" } : undefined}
            transition={{ duration: 0.6 }}
          >
            <Card card={BOAR} status={beat >= 0 && !boarDead ? "attacking" : null} />
          </motion.div>
          {boarDead && (
            <p className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 border-2 border-miss bg-panel px-2.5 py-1 text-sm font-bold text-miss">
              Dies
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-sm font-bold text-ink-soft">
          <ShieldIcon className="size-7 text-ink" />
          {beat >= 0 ? "blocks" : ""}
        </div>

        <div className="relative justify-self-start">
          <motion.div
            animate={anim && pupBig ? { scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 0.7 }}
          >
            <Card card={pupBig ? BIG_PUP : PUP} status={beat >= 0 ? "blocking" : null} />
          </motion.div>
          <AnimatePresence>
            {spellIn && (
              <motion.div
                key="spell"
                initial={anim ? { opacity: 0, y: 24, rotate: -6 } : false}
                animate={{ opacity: 1, y: 0, rotate: -4 }}
                exit={anim ? { opacity: 0, y: -12 } : undefined}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -top-4 -right-4 z-10 flex w-36 flex-col gap-1 border-[3px] border-ink bg-hi p-2.5 text-ink"
              >
                <span className="text-xs font-bold">Spell</span>
                <span className="text-lg leading-none font-extrabold">+3/+3</span>
                <span className="text-xs">until end of turn</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {beat === -1 && (
          <div className="absolute inset-0 grid place-items-center bg-panel/70">
            <Secondary onClick={() => setBeat(0)}>Watch the 10-second demo</Secondary>
          </div>
        )}
      </div>

      <figcaption className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-base">
          {beat === -1 ? (
            <>
              <span className="text-ink-soft">Spells can change a fight after blocks.</span>
            </>
          ) : (
            <>
              <b>{beat + 1} of {BEATS.length}.</b> {BEATS[beat]}
            </>
          )}
        </p>
        {beat === BEATS.length - 1 && <Secondary onClick={() => setBeat(0)}>Watch again</Secondary>}
      </figcaption>
    </figure>
  );
}
