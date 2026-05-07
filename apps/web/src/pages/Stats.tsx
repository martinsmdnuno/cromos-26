import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { PALETTE, type PaletteKey } from '@cromos/shared';
import { useAuth } from '../hooks/useAuth';
import { Trophy } from '../components/Trophy';
import { useT } from '../i18n/LangContext';

interface StatsResponse {
  total: number;
  owned: number;
  missing: number;
  duplicates: number;
  heldTotal: number;
  completionPct: number;
  categories: {
    id: string;
    name: string;
    colorKey: PaletteKey;
    emoji: string;
    size: number;
    owned: number;
  }[];
  missingNumbers: number[];
}

export function Stats() {
  const { logout } = useAuth();
  const { t } = useT();
  const q = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<StatsResponse>('/api/stats'),
    refetchInterval: 15_000,
  });

  if (q.isLoading || !q.data) {
    return <div className="px-5 mt-3 label-mono opacity-50">{t('groups.loading')}</div>;
  }
  const s = q.data;
  const pctInt = Math.floor(s.completionPct);

  return (
    <div className="px-5 pb-10">
      <div className="pt-3 pb-2">
        <h1 className="font-display text-3xl tracking-wide uppercase">{t('stats.your_progress')}</h1>
      </div>

      {/* Hero — 110px "26"-style number with quilt shapes */}
      <div className="card-hero p-5 mb-4">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute -top-7 -right-7 w-32 h-32 rounded-full"
            style={{ background: '#E63027' }}
          />
          <div
            className="absolute bottom-[-20px] right-[60px] w-20 h-20 rounded-full"
            style={{ background: '#F4C430' }}
          />
          {/* Trophy as the "you're chasing the cup" cue, sized so it doesn't fight with the % number. */}
          <div className="absolute top-2 right-4 -rotate-6">
            <Trophy size={72} color="#F4C430" stroke="#1A1A1A" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="label-mono opacity-70">{t('app.album_completion')}</div>
          <div
            className="num-display"
            style={{ fontSize: 110, lineHeight: 0.85, letterSpacing: '-4px' }}
          >
            {pctInt}
            <span style={{ fontSize: 60, color: '#E63027' }}>%</span>
          </div>
          <div className="font-mono text-[12px] font-bold mt-1.5">
            {t('stats.x_of_y', { owned: s.owned, total: s.total })}
          </div>
        </div>
      </div>

      {/* 4 colored stat blocks */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Block label={t('stats.block.owned')} value={s.owned} bg="#6FBE44" textInk />
        <Block label={t('stats.block.missing')} value={s.missing} bg="#E63027" />
        <Block label={t('stats.block.duplicates')} value={s.duplicates} bg="#F4C430" textInk />
        <Block label={t('stats.block.total')} value={s.heldTotal} bg="#7B4B9E" />
      </div>

      {/* Category breakdown */}
      <div className="flex items-center gap-2.5 pt-2 pb-2">
        <div className="w-1.5 h-5 rounded-sm bg-panini-blue" />
        <h2 className="font-display text-lg tracking-wide">{t('stats.by_category')}</h2>
      </div>
      <ul className="space-y-1.5">
        {s.categories.map((c) => {
          const color = PALETTE[c.colorKey];
          const pct = c.size === 0 ? 0 : Math.round((c.owned / c.size) * 100);
          return (
            <li
              key={c.id}
              className="card flex items-center gap-2.5 px-3 py-2"
            >
              <span
                className="w-3.5 h-3.5 rounded border-[1.5px] border-panini-ink flex-shrink-0"
                style={{ background: color }}
              />
              <span className="text-base leading-none" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="font-semibold text-[13px] truncate" style={{ width: 96 }}>
                {c.name}
              </span>
              <div className="flex-1 h-2 bg-panini-cream border border-panini-ink rounded overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="font-mono font-bold text-[11px] w-14 text-right">
                {c.owned}/{c.size}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Missing list (collapsible, copyable) */}
      <MissingList numbers={s.missingNumbers} />

      <div className="mt-8 flex justify-center">
        <button onClick={() => logout()} className="pill text-panini-red border-panini-red">
          {t('auth.sign_out')}
        </button>
      </div>
    </div>
  );
}

function Block({
  label,
  value,
  bg,
  textInk,
}: {
  label: string;
  value: number;
  bg: string;
  textInk?: boolean;
}) {
  return (
    <div
      className="border-3 border-panini-ink rounded-[14px] p-3.5"
      style={{ background: bg, color: textInk ? '#1A1A1A' : '#FFFFFF' }}
    >
      <div className="label-mono">{label}</div>
      <div className="num-display text-[44px] leading-[0.9] mt-1">{value}</div>
    </div>
  );
}

function MissingList({ numbers }: { numbers: number[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => numbers.join(', '), [numbers]);

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-1.5 h-5 rounded-sm bg-panini-red" />
        <h2 className="font-display text-lg tracking-wide">
          {t('stats.missing_count', { n: numbers.length })}
        </h2>
      </div>
      <div className="card p-3">
        <div className="flex gap-2">
          <button onClick={() => setOpen((o) => !o)} className="pill flex-1" aria-expanded={open}>
            {open ? t('stats.hide_list') : t('stats.show_list')}
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
            className="pill flex-1 bg-panini-yellow"
          >
            {copied ? t('stats.copied') : t('stats.copy_all')}
          </button>
        </div>
        {open && (
          <pre
            className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-words bg-panini-cream border-2 border-panini-ink rounded-lg p-3 max-h-72 overflow-auto"
            aria-label={t('stats.missing_count', { n: numbers.length })}
          >
            {text || t('stats.complete')}
          </pre>
        )}
      </div>
    </section>
  );
}
