import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORIES,
  PALETTE,
  stickerMatchesQuery,
  TOTAL_STICKERS,
  type CategoryDef,
} from '@cromos/shared';
import { api } from '../api';
import { StickerTile } from '../components/StickerTile';
import { CountEditor } from '../components/CountEditor';
import { PackModal } from '../components/PackModal';
import { useT } from '../i18n/LangContext';

type Filter = 'all' | 'owned' | 'missing' | 'duplicates' | 'almost';

/** ≥70% complete and not done yet — "almost there, push to finish" view. */
const ALMOST_THRESHOLD = 0.7;
const PREFS_KEY = 'cromos.collection.prefs.v1';

interface Prefs {
  filter: Filter;
  team: string; // '' = all teams, otherwise CategoryDef.id
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return { filter: 'all', team: '' };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { filter: 'all', team: '' };
    const p = JSON.parse(raw) as Partial<Prefs>;
    const filter: Filter =
      p.filter === 'owned' ||
      p.filter === 'missing' ||
      p.filter === 'duplicates' ||
      p.filter === 'almost'
        ? p.filter
        : 'all';
    return { filter, team: typeof p.team === 'string' ? p.team : '' };
  } catch {
    return { filter: 'all', team: '' };
  }
}

export function Collection() {
  const qc = useQueryClient();
  const { t } = useT();
  const collectionQ = useQuery({
    queryKey: ['collection'],
    queryFn: () => api.get<{ collection: Record<number, number> }>('/api/collection'),
    refetchInterval: 15_000, // simple polling for cross-device sync
  });
  const collection: Record<number, number> = collectionQ.data?.collection ?? {};

  const initialPrefs = useMemo(loadPrefs, []);
  const [filter, setFilter] = useState<Filter>(initialPrefs.filter);
  const [team, setTeam] = useState<string>(initialPrefs.team);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [packOpen, setPackOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ filter, team }));
    } catch {
      /* private mode etc. */
    }
  }, [filter, team]);

  const almostCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of CATEGORIES) {
      let owned = 0;
      const total = c.range[1] - c.range[0] + 1;
      for (let n = c.range[0]; n <= c.range[1]; n++) if ((collection[n] ?? 0) > 0) owned++;
      const pct = owned / total;
      if (pct >= ALMOST_THRESHOLD && pct < 1) ids.add(c.id);
    }
    return ids;
  }, [collection]);

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
    // 'almost': category-level filter happens in `visibleCategories`; within those,
    // surface only what is still missing — that's the actionable list.
    if (filter === 'almost') return c === 0;
    return true;
  };

  const matchesSearch = (n: number): boolean => stickerMatchesQuery(n, search);

  const visibleCategories = useMemo(() => {
    let cats = CATEGORIES;
    if (team) cats = cats.filter((c) => c.id === team);
    if (filter === 'almost') cats = cats.filter((c) => almostCategoryIds.has(c.id));
    return cats;
  }, [team, filter, almostCategoryIds]);

  // Stable tap / long-press callbacks — identity stays the same across renders so
  // <StickerTile memo> can skip re-renders for non-tapped tiles. Without this
  // every tap reconciled all 980 tiles.
  const mutate = setSticker.mutate;

  const handleTap = useCallback(
    (n: number, next: number) => {
      mutate({ number: n, count: next });
    },
    [mutate],
  );

  const handleLongPress = useCallback((n: number) => setEditing(n), []);

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

      {/* Open-a-pack CTA. Sits before the filters so the most rewarding action
          (adding stickers) is the first thing the eye lands on. */}
      <div className="mt-3">
        <button
          onClick={() => setPackOpen(true)}
          className="pill !bg-panini-yellow w-full !py-2 font-bold flex items-center justify-center gap-1.5"
        >
          <span aria-hidden="true">📦</span>
          <span>{t('collection.open_pack')}</span>
        </button>
      </div>

      {/* Filter chips */}
      <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'owned', 'missing', 'duplicates', 'almost'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pill whitespace-nowrap ${filter === f ? 'pill-active' : ''}`}
            title={f === 'almost' ? t('collection.filter.almost_hint') : undefined}
          >
            {t(`collection.filter.${f}`)}
          </button>
        ))}
      </div>

      {/* Team picker + search row */}
      <div className="mt-3 flex gap-2">
        <label className="card flex items-center px-2 pl-3 pr-1 py-1 flex-1 min-w-0">
          <span className="label-mono opacity-60 mr-2 shrink-0">
            {t('collection.team_label')}
          </span>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="flex-1 min-w-0 bg-transparent font-semibold text-[13px] focus:outline-none truncate"
            aria-label={t('collection.team_aria')}
          >
            <option value="">{t('collection.team_all')}</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {t(`category.${c.id}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Search */}
      <div className="mt-2 card flex items-center gap-2 px-3 py-2">
        <span aria-hidden="true">🔍</span>
        <input
          inputMode="text"
          autoCapitalize="characters"
          placeholder={t('collection.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent font-mono text-[12px] focus:outline-none"
          aria-label={t('collection.search_aria')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label={t('collection.search_clear')}
            className="label-mono opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="mt-4 space-y-5">
        {visibleCategories.map((cat) => {
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
              onTap={handleTap}
              onLongPress={handleLongPress}
            />
          );
        })}
        {visibleCategories.length === 0 && (
          <p className="text-sm opacity-60 px-1">{t('collection.no_results')}</p>
        )}
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

      {packOpen && (
        <PackModal collection={collection} onClose={() => setPackOpen(false)} />
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
            onTap={onTap}
            onLongPress={onLongPress}
          />
        ))}
      </div>
    </section>
  );
}
