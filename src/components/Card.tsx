"use client";

import Image from "next/image";
import { useRef, ViewTransition, type PointerEvent, type ReactNode, type Ref } from "react";
import { describeStats, KEYWORDS, type CardDef, type Keyword } from "@/lib/cards";
import { useMotionMode } from "@/lib/motion-pref";
import { BladesIcon, CheckIcon, MoonIcon, ShieldIcon, TapIcon, WebIcon, WingIcon } from "./icons";

export type CardStatus = "attacking" | "blocking" | "new" | "tapped" | null;

const STATUS: Record<Exclude<CardStatus, null>, { icon: ReactNode; text: string }> = {
  attacking: { icon: <BladesIcon className="size-[1.15em]" />, text: "Attacking" },
  blocking: { icon: <ShieldIcon className="size-[1.15em]" />, text: "Blocking" },
  new: { icon: <MoonIcon className="size-[1.15em]" />, text: "New this turn" },
  tapped: { icon: <TapIcon className="size-[1.15em]" />, text: "Tapped" },
};

const KEYWORD_ICON: Record<Keyword, ReactNode> = {
  flying: <WingIcon className="size-[1.2em] shrink-0" />,
  reach: <WebIcon className="size-[1.2em] shrink-0" />,
};

type Props = {
  card: CardDef;
  status?: CardStatus;
  damage?: number;
  pressed?: boolean;
  foil?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  tapped?: boolean;
  highlight?: boolean;
  pin?: string;
  pinState?: "active" | "dim";
  pinNote?: string;
  onPinHover?: (on: boolean) => void;
  onPinTap?: () => void;
  callout?: string;
  transitionName?: string;
  ref?: Ref<HTMLDivElement>;
};

const MAX_TILT = 16; // degrees

export function Card({
  card,
  status = null,
  damage = 0,
  pressed,
  foil,
  onSelect,
  disabled,
  tapped,
  highlight,
  pin,
  pinState,
  pinNote,
  onPinHover,
  onPinTap,
  callout,
  transitionName,
  ref,
}: Props) {
  const mode = useMotionMode();
  const el = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);

  // Accessible name = visible text plus unprinted facts (WCAG 2.5.3).
  const extras = [
    tapped && status !== "tapped" ? "tapped" : null,
    card.side === "opp" ? "opponent's creature" : null,
    pinNote ?? null,
  ].filter(Boolean);

  const label = [
    card.name,
    describeStats(card),
    status ? STATUS[status].text : null,
    tapped && status !== "tapped" ? "tapped" : null,
    damage ? `${damage} damage` : null,
    card.side === "opp" ? "opponent's creature" : null,
    pinNote ?? null,
  ]
    .filter(Boolean)
    .join(", ");

  function setTilt(clientX: number, clientY: number) {
    const node = el.current;
    if (!node || mode !== "full") return;
    const r = node.getBoundingClientRect();
    const px = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    const py = Math.min(Math.max((clientY - r.top) / r.height, 0), 1);
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--rx", `${(px - 0.5) * MAX_TILT * 2}deg`);
      node.style.setProperty("--ry", `${(0.5 - py) * MAX_TILT * 2}deg`);
      node.style.setProperty("--mx", `${px * 100}%`);
      node.style.setProperty("--my", `${py * 100}%`);
      node.style.setProperty("--px", `${(px - 0.5) * 2}`);
      node.style.setProperty("--py", `${(py - 0.5) * 2}`);
      node.dataset.tracking = "true";
    });
  }

  function resetTilt() {
    const node = el.current;
    if (!node) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    for (const [k, v] of [["--rx", "0deg"], ["--ry", "0deg"], ["--px", "0"], ["--py", "0"]]) node.style.setProperty(k, v);
    node.dataset.tracking = "false";
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "mouse" || e.pointerType === "pen") setTilt(e.clientX, e.clientY);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== "touch") return;
    setTilt(e.clientX, e.clientY);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(resetTilt, 380);
  }

  const shared = {
    className: "card text-left",
    "data-foil": foil ? "true" : "false",
    "data-status": status ?? undefined,
    "data-tapped": tapped ? "true" : "false",
    onPointerMove,
    onPointerLeave: resetTilt,
    onPointerDown,
  };

  const inner = (
    <>
      <CardFace card={card} status={status} damage={damage} readable={!!onSelect} />
      {onSelect && extras.length > 0 && <span className="sr-only">, {extras.join(", ")}</span>}
      <div className="card__foil" aria-hidden />
      <div className="card__glare" aria-hidden />
      {pressed && (
        <span className="card__check" aria-hidden>
          <CheckIcon className="size-[60%]" />
        </span>
      )}
    </>
  );

  const setNode = (n: HTMLElement | null) => {
    el.current = n;
  };

  const wrap = (
    <div
      className="card-wrap relative"
      ref={ref}
      data-card-id={card.id}
      data-highlight={highlight ? "true" : undefined}
      data-pin-state={pin ? pinState : undefined}
      onPointerEnter={(e) => e.pointerType !== "touch" && onPinHover?.(true)}
      onPointerLeave={(e) => e.pointerType !== "touch" && onPinHover?.(false)}
    >
      {pin && (
        <span aria-hidden className="card-pin" onClick={onPinTap}>
          {pin}
        </span>
      )}
      {callout && (
        <span aria-hidden className="card-callout">
          {callout}
        </span>
      )}
      {onSelect ? (
        <button
          {...shared}
          ref={setNode}
          type="button"
          aria-pressed={pressed ?? false}
          disabled={disabled}
          onClick={onSelect}
          onFocus={() => onPinHover?.(true)}
          onBlur={() => onPinHover?.(false)}
        >
          {inner}
        </button>
      ) : (
        <div {...shared} ref={setNode} role="img" aria-label={label} style={{ cursor: "default" }}>
          {inner}
        </div>
      )}
    </div>
  );
  return transitionName ? (
    <ViewTransition name={transitionName} share="morph" default="none">
      {wrap}
    </ViewTransition>
  ) : (
    wrap
  );
}

