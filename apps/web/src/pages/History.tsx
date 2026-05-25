import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { stickerLabel } from '@cromos/shared';
import { api } from '../api';
import { useT } from '../i18n/LangContext';

interface HistoryEntry {
  id: string;
  stickerNumber: number;
  countBefore: number;
  countAfter: number;
  source: string;
  createdAt: string;
}
interface HistoryPage {
  entries: HistoryEntry[];
  nextCursor: string | null;
}

const PAGE_SIZE = 50;

/** Maps the server-side source string to the emoji shown next to each row. */
function sourceEmoji(source: string): string {
  switch (source) {
    case 'tap':
      return '👆';
    case 'long_press':
      return '✏️';
    case 'pack':
      return '📦';
    case 'photo':
      return '📷';
    default:
      return '•';
  }
}

/** Format a timestamp as a YYYY-MM-DD day key for grouping. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Append-only log of every sticker count change. Cursor-paginated, newest
 * first, grouped by day. No edit / undo affordance for the MVP — purely
 * informational.
 */
export function History() {
  const { t, lang } = useT();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const q = useInfiniteQuery({
    queryKey: ['collection', 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<HistoryPage>(
        `/api/collection/history?limit=${PAGE_SIZE}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Infinite-scroll: load more when the bottom sentinel scrolls into view.
  // Depend only on the specific query fields we read — not the whole query
  // object, whose identity changes every render and was tearing down and
  // recreating the observer on each one.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    });
    io.observe(node);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const grouped = useMemo(() => {
    const all = (q.data?.pages ?? []).flatMap((p) => p.entries);
    const map = new Map<string, HistoryEntry[]>();
    for (const e of all) {
      const k = dayKey(e.createdAt);
      const list = map.get(k);
      if (list) list.push(e);
      else map.set(k, [e]);
    }
    return Array.from(map.entries());
  }, [q.data]);

  const dayLabel = (key: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (key === today) return t('history.today');
    if (key === yesterday) return t('history.yesterday');
    // Parse the YYYY-MM-DD key as a *local* date. `new Date('2026-05-25')`
    // would be UTC midnight, which toLocaleDateString then renders as the
    // previous day in any negative-offset timezone.
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="px-5">
      <div className="mt-3">
        <h1 className="font-display text-2xl">{t('history.title')}</h1>
        <p className="label-mono opacity-60 mt-1">{t('history.subtitle')}</p>
      </div>

      {q.isLoading && (
        <p className="mt-4 label-mono opacity-60">{t('history.loading')}</p>
      )}
      {q.isError && (
        <p className="mt-4 label-mono text-panini-red">{t('history.error')}</p>
      )}
      {!q.isLoading && grouped.length === 0 && (
        <p className="mt-4 label-mono opacity-60">{t('history.empty')}</p>
      )}

      <div className="mt-4 space-y-5">
        {grouped.map(([day, entries]) => (
          <section key={day}>
            <h2 className="font-display text-sm tracking-wide uppercase opacity-70 mb-2">
              {dayLabel(day)}
            </h2>
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="card flex items-center gap-3 px-3 py-2"
                  title={e.source}
                >
                  <span className="text-base shrink-0" aria-hidden="true">
                    {sourceEmoji(e.source)}
                  </span>
                  <span className="font-mono text-[13px] font-bold tabular-nums">
                    {stickerLabel(e.stickerNumber)}
                  </span>
                  <DeltaBadge before={e.countBefore} after={e.countAfter} />
                  <span className="ml-auto label-mono opacity-60 tabular-nums">
                    {new Date(e.createdAt).toLocaleTimeString(
                      lang === 'pt' ? 'pt-PT' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div ref={sentinelRef} className="h-12" aria-hidden="true" />
      {q.isFetchingNextPage && (
        <p className="label-mono opacity-60 text-center pb-4">
          {t('history.loading_more')}
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const isAdd = delta > 0;
  // Special case: "removed entirely" reads more clearly as "→0" than "−N".
  const isRemoval = after === 0 && before > 0;
  const label = isRemoval ? '→ 0' : isAdd ? `+${delta}` : `${delta}`;
  return (
    <span
      className={`font-mono text-[11px] font-bold border-2 border-panini-ink rounded-md px-2 py-0.5 ${
        isAdd ? 'bg-panini-green text-panini-ink' : 'bg-panini-red text-white'
      }`}
      style={
        isAdd
          ? { background: '#6FBE44', color: '#1A1A1A' }
          : { background: '#E63027', color: '#FFFFFF' }
      }
    >
      {label}
    </span>
  );
}
