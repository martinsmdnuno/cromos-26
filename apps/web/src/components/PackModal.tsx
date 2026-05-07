import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  parseStickerList,
  stickerLabel,
  type CollectionMap,
} from '@cromos/shared';
import { api } from '../api';
import { useT } from '../i18n/LangContext';

interface Props {
  collection: CollectionMap;
  onClose: () => void;
}

/**
 * Fast-entry modal for "I just opened a pack" or "I want to import a list".
 *
 * Accepts any whitespace/comma/semicolon/newline-separated list of sticker codes
 * (POR3, FWC14, MEX1, 245, 00). Resolves them to canonical 1..980 numbers, shows
 * a live preview of what will be added, then increments each sticker's count by
 * the number of times it appears in the input — so typing `MEX1 MEX1` adds 2.
 *
 * Submission goes through the existing POST /api/collection/bulk endpoint with
 * counts = current + delta, so it's one round trip regardless of pack size.
 */
export function PackModal({ collection, onClose }: Props) {
  const { t } = useT();
  const qc = useQueryClient();
  const [raw, setRaw] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    taRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsed = useMemo(() => parseStickerList(raw), [raw]);

  const grouped = useMemo(() => {
    const map = new Map<number, number>();
    for (const n of parsed.numbers) map.set(n, (map.get(n) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([number, delta]) => ({ number, delta }))
      .sort((a, b) => a.number - b.number);
  }, [parsed.numbers]);

  const submit = useMutation({
    mutationFn: async () => {
      if (grouped.length === 0) return { updated: 0 };
      const items = grouped.map(({ number, delta }) => ({
        number,
        count: Math.min(99, (collection[number] ?? 0) + delta),
      }));
      return api.post<{ updated: number }>('/api/collection/bulk', { items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
  });

  const total = parsed.numbers.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('pack.title')}
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{t('pack.title')}</h2>
          <button
            className="label-mono text-panini-ink/70 hover:text-panini-ink"
            onClick={onClose}
            aria-label={t('sticker.close')}
          >
            {t('sticker.close')}
          </button>
        </div>
        <p className="label-mono opacity-60 mt-1">{t('pack.hint')}</p>

        <textarea
          ref={taRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t('pack.placeholder')}
          className="mt-3 w-full h-28 border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream font-mono text-[13px] resize-none focus:outline-none"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />

        {/* Preview */}
        <div className="mt-3 min-h-[44px]">
          {total > 0 && (
            <div className="label-mono opacity-60 mb-1">
              {t('pack.preview_count', { n: total })}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {grouped.map(({ number, delta }) => (
              <span
                key={number}
                className="font-mono text-[11px] font-bold border-2 border-panini-ink rounded-md px-2 py-0.5 bg-white"
              >
                {stickerLabel(number)}
                {delta > 1 && <span className="opacity-70"> ×{delta}</span>}
              </span>
            ))}
            {parsed.unknown.map((tok, i) => (
              <span
                key={`u-${i}`}
                className="font-mono text-[11px] font-bold border-2 border-dashed border-panini-red text-panini-red rounded-md px-2 py-0.5 line-through"
                title={t('pack.unknown')}
              >
                {tok}
              </span>
            ))}
          </div>
          {parsed.unknown.length > 0 && (
            <p className="label-mono text-panini-red mt-2">
              {t('pack.unknown_n', { n: parsed.unknown.length })}
            </p>
          )}
        </div>

        <button
          disabled={submit.isPending || total === 0}
          onClick={() => submit.mutate()}
          className="mt-4 w-full bg-panini-red text-white border-2 border-panini-ink rounded-pill py-3 font-bold disabled:opacity-50"
        >
          {submit.isPending
            ? '...'
            : total === 0
              ? t('pack.submit_empty')
              : t('pack.submit', { n: total })}
        </button>
      </div>
    </div>
  );
}
