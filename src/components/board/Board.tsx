"use client";

import Image from "next/image";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Children, useLayoutEffect, useState, ViewTransition, type ReactNode } from "react";
import { useMotionMode } from "@/lib/motion-pref";
import type { PlayerId } from "@/lib/rules/engine";
import { Card } from "../Card";
import { DamageFloat, ImpactBurst, Shatter, type Burst, type Float } from "../effects";
import { ArrowUpIcon, HeartIcon } from "../icons";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useBoardFx() {
  const mode = useMotionMode();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const full = mode === "full";
  const pace = mode === "off" ? 0 : 1;

  const cardEl = (id: string) =>
    scope.current?.querySelector<HTMLElement>(`[data-card-id="${id}"]`) ?? null;
  const lifeEl = (p: PlayerId) =>
    scope.current?.querySelector<HTMLElement>(`[data-life="${p}"]`) ?? null;

  function pointOf(el: Element) {
    const board = scope.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - board.left,
      y: r.top + r.height / 2 - board.top,
    };
  }

  async function hitPlayer(
    attackers: { id: string; amount: number }[],
    player: PlayerId,
    onImpact: () => void,
  ) {
    const target = lifeEl(player);
    const els = attackers
      .map((a) => cardEl(a.id))
      .filter(Boolean) as HTMLElement[];
    if (!target || els.length === 0) return onImpact();
    const p = pointOf(target);
    const id = Date.now();
    const showFloats = () =>
      setFloats((cur) => [
        ...cur,
        ...attackers.map((a, i) => ({
          id: id + i,
          x: p.x + (i - (attackers.length - 1) / 2) * 44,
          y: p.y + 10,
          text: `−${a.amount}`,
        })),
      ]);

    if (full) {
      const t = target.getBoundingClientRect();
      await Promise.all(
        els.map((el) =>
          animate(
            el,
            { y: -14, scale: 1.04 },
            { duration: 0.18, ease: "easeOut" },
          ),
        ),
      );
      await Promise.all(
        els.map((el, i) => {
          const r = el.getBoundingClientRect();
          return animate(
            el,
            {
              x: t.left + t.width / 2 - (r.left + r.width / 2),
              y: t.bottom - r.top - r.height * 0.2,
            },
            { duration: 0.24, delay: i * 0.06, ease: [0.6, 0, 0.9, 0.5] },
          );
        }),
      );
      setBursts((cur) => [...cur, { id, x: p.x, y: p.y, color: "#c23a26" }]);
      animate(scope.current, { x: [0, -9, 8, -5, 3, 0] }, { duration: 0.4 });
      showFloats();
      onImpact();
      await Promise.all(
        els.map((el) =>
          animate(
            el,
            { x: 0, y: 0, scale: 1 },
            { duration: 0.45, ease: "easeOut" },
          ),
        ),
      );
    } else {
      await wait(300 * pace);
      if (pace) showFloats();
      onImpact();
      await wait(500 * pace);
    }
  }

  async function clash(
    fights: { attacker: string; blocker: string; toBlocker: number; toAttacker: number }[],
    onImpact: () => void,
  ) {
    const pairs = fights
      .map((f) => ({ ...f, a: cardEl(f.attacker), b: cardEl(f.blocker) }))
      .filter((f): f is typeof f & { a: HTMLElement; b: HTMLElement } => !!f.a && !!f.b);
    if (pairs.length === 0) return onImpact();
    const id = Date.now();
    const impactFx = () => {
      const pts = pairs.map((f) => ({ f, pa: pointOf(f.a), pb: pointOf(f.b) }));
      if (full) setBursts((cur) => [...cur, ...pts.map(({ pa, pb }, i) => ({ id: id + 100 + i, x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, color: "#f6cf6a" }))]);
      if (pace)
        setFloats((cur) => [
          ...cur,
          ...pts.flatMap(({ f, pa, pb }, i) => [
            ...(f.toBlocker > 0 ? [{ id: id + 200 + i * 2, x: pb.x, y: pb.y, text: `−${f.toBlocker}` }] : []),
            ...(f.toAttacker > 0 ? [{ id: id + 201 + i * 2, x: pa.x, y: pa.y, text: `−${f.toAttacker}` }] : []),
          ]),
        ]);
    };
    if (full) {
      const moves = pairs.map(({ a, b }) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const down = rb.top > ra.top;
        return { a, b, dx: rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy: down ? rb.top - ra.bottom + ra.height * 0.3 : rb.bottom - ra.top - ra.height * 0.3 };
      });
      await Promise.all(moves.map(({ a }) => animate(a, { y: -12, scale: 1.04 }, { duration: 0.2, ease: "easeOut" })));
      moves.forEach(({ b }) => animate(b, { y: -8 }, { duration: 0.18 }));
      await Promise.all(moves.map(({ a, dx, dy }, i) => animate(a, { x: dx, y: dy }, { duration: 0.22, delay: i * 0.05, ease: [0.6, 0, 0.9, 0.5] })));
      impactFx();
      animate(scope.current, { x: [0, -10, 9, -6, 4, -2, 0] }, { duration: 0.42 });
      onImpact();
      moves.forEach(({ b }) => animate(b, { y: 0 }, { duration: 0.4 }));
      await Promise.all(moves.map(({ a }) => animate(a, { x: 0, y: 0, scale: 1 }, { duration: 0.45, ease: "easeOut" })));
    } else {
      await wait(300 * pace);
      impactFx();
      onImpact();
      await wait(500 * pace);
    }
  }

  function nope(id: string) {
    const el = cardEl(id);
    if (!el || mode === "off") return;
    if (full) animate(el, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.4 });
    else animate(el, { opacity: [1, 0.6, 1] }, { duration: 0.4 });
  }

  function clearFx() {
    setBursts([]);
    setFloats([]);
  }

  const layer = (
    <>
      <AnimatePresence>
        {bursts.map((b) => (
          <ImpactBurst key={b.id} burst={b} />
        ))}
      </AnimatePresence>
      {floats.map((f) => (
        <DamageFloat key={f.id} f={f} />
      ))}
    </>
  );

  return {
    scope,
    hitPlayer,
    clash,
    nope,
    clearFx,
    layer,
    mode,
    wait: (ms: number) => wait(ms * pace),
  };
}

