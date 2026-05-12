import { useEffect, useState } from 'react';

interface Metrics {
  scrollY: number;
  innerHeight: number;
  visualHeight: number;
  bodyHeight: number;
  safeBottom: number;
}

function readSafeBottom(): number {
  const el = document.documentElement;
  const v = getComputedStyle(el).getPropertyValue('--safe-bottom-probe');
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function snapshot(): Metrics {
  return {
    scrollY: Math.round(window.scrollY),
    innerHeight: window.innerHeight,
    visualHeight: window.visualViewport ? Math.round(window.visualViewport.height) : -1,
    bodyHeight: document.documentElement.scrollHeight,
    safeBottom: readSafeBottom(),
  };
}

/**
 * Opt-in overlay for debugging the "footer floats mid-screen during scroll" report.
 * Activate by appending `?debug=scroll` to any URL. Shows live scroll/viewport
 * numbers so we can confirm what's happening on the actual device when it repros.
 *
 * Stays mounted but renders nothing unless the query param is present, so the
 * cost is a few bytes in the production bundle.
 */
export function ScrollDebugOverlay() {
  const [enabled, setEnabled] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'scroll',
  );
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.style.setProperty('--safe-bottom-probe', '0px');

    const update = () => setM(snapshot());
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [enabled]);

  if (!enabled || !m) return null;

  return (
    <div
      role="status"
      aria-live="off"
      className="fixed left-2 top-2 z-[100] font-mono text-[10px] leading-tight bg-panini-ink/90 text-panini-yellow border-2 border-panini-yellow rounded-md px-2 py-1.5"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold uppercase tracking-wider">scroll·debug</span>
        <button
          type="button"
          className="underline hover:no-underline"
          onClick={() => setEnabled(false)}
        >
          hide
        </button>
      </div>
      <div>scrollY {m.scrollY}</div>
      <div>innerH {m.innerHeight}</div>
      <div>visualH {m.visualHeight}</div>
      <div>bodyH {m.bodyHeight}</div>
      <div>delta {m.bodyHeight - m.innerHeight - m.scrollY}</div>
    </div>
  );
}
