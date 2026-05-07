interface TrophyProps {
  size?: number;
  className?: string;
  /** When true, the trophy is purely decorative (aria-hidden, no role). */
  decorative?: boolean;
  /** Override the gold color — useful for inverted contexts. */
  color?: string;
  /** Stroke (border) color. */
  stroke?: string;
}

/**
 * Generic World Cup trophy icon — original artwork, NOT a copy of the FIFA trophy.
 *
 * Visual: a stylized cup-on-pedestal — wide bowl on top, narrow waist, two side
 * handles, square base. Drawn flat in the brand "ink + primary color" style with a
 * thick black border so it sits naturally inside the design system (no shadows, no
 * gradients). The gold fill defaults to panini-yellow #F4C430.
 */
export function Trophy({
  size = 64,
  className,
  decorative = true,
  color = '#F4C430',
  stroke = '#1A1A1A',
}: TrophyProps) {
  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={size * (80 / 64)}
      className={className}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Trophy'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Side handles (rendered first so the cup overlaps them slightly). */}
      <path
        d="M 12 22 C 4 22, 4 36, 14 36"
        fill={color}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 52 22 C 60 22, 60 36, 50 36"
        fill={color}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cup bowl — wide top, slightly tapered bottom. */}
      <path
        d="M 12 12 L 52 12 L 50 38 C 50 46, 42 50, 32 50 C 22 50, 14 46, 14 38 Z"
        fill={color}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Inner highlight line on the bowl rim. */}
      <line
        x1="16"
        y1="18"
        x2="48"
        y2="18"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Stem connecting bowl to base. */}
      <rect x="28" y="50" width="8" height="10" fill={color} stroke={stroke} strokeWidth="3" />

      {/* Base — wide rectangular plinth with a small lip. */}
      <rect
        x="18"
        y="60"
        width="28"
        height="8"
        rx="2"
        fill={color}
        stroke={stroke}
        strokeWidth="3"
      />
      <rect
        x="14"
        y="68"
        width="36"
        height="8"
        rx="2"
        fill={color}
        stroke={stroke}
        strokeWidth="3"
      />
    </svg>
  );
}
