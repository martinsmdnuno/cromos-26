import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { groupMissingBySection, PALETTE, stickerLabel, type PaletteKey } from '@cromos/shared';
import { Trophy } from '../components/Trophy';
import { useT } from '../i18n/LangContext';
import { downloadChecklistPdf } from '../lib/checklistPdf';

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
  duplicateNumbers: number[];
}

export function Stats() {
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
                {t(`category.${c.id}`)}
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

      {/* Missing list (collapsible, copyable, exportable). */}
      <ChecklistCard
        numbers={s.missingNumbers}
        accentClass="bg-panini-red"
        countKey="stats.missing_count"
        emptyKey="stats.complete"
        pdf={{
          titleKey: 'pdf.title',
          subtitleKey: 'pdf.subtitle',
          footerNoteKey: 'pdf.footer_note',
          filenameKey: 'pdf.filename',
        }}
      />

      {/* Duplicates list — same shape, plus a cross-sell CTA on the PDF so every
          shared list advertises the app to the recipient. */}
      <ChecklistCard
        numbers={s.duplicateNumbers}
        accentClass="bg-panini-yellow"
        countKey="stats.duplicates_count"
        emptyKey="stats.no_duplicates"
        pdf={{
          titleKey: 'pdf.dup_title',
          subtitleKey: 'pdf.dup_subtitle',
          footerNoteKey: 'pdf.dup_footer_note',
          filenameKey: 'pdf.dup_filename',
          ctaKey: 'pdf.dup_cta',
        }}
      />

      {/* Cross-sell: subtle footer card pointing to the sister app. Same dev,
          complementary need (predictions / betting pool vs sticker tracking). */}
      <a
        href="https://martinsmdnuno.github.io/wc26/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 card flex items-center gap-3 px-4 py-3 hover:bg-panini-cream transition-colors"
      >
        <div className="w-10 h-10 rounded-lg border-2 border-panini-ink bg-panini-blue text-white font-display flex items-center justify-center text-base flex-shrink-0">
          wc26
        </div>
        <div className="flex-1 min-w-0">
          <div className="label-mono opacity-60">{t('cross.stats_footer_lead')}</div>
          <div className="font-semibold text-[13px]">{t('cross.stats_footer_cta')}</div>
        </div>
      </a>

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

interface ChecklistPdfKeys {
  titleKey: string;
  subtitleKey: string;
  footerNoteKey: string;
  filenameKey: string;
  /** Optional — when set, the PDF renders a yellow CTA strip above the footer. */
  ctaKey?: string;
}

/**
 * Reusable card for any "list of sticker numbers grouped by section" stat —
 * Show list / Copy all / Export PDF. The missing list and the duplicates list
 * both render through this; only the labels, accent colour, and PDF copy differ.
 */
function ChecklistCard({
  numbers,
  accentClass,
  countKey,
  emptyKey,
  pdf,
}: {
  numbers: number[];
  accentClass: string;
  countKey: string;
  emptyKey: string;
  pdf: ChecklistPdfKeys;
}) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const text = useMemo(() => numbers.map((n) => stickerLabel(n)).join(', '), [numbers]);

  async function exportPdf() {
    if (exporting || numbers.length === 0) return;
    setExporting(true);
    try {
      const sections = groupMissingBySection(numbers).map((g) => ({
        code: g.code,
        name: g.teamIndex === null ? t('pdf.fwc_name') : t(`category.team-${g.teamIndex + 1}`),
        positions: g.positions,
      }));
      const date = new Date().toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB');
      await downloadChecklistPdf({
        sections,
        strings: {
          title: t(pdf.titleKey),
          subtitle: t(pdf.subtitleKey, { total: numbers.length, sections: sections.length }),
          footerNote: t(pdf.footerNoteKey),
          generatedOn: t('pdf.generated_on', { date }),
          fileName: t(pdf.filenameKey),
          ...(pdf.ctaKey ? { cta: t(pdf.ctaKey) } : {}),
        },
      });
    } catch {
      /* ignore — nothing downloads, user can retry */
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2.5 pb-2">
        <div className={`w-1.5 h-5 rounded-sm ${accentClass}`} />
        <h2 className="font-display text-lg tracking-wide">{t(countKey, { n: numbers.length })}</h2>
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
        <button
          onClick={exportPdf}
          disabled={exporting || numbers.length === 0}
          className="pill w-full mt-2 bg-panini-blue text-white disabled:opacity-50"
        >
          {exporting ? t('pdf.exporting') : t('stats.export_pdf')}
        </button>
        {open && (
          <pre
            className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-words bg-panini-cream border-2 border-panini-ink rounded-lg p-3 max-h-72 overflow-auto"
            aria-label={t(countKey, { n: numbers.length })}
          >
            {text || t(emptyKey)}
          </pre>
        )}
      </div>
    </section>
  );
}
