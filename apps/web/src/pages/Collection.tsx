import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CATEGORIES, PALETTE, TOTAL_STICKERS, type CategoryDef } from '@cromos/shared';
import { api } from '../api';
import { StickerTile } from '../components/StickerTile';
import { CountEditor } from '../components/CountEditor';
import { useT } from '../i18n/LangContext';

type Filter = 'all' | 'owned' | 'missing' | 'duplicates';

export function Collection() {
  const qc = useQueryClient();
  const { t } = useT();
  const collectionQ = useQuery({
    queryKey: ['collection'],
    queryFn: () => api.get<{ collection: Record<number, number> }>('/api/collection'),
    refetchInterval: 15_000, // simple polling for cross-device sync
  });
  const collection: Record<number, number> = collectionQ.data?.collection ?? {};

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);

  const setSticker = useMutation({
    mutationFn: ({ number, count }: { number: number; count: number }) =>
      api.put('/api/collection/sticker', { number, count }),
    onMutate: async ({ number, count }) => {
      await qc.cancelQueries({ queryKey: ['collection'] });
      const prev = qc.getQueryData<{ collection: Record<number, number> }>(['collection']);
      qc.setQueryData<{ collection: Record<number, number> }>(['collection'], (old) => {
        const next: Record<number, number> = { ...(old?.collection ?? {}) };
        if (count === 0) delete next[number];
        else next[number] = count;
        return { collection: next };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['collection'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collection'] }),
  });

  const counts = useMemo(() => {
    let owned = 0;
    let dupExtras = 0;
    for (const c of Object.values(collection)) {
      if (c > 0) {
        owned++;
        if (c > 1) dupExtras += c - 1;
      }
    }
    return {
      owned,
      missing: TOTAL_STICKERS - owned,
      dups: dupExtras,
      pct: Math.round((owned / TOTAL_STICKERS) * 100),
    };
  }, [collection]);

  const matchesFilter = (n: number): boolean => {
    const c = collection[n] ?? 0;
    if (filter === 'owned') return c >= 1;
    if (filter === 'missing') return c === 0;
    if (filter === 'duplicates') return c >= 2;
    return true;
  };

  const matchesSearch = (n: number): boolean => {
    if (!search.trim()) return true;
    return String(n).includes(search.trim());
  };

  const onTap = (n: number, next: number) => {
    setSticker.mutate({ number: n, count: next });
  };

  return (
    <div className="px-5">
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <Stat num={counts.owned} label={t('collection.stat.owned')} />
        <Stat num={counts.missing} label={t('collection.stat.missing')} />
        <Stat num={counts.dups} label={t('collection.stat.dups')} />
        <Stat num={`${counts.pct}%`} label={t('collection.stat.done')} highlight />
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 bg-white border-2 border-panini-ink rounded-md overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${counts.pct}%`,
            background:
              'linear-gradient(90deg, #E63027 0%, #F2812A 50%, #F4C430 100%)',
          }}
          aria-label={`${counts.pct}% complete`}
        />
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'owned', 'missing', 'duplicates'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pill whitespace-nowrap ${filter === f ? 'pill-active' : ''}`}
          >
            {t(`collection.filter.${f}`)}
          </button>
        ))}
        <button
          onClick={() => setBulkMode((b) => !b)}
          className={`pill whitespace-nowrap ml-auto ${bulkMode ? 'pill-active' : ''}`}
          aria-pressed={bulkMode}
          title={t('collection.bulk_hint')}
        >
          {bulkMode ? t('collection.bulk_active') : t('collection.bulk')}
        </button>
      </div>

      {/* Search */}
      <div className="mt-3 card flex items-center gap-2 px-3 py-2">
        <span aria-hidden="true">🔍</span>
        <input
          inputMode="numeric"
          placeholder={t('collection.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent font-mono text-[12px] focus:outline-none"
          aria-label={t('collection.search_aria')}
        />
      </div>

      {/* Categories */}
      <div className="mt-4 space-y-5">
        {CATEGORIES.map((cat) => {
          const stickers: number[] = [];
          for (let n = cat.range[0]; n <= cat.range[1]; n++) {
            if (matchesFilter(n) && matchesSearch(n)) stickers.push(n);
          }
          if (stickers.length === 0) return null;
          return (
            <CategorySection
              key={cat.id}
              cat={cat}
              stickers={stickers}
              collection={collection}
              onTap={(n, next) => {
                if (bulkMode) onTap(n, Math.max(1, (collection[n] ?? 0) + 1));
                else onTap(n, next);
              }}
              onLongPress={(n) => setEditing(n)}
            />
          );
        })}
      </div>

      {editing !== null && (
        <CountEditor
          number={editing}
          count={collection[editing] ?? 0}
          onSave={(c) => {
            setSticker.mutate({ number: editing, count: c });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Stat({
  num,
  label,
  highlight,
}: {
  num: number | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card px-2 py-2.5 ${highlight ? '!bg-panini-yellow' : ''}`}
      role="group"
      aria-label={`${label}: ${num}`}
    >
      <div className="num-display text-2xl leading-none">{num}</div>
      <div className="label-mono mt-1 opacity-70">{label}</div>
    </div>
  );
}

function CategorySection({
  cat,
  stickers,
  collection,
  onTap,
  onLongPress,
}: {
  cat: CategoryDef;
  stickers: number[];
  collection: Record<number, number>;
  onTap: (n: number, next: number) => void;
  onLongPress: (n: number) => void;
}) {
  const { t } = useT();
  const ownedCount = (() => {
    let n = 0;
    for (let s = cat.range[0]; s <= cat.range[1]; s++) if ((collection[s] ?? 0) > 0) n++;
    return n;
  })();
  const total = cat.range[1] - cat.range[0] + 1;
  const color = PALETTE[cat.colorKey];

  return (
    <section>
      <div className="flex items-center gap-2.5 px-1 pb-2">
        <div className="w-1.5 h-6 rounded-sm" style={{ background: color }} />
        <span className="text-xl leading-none" aria-hidden="true">
          {cat.emoji}
        </span>
        <h3 className="font-display text-lg tracking-wide uppercase">
          {t(`category.${cat.id}`)}
        </h3>
        <span className="ml-auto label-mono opacity-60">
          {ownedCount}/{total}
        </span>
      </div>
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          // Mobile: ~5–6 columns at 56px min (44px tile + breathing room ≥ 44px tap target).
          // Desktop expands automatically up to 8–10 columns at 720–800px container width.
          gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
        }}
      >
        {stickers.map((n) => (
          <StickerTile
            key={n}
            number={n}
            count={collection[n] ?? 0}
            onTap={(next) => onTap(n, next)}
            onLongPress={() => onLongPress(n)}
          />
        ))}
      </div>
    </section>
  );
}
