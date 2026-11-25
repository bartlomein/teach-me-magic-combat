"use client";

import { motion } from "motion/react";
import type { CardDef } from "@/lib/cards";
import { CardFace } from "./Card";

/* ------------------------------------------------------------------
 * All effects here are decorative (aria-hidden). Every one of them has
 * a text twin announced through the live region by the parent.
 * ------------------------------------------------------------------ */

// Six shards that tile the card. Each flies outward from the center.
const SHARDS: { clip: string; dx: number; dy: number; rot: number }[] = [
  { clip: "polygon(0 0, 55% 0, 40% 35%, 0 45%)", dx: -60, dy: -50, rot: -28 },
  { clip: "polygon(55% 0, 100% 0, 100% 30%, 40% 35%)", dx: 60, dy: -60, rot: 24 },
  { clip: "polygon(0 45%, 40% 35%, 50% 65%, 0 75%)", dx: -80, dy: 5, rot: -16 },
  { clip: "polygon(40% 35%, 100% 30%, 100% 60%, 50% 65%)", dx: 75, dy: 0, rot: 18 },
  { clip: "polygon(0 75%, 50% 65%, 45% 100%, 0 100%)", dx: -50, dy: 70, rot: -34 },
  { clip: "polygon(50% 65%, 100% 60%, 100% 100%, 45% 100%)", dx: 55, dy: 75, rot: 30 },
];

/** Death: the card cracks into shards that drift apart and fade. */
export function Shatter({ card, calm }: { card: CardDef; calm: boolean }) {
  return (
    <div className="card-wrap" aria-hidden>
      <div className="relative" style={{ aspectRatio: "5 / 7" }}>
        {calm ? (
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-[14px]"
            initial={{ opacity: 1, filter: "grayscale(0)" }}
            animate={{ opacity: 0, filter: "grayscale(1)" }}
            transition={{ duration: 0.6 }}
          >
            <CardFace card={card} />
          </motion.div>
        ) : (
          SHARDS.map((s, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 overflow-hidden rounded-[14px]"
              style={{ clipPath: s.clip }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, filter: "brightness(1)" }}
              animate={{
                x: [0, s.dx * 0.05, s.dx],
                y: [0, s.dy * 0.05, s.dy + 30],
                rotate: [0, 0, s.rot],
                opacity: [1, 1, 0],
                filter: ["brightness(1)", "brightness(2.2)", "brightness(1)"],
              }}
              transition={{ duration: 0.85, times: [0, 0.18, 1], ease: "easeOut" }}
            >
              <CardFace card={card} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export type Burst = { id: number; x: number; y: number; color: string };

// Fixed spray pattern (no randomness during render; looks organic enough).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const dist = 38 + ((i * 37) % 34);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 4 + (i % 3) * 2 };
});

/** Impact sparks at a point inside the board. */
export function ImpactBurst({ burst }: { burst: Burst }) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ left: burst.x, top: burst.y }}>
      <motion.span
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 90, height: 90, background: `radial-gradient(circle, ${burst.color}cc, transparent 65%)` }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: s.size, height: s.size, background: burst.color, boxShadow: `0 0 8px ${burst.color}` }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: s.x, y: s.y, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.1, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

export type Float = { id: number; x: number; y: number; text: string };

/** A damage number that pops and floats up. In calm mode it just fades in place. */
export function DamageFloat({ f }: { f: Float }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -translate-x-1/2 text-3xl font-extrabold text-miss tabular-nums"
      style={{ left: f.x, top: f.y, textShadow: "0 0 0 #fff, 2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff" }}
      initial={{ y: 0, scale: 0.4, opacity: 0 }}
      animate={{ y: [0, -14, -56], scale: [0.4, 1.35, 1], opacity: [0, 1, 0] }}
      transition={{ duration: 1.2, times: [0, 0.2, 1] }}
    >
      {f.text}
    </motion.span>
  );
}
