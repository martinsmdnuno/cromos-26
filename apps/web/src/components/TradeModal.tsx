import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseStickerList, stickerLabel, type CollectionMap } from '@cromos/shared';
import { api } from '../api';
import { scanStickerPhoto } from '../lib/scanPhoto';
import { useT } from '../i18n/LangContext';

interface Props {
  /** Sticker numbers to pre-fill the "I give" field (e.g. from a trade suggestion). */
  initialGive?: number[];
  /** Sticker numbers to pre-fill the "I receive" field. */
  initialReceive?: number[];
  onClose: () => void;
}

type OcrPhase =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'analyzing' }
  | { kind: 'error'; msg: string };

/** Turn a list of sticker numbers into a space-separated label string for a textarea. */
function codesFromNumbers(nums: number[] | undefined): string {
  if (!nums || nums.length === 0) return '';
  return nums.map(stickerLabel).join(' ') + ' ';
}

/** Count occurrences of each number → Map<number, delta>. */
function groupCounts(numbers: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const n of numbers) map.set(n, (map.get(n) ?? 0) + 1);
  return map;
}

/**
 * "Give away / trade my duplicates" modal.
 *
 * Two free-text fields, both parsed by the same `parseStickerList` used by the
 * pack flow:
 *   - **I give**: every code here decrements that sticker's count (capped at 0).
 *     Meant for handing duplicates to a friend.
 *   - **I receive** (optional): every code here increments the count (capped at
 *     99) — the stickers you got back in the swap. Has the same photo/OCR
 *     shortcut as the pack modal since these are "new" stickers.
 *
 * Both sides are merged into a single net-delta-per-sticker payload and written
 * in one `POST /api/collection/bulk` with `source: 'trade'`, so the /history
 * page shows the give (−) and receive (+) rows tagged 🔄.
 */
