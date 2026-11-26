type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const WingIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 17c5 1 10-1 13-5 1.5-2 3-4.5 5-6-4 .3-7 1.8-9.5 4.5C9.5 8 7 7 4 7c1.6 1.3 2.5 3 2.6 4.8C5 12.6 3.7 14.4 3 17Z" />
    <path d="M8 15.2c2.6-.4 5-1.8 6.8-4" />
  </svg>
);

export const WebIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" strokeWidth={1.2} />
    <path d="M12 7.5l3.2 1.3 1.3 3.2-1.3 3.2-3.2 1.3-3.2-1.3L7.5 12l1.3-3.2Z" />
    <path d="M12 4.5l5.3 2.2 2.2 5.3-2.2 5.3-5.3 2.2-5.3-2.2L4.5 12l2.2-5.3Z" strokeWidth={1.2} />
  </svg>
);

export const BladesIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 4l11 11M20 4 9 15" />
    <path d="M13 17l4-4M11 17l-4-4M16 18l2 2M8 18l-2 2" />
  </svg>
);

export const ShieldIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3l7.5 2.8v5.7c0 4.7-3.2 8.2-7.5 9.9-4.3-1.7-7.5-5.2-7.5-9.9V5.8Z" />
  </svg>
);

export const MoonIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z" />
  </svg>
);

export const CheckIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={3} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const TapIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M7 4h6a1.5 1.5 0 0 1 1.5 1.5V9" />
    <path d="M7 4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 7 17h2" />
    <rect x="10" y="11.5" width="10.5" height="7.5" rx="1.5" />
    <path d="M16.5 4.5c2 .6 3.4 2.2 3.8 4.4M20.3 8.9l.4-2.6M20.3 8.9l-2.4-1" />
  </svg>
);

export const SpeakerIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" />
  </svg>
);

export const LockIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);

export const BulbIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />
  </svg>
);

export const HeartIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      fill="currentColor"
      d="M12 20.5s-7.5-4.4-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.3 1 5 3 1.7-2 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2Z"
    />
  </svg>
);

export const CrossIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={3} className={className}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const InfoIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={2.6} className={className}>
    <path d="M12 10.5V18M12 6.2v.3" />
  </svg>
);

export const ArrowUpIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 46" fill="none" stroke="currentColor" strokeWidth={3} className={className} aria-hidden>
    <path d="M12 44V5M3 14 12 3l9 11" />
  </svg>
);

export const ChevronIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={2.4} className={className}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </svg>
);
