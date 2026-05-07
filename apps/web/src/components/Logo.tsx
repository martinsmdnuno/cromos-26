interface LogoProps {
  className?: string;
}

/** Inline horizontal wordmark — the iconic "26" + CROMOS lockup. */
export function Logo({ className }: LogoProps) {
  return (
    <div className={['flex items-baseline gap-2', className].filter(Boolean).join(' ')}>
      <span
        className="font-display leading-[0.85] tracking-[-2px]"
        style={{ fontSize: 38 }}
        aria-label="Cromos 26"
      >
        <span className="text-panini-red">2</span>
        <span className="text-panini-blue">6</span>
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[2px] -translate-y-1">CROMOS</span>
    </div>
  );
}