export function TradeModal({ initialGive, initialReceive, onClose }: Props) {
  const { t } = useT();
  const qc = useQueryClient();

  // The modal reads the collection itself so it can be opened from anywhere
  // (Collection page, Trades page, group cards) without prop-drilling. On the
  // Collection page this hits the warm cache — no extra round trip.
  const collectionQ = useQuery({
    queryKey: ['collection'],
    queryFn: () => api.get<{ collection: CollectionMap }>('/api/collection'),
  });
  const collection: CollectionMap = collectionQ.data?.collection ?? {};

  const [giveRaw, setGiveRaw] = useState(() => codesFromNumbers(initialGive));
  const [recvRaw, setRecvRaw] = useState(() => codesFromNumbers(initialReceive));
  const [ocr, setOcr] = useState<OcrPhase>({ kind: 'idle' });
  const giveRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    giveRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const giveParsed = useMemo(() => parseStickerList(giveRaw), [giveRaw]);
  const recvParsed = useMemo(() => parseStickerList(recvRaw), [recvRaw]);

  const giveMap = useMemo(() => groupCounts(giveParsed.numbers), [giveParsed.numbers]);
  const recvMap = useMemo(() => groupCounts(recvParsed.numbers), [recvParsed.numbers]);

  // Per-sticker preview rows for the "give" side. `notOwned` flags a code the
  // user typed but has zero of — we keep it visible (red) but it contributes no
  // change. `losesLast` warns when giving drops a sticker below 1 (no longer in
  // the album).
  const giveRows = useMemo(
    () =>
      Array.from(giveMap.entries())
        .map(([number, delta]) => {
          const current = collection[number] ?? 0;
          const after = Math.max(0, current - delta);
          return {
            number,
            delta,
            current,
            after,
            notOwned: current === 0,
            losesLast: current >= 1 && after < 1,
          };
        })
        .sort((a, b) => a.number - b.number),
    [giveMap, collection],
  );

  const recvRows = useMemo(
    () =>
      Array.from(recvMap.entries())
        .map(([number, delta]) => ({ number, delta }))
        .sort((a, b) => a.number - b.number),
    [recvMap],
  );

  // Merge both sides into the absolute-count payload. A sticker appearing on
  // both sides nets out. Only rows whose count actually changes are sent.
  const items = useMemo(() => {
    const numbers = new Set<number>([...giveMap.keys(), ...recvMap.keys()]);
    const out: { number: number; count: number }[] = [];
    for (const number of numbers) {
      const current = collection[number] ?? 0;
      const net = (recvMap.get(number) ?? 0) - (giveMap.get(number) ?? 0);
      const count = Math.max(0, Math.min(99, current + net));
      if (count !== current) out.push({ number, count });
    }
    return out;
  }, [giveMap, recvMap, collection]);

  const giveTotal = giveParsed.numbers.length;
  const recvTotal = recvParsed.numbers.length;
  const unknownCount = giveParsed.unknown.length + recvParsed.unknown.length;

  const submit = useMutation({
    mutationFn: async () => {
      if (items.length === 0) return { updated: 0 };
      return api.post<{ updated: number }>('/api/collection/bulk', {
        items,
        source: 'trade',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
  });

  const onPhoto = async (file: File) => {
    setOcr({ kind: 'uploading' });
    try {
      const codes = await scanStickerPhoto(file, (phase) =>
        setOcr(phase === 'uploading' ? { kind: 'uploading' } : { kind: 'analyzing' }),
      );
      if (!codes) {
        setOcr({ kind: 'error', msg: t('pack.photo_none_found') });
        return;
      }
      // Photo only ever feeds the "I receive" side — those are the new stickers.
      setRecvRaw((prev) => (prev ? `${prev.replace(/\s+$/, '')} ${codes} ` : `${codes} `));
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
      aria-label={t('trade.title')}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{t('trade.title')}</h2>
          <button
            className="label-mono text-panini-ink/70 hover:text-panini-ink"
            onClick={onClose}
            aria-label={t('sticker.close')}
          >
            {t('sticker.close')}
          </button>
        </div>
        <p className="label-mono opacity-60 mt-1">{t('trade.hint')}</p>

        {/* I give */}
        <div className="mt-4">
          <label className="label-mono font-bold flex items-center gap-1.5">
            <span aria-hidden="true">📤</span>
            <span>{t('trade.give_label')}</span>
          </label>
          <textarea
            ref={giveRef}
            value={giveRaw}
            onChange={(e) => setGiveRaw(e.target.value)}
            placeholder={t('pack.placeholder')}
            className="mt-1.5 w-full h-20 border-2 border-panini-ink rounded-xl px-3 py-2 bg-panini-cream font-mono text-[13px] resize-none focus:outline-none"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {giveRows.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {giveRows.map((r) => (
                <span
                  key={r.number}
                  title={
                    r.notOwned
                      ? t('trade.not_owned')
                      : r.losesLast
                        ? t('trade.loses_last')
                        : undefined
                  }
                  className={`font-mono text-[11px] font-bold border-2 rounded-md px-2 py-0.5 ${
                    r.notOwned
                      ? 'border-dashed border-panini-red text-panini-red line-through'
                      : r.losesLast
                        ? 'border-panini-red bg-white'
                        : 'border-panini-ink bg-white'
                  }`}
                >
                  {stickerLabel(r.number)}
                  {r.delta > 1 && <span className="opacity-70"> ×{r.delta}</span>}
                  {!r.notOwned && (
                    <span className="opacity-50">
                      {' '}
                      {r.current}→{r.after}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* I receive */}
        <div className="mt-4">
          <label className="label-mono font-bold flex items-center gap-1.5">
            <span aria-hidden="true">📥</span>
            <span>{t('trade.receive_label')}</span>
            <span className="opacity-50 font-normal">{t('trade.optional')}</span>
          </label>
          <div className="relative mt-1.5">
            <textarea
              value={recvRaw}
              onChange={(e) => setRecvRaw(e.target.value)}
              placeholder={t('pack.placeholder')}
              className="w-full h-20 border-2 border-panini-ink rounded-xl pl-3 pr-12 py-2 bg-panini-cream font-mono text-[13px] resize-none focus:outline-none"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onPhoto(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocr.kind === 'uploading' || ocr.kind === 'analyzing'}
              aria-label={t('pack.photo_aria')}
              title={t('pack.photo_title')}
              className="absolute right-2 top-2 w-9 h-9 rounded-full border-2 border-panini-ink flex items-center justify-center bg-white hover:bg-panini-cream disabled:opacity-50 transition-colors"
            >
              <span aria-hidden="true">📷</span>
            </button>
          </div>
          {ocr.kind === 'uploading' && (
            <div className="mt-2 label-mono opacity-70 italic" aria-live="polite">
              {t('pack.photo_uploading')}
            </div>
          )}
          {ocr.kind === 'analyzing' && (
            <div className="mt-2 label-mono opacity-70 italic" aria-live="polite">
              {t('pack.photo_analyzing')}
            </div>
          )}
          {ocr.kind === 'error' && <p className="mt-2 label-mono text-panini-red">{ocr.msg}</p>}
          {recvRows.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {recvRows.map((r) => (
                <span
                  key={r.number}
                  className="font-mono text-[11px] font-bold border-2 border-panini-teal bg-white rounded-md px-2 py-0.5"
                >
                  {stickerLabel(r.number)}
                  {r.delta > 1 && <span className="opacity-70"> ×{r.delta}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {unknownCount > 0 && (
          <p className="label-mono text-panini-red mt-3">
            {t('pack.unknown_n', { n: unknownCount })}
          </p>
        )}

        <button
          disabled={submit.isPending || items.length === 0}
          onClick={() => submit.mutate()}
          className="mt-4 w-full bg-panini-red text-white border-2 border-panini-ink rounded-pill py-3 font-bold disabled:opacity-50"
        >
          {submit.isPending
            ? '...'
            : items.length === 0
              ? t('trade.submit_empty')
              : t('trade.submit', { give: giveTotal, receive: recvTotal })}
        </button>
      </div>
    </div>
  );
}
