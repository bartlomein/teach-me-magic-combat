"use client";

import { useState } from "react";

type Pin = { readonly id: string; readonly letter: string; readonly text: string };

export function usePinLinks(pins: readonly Pin[], isVisible: (id: string) => boolean, smoothScroll: boolean) {
  const [active, setActive] = useState<string | null>(null);
  const letterFor = (id: string) => (isVisible(id) ? pins.find((p) => p.id === id)?.letter : undefined);
  const shown = active && letterFor(active) ? active : null;
  const scrollTo = (el: Element | null | undefined) => el?.scrollIntoView({ block: "nearest", behavior: smoothScroll ? "smooth" : "auto" });

  const cardProps = (id: string) => {
    const letter = letterFor(id);
    if (!letter) return {};
    const pin = pins.find((p) => p.id === id)!;
    return {
      pin: letter,
      pinState: shown ? (shown === id ? "active" : "dim") : undefined,
      pinNote: `Note ${letter}: ${pin.text}`,
      onPinHover: (on: boolean) => setActive((cur) => (on ? id : cur === id ? null : cur)),
      onPinTap: () => {
        setActive(id);
        scrollTo(document.getElementById(`key-${letter}`));
      },
    } as const;
  };

  const keyProps = {
    pins: pins.filter((p) => isVisible(p.id)),
    active: shown ? (pins.find((p) => p.id === shown)?.letter ?? null) : null,
    onHover: (letter: string | null) => setActive(pins.find((p) => p.letter === letter)?.id ?? null),
    onTap: (letter: string) => {
      const id = pins.find((p) => p.letter === letter)?.id ?? null;
      setActive(id);
      scrollTo(document.querySelector(`[data-card-id="${id}"]`));
    },
  };

  return { cardProps, keyProps };
}
