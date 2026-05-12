import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface QueuedEvent {
  name: string;
  path?: string;
  props?: Record<string, unknown>;
}

/**
 * Tiny client-side event queue. Events flush in batches so route changes +
 * the events triggered by them go in one request. The flush is best-effort
 * and silently ignores failures — analytics must never affect UX.
 *
 * Uses `navigator.sendBeacon` on page unload so events fired right before
 * the user leaves the page still make it to the server.
 */
const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function postBatch(events: QueuedEvent[]): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // swallow
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    void postBatch(batch);
  }, 1000);
}

/**
 * Queue a single event. Safe to call from any component; no auth check
 * happens client-side — the server drops events from unauthenticated
 * requests.
 */
export function track(name: string, props?: Record<string, unknown>, path?: string): void {
  queue.push({ name, props, path });
  scheduleFlush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    // sendBeacon needs a Blob with explicit type, otherwise Content-Type is text/plain.
    const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
    try {
      navigator.sendBeacon('/api/events', blob);
    } catch {
      // ignore
    }
  });
}

/**
 * Emit a `page.view` event on every route change. Call once near the top
 * of an authenticated layout — the hook deduplicates by location.key.
 */
export function useTrackPageView(): void {
  const location = useLocation();
  useEffect(() => {
    track('page.view', undefined, location.pathname);
  }, [location.pathname]);
}