export function CardFace({ card, status, damage = 0, readable = false }: { card: CardDef; status?: CardStatus; damage?: number; readable?: boolean }) {
  return (
    <div className="card__face cf" data-side={card.side} aria-hidden={readable ? undefined : true}>
      <div className="cf-title">
        <p className="cf-name">{card.name}</p>
      </div>

      <div className="cf-art">
        <div className="cf-window" style={{ background: `radial-gradient(circle at 50% 35%, ${card.art.from}, ${card.art.to})` }}>
          {card.art.layers ? (
            <Image src={card.art.layers.bg} alt="" fill sizes="(max-width: 640px) 50vw, 280px" className="art-layer art-bg object-cover" />
          ) : (
            <span className="cf-glyph" aria-hidden>
              {card.art.glyph}
            </span>
          )}
        </div>
        {card.art.layers && (
          <div className="art-breakout">
            <Image src={card.art.layers.fg} alt="" fill sizes="(max-width: 640px) 60vw, 320px" className="art-layer art-fg object-contain" />
          </div>
        )}
        {status && (
          <span className="cf-status" data-status={status}>
            {STATUS[status].icon}
            <span className="cf-status-word">{STATUS[status].text}</span>
          </span>
        )}
        {damage > 0 && (
          <span className="cf-damage">
            {damage}
            <span className="sr-only"> damage</span>
          </span>
        )}
      </div>

      <p className="cf-type">{card.type}</p>

      <div className="cf-text">
        {card.keywords.map((k) => (
          <p key={k} className="cf-kw">
            {KEYWORD_ICON[k]}
            <span>
              <b>{KEYWORDS[k].label}</b> <i className="cf-reminder">({KEYWORDS[k].reminder})</i>
            </span>
          </p>
        ))}
      </div>

      <p className="cf-kw-mini" aria-hidden={card.keywords.length ? undefined : true}>
        {card.keywords.map((k) => (
          <span key={k}>
            {KEYWORD_ICON[k]}
            {KEYWORDS[k].label}
          </span>
        ))}
      </p>

      <span className="cf-pt">
        {card.power}
        <span className="cf-pt-slash">/</span>
        {card.toughness}
      </span>
      <span className="sr-only">
        , power {card.power}, toughness {card.toughness}
      </span>
    </div>
  );
}