export function Board({
  scope,
  opp,
  you,
  between,
  caption,
  layer,
  className = "",
}: {
  scope: React.Ref<HTMLDivElement>;
  opp: ReactNode;
  you: ReactNode;
  between?: ReactNode;
  caption?: ReactNode;
  layer: ReactNode;
  className?: string;
}) {
  return (
    <figure ref={scope} className={`paper relative m-0 flex flex-col gap-1 overflow-visible px-3 pt-3 sm:gap-2 sm:px-6 sm:pt-6 ${className}`}>
      {opp}
      <div aria-hidden className="table-midline relative flex min-h-5 items-center sm:min-h-12 justify-center">
        {between && <span className="relative bg-panel px-3">{between}</span>}
      </div>
      {you}
      {caption && <figcaption className="sr-only">{caption}</figcaption>}
      {layer}
    </figure>
  );
}

export function AttackArrow({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold text-miss">
      <ArrowUpIcon className="h-11 w-6" />
      {label}
    </span>
  );
}

const TABLE_SPOTS = 3;

export function Row({
  side,
  life,
  children,
}: {
  side: PlayerId;
  life: number;
  children: ReactNode;
}) {
  const label = side === "you" ? "You" : "Opponent";
  const plate = (
    <div className="flex items-center justify-center gap-2.5">
      <Image
        src={side === "you" ? "/art/avatar-you.png" : "/art/avatar-opp.png"}
        alt=""
        width={48}
        height={48}
        className={`size-10 shrink-0 rounded-full sm:size-12 border-2 object-cover ${side === "you" ? "border-[#c99a2e]" : "border-ink"}`}
      />
      <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
        <span className="text-sm leading-none font-bold">{label}</span>
        <Life side={side} life={life} />
      </div>
    </div>
  );
  const spots = Math.max(0, TABLE_SPOTS - Children.toArray(children).length);
  return (
    <div
      data-side={side}
      className={`table-side -mx-3 flex flex-col gap-3 px-3 sm:-mx-6 sm:gap-5 sm:px-6 ${side === "opp" ? "-mt-3 pt-3 pb-2 sm:-mt-6 sm:pt-6 sm:pb-3" : "pt-2 pb-3 sm:pt-3 sm:pb-6"}`}
    >
      {side === "opp" && plate}
      <div className="board-row flex min-h-[8rem] items-center justify-center gap-2.5 sm:gap-5">
        {children}
        {Array.from({ length: spots }, (_, i) => (
          <div key={`spot-${i}`} aria-hidden className="card-wrap">
            <div className="table-spot aspect-[5/7]" />
          </div>
        ))}
      </div>
      {side === "you" && plate}
    </div>
  );
}

