import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  extractStickerCodesFromOcr,
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

type OcrPhase =
  | { kind: 'idle' }
  | { kind: 'loading' } // downloading / initializing the engine
  | { kind: 'recognizing'; pct: number } // running OCR on the photo
  | { kind: 'error'; msg: string };

/**
 * Fast-entry modal for "I just opened a pack" or "I want to import a list".
 *
 * Two input paths, both funneling through the same `parseStickerList` parser:
 *   - Type / paste: any whitespace/comma/semicolon/newline-separated codes
 *     (POR3, FWC14, MEX1, 245, 00).
 *   - Photo: tap the camera button, snap the 7 sticker backs lined up on a
 *     surface. Tesseract.js (lazy-loaded) runs OCR locally on-device, we
 *     filter via the 48-prefix whitelist, and the extracted codes are
 *     appended to the textarea where the user can review before submitting.
 *
 * Submission goes through POST /api/collection/bulk with counts = current +
 * delta, so it's one round trip regardless of pack size.
 */
export function PackModal({ collection, onClose }: Props) {
  const { t } = useT();
  const qc = useQueryClient();
  const [raw, setRaw] = useState('');
  const [ocr, setOcr] = useState<OcrPhase>({ kind: 'idle' });
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const onPhoto = async (file: File) => {
    setOcr({ kind: 'loading' });
    try {
      // Lazy-import tesseract.js so the ~2 MB chunk only loads on first use.
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcr({ kind: 'recognizing', pct: Math.round(m.progress * 100) });
          }
        },
      });
      // Bias for the only characters the sticker badges contain — boosts both
      // speed and accuracy and eliminates whole categories of false positives.
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
      });
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      const extracted = extractStickerCodesFromOcr(text);
      if (!extracted) {
        setOcr({ kind: 'error', msg: t('pack.photo_none_found') });
        return;
      }
      // Append to existing input rather than overwrite — matches the old
      // voice flow's behaviour and lets users stack multiple photos.
      setRaw((prev) => (prev ? `${prev.replace(/\s+$/, '')} ${extracted} ` : `${extracted} `));
      setOcr({ kind: 'idle' });
    } catch (err) {
      console.error('[ocr]', err);
      setOcr({
        kind: 'error',
        msg: err instanceof Error ? err.message : t('pack.photo_error_generic'),
      });
    }
  };

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

        <div className="relative mt-3">
          <textarea
            ref={taRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t('pack.placeholder')}
            className="w-full h-28 border-2 border-panini-ink rounded-xl pl-3 pr-12 py-2 bg-panini-cream font-mono text-[13px] resize-none focus:outline-none"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Reset so re-picking the same file still triggers onChange.
              e.target.value = '';
              if (f) void onPhoto(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={ocr.kind === 'loading' || ocr.kind === 'recognizing'}
            aria-label={t('pack.photo_aria')}
            title={t('pack.photo_title')}
            className="absolute right-2 top-2 w-9 h-9 rounded-full border-2 border-panini-ink flex items-center justify-center bg-white hover:bg-panini-cream disabled:opacity-50 transition-colors"
          >
            <span aria-hidden="true">📷</span>
          </button>
        </div>

        {/* OCR status line */}
        {ocr.kind === 'loading' && (
          <div className="mt-2 label-mono opacity-70 italic" aria-live="polite">
            {t('pack.photo_loading')}
          </div>
        )}
        {ocr.kind === 'recognizing' && (
          <div className="mt-2 label-mono opacity-70 italic" aria-live="polite">
            {t('pack.photo_recognizing', { pct: ocr.pct })}
          </div>
        )}
        {ocr.kind === 'error' && (
          <p className="mt-2 label-mono text-panini-red">{ocr.msg}</p>
        )}

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