function Life({ side, life }: { side: PlayerId; life: number }) {
  const who = side === "you" ? "Your" : "Your opponent's";
  const inner = (
    <motion.span key={life} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1.5">
      <HeartIcon className="size-3.5 text-miss" />
      <span className="tabular-nums">{life}</span>
    </motion.span>
  );
  return (
    <ViewTransition name={`life-${side}`} share="morph" default="none">
      <span data-life={side} className="inline-flex min-w-[4.25rem] justify-center border-2 border-ink bg-panel px-2 py-0.5 text-[15px] font-bold" role="img" aria-label={`${who} life: ${life}`}>
        {inner}
      </span>
    </ViewTransition>
  );
}

export function CardSlot({
  fate = "alive",
  ...card
}: { fate?: "alive" | "dying" | "gone" } & React.ComponentProps<typeof Card>) {
  const mode = useMotionMode();
  if (fate === "gone") return <GraveSlot name={card.card.name} />;
  if (fate === "dying") return <Shatter card={card.card} calm={mode !== "full"} />;
  return <Card {...card} />;
}

function GraveSlot({ name }: { name: string }) {
  return (
    <div className="card-wrap" aria-label={`${name} died`} role="img">
      <div className="table-spot grid aspect-[5/7] place-items-center p-2 text-center text-xs text-ink-soft">
        <span>
          {name}
          <br />
          went to the graveyard
        </span>
      </div>
    </div>
  );
}

export function BlockLines({
  scope,
  pairs,
}: {
  scope: React.RefObject<HTMLDivElement | null>;
  pairs: { from: string; to: string }[];
}) {
  const [lines, setLines] = useState<{ key: string; x1: number; y1: number; x2: number; y2: number }[]>([]);
  const key = pairs.map((p) => p.from + ">" + p.to).join(",");

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const at = (id: string) => root.querySelector<HTMLElement>(`[data-card-id="${id}"] .card`)?.getBoundingClientRect();
      setLines(
        pairs.flatMap((p) => {
          const a = at(p.from);
          const b = at(p.to);
          if (!a || !b) return [];
          const down = b.top > a.top;
          return [
            {
              key: p.from + ">" + p.to,
              x1: a.left + a.width / 2 - box.left,
              y1: (down ? a.bottom : a.top) - box.top,
              x2: b.left + b.width / 2 - box.left,
              y2: (down ? b.top : b.bottom) - box.top,
            },
          ];
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scope]);

  if (lines.length === 0) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-[4] h-full w-full overflow-visible">
      {lines.map((l) => (
        <g key={l.key}>
          <motion.line
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="var(--spot)"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
          <circle cx={(l.x1 + l.x2) / 2} cy={(l.y1 + l.y2) / 2} r={11} fill="var(--spot)" stroke="var(--panel)" strokeWidth={2} />
          <path
            d={`M${(l.x1 + l.x2) / 2 - 4.5} ${(l.y1 + l.y2) / 2 - 5}h9v4.2c0 3-2.3 5.1-4.5 5.8-2.2-.7-4.5-2.8-4.5-5.8z`}
            fill="var(--panel)"
          />
        </g>
      ))}
    </svg>
  );
}
