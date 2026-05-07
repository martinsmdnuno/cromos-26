import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  normalizeSpokenStickers,
  parseStickerList,
  stickerLabel,
  type CollectionMap,
} from '@cromos/shared';
import { api } from '../api';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useT } from '../i18n/LangContext';

interface Props {
  collection: CollectionMap;
  onClose: () => void;
}

/**
 * Fast-entry modal for "I just opened a pack" or "I want to import a list".
 *
 * Three input paths, all funneling through the same `parseStickerList` parser:
 *   - Type / paste: any whitespace/comma/semicolon/newline-separated codes
 *     (POR3, FWC14, MEX1, 245, 00).
 *   - Voice: tap the mic and say "POR um POR três FWC catorze" (PT) or
 *     "P O R one P O R three" (EN). Recognised text is normalised to the
 *     canonical label form and appended to the textarea, where the user can
 *     edit before submitting.
 *
 * Submission goes through POST /api/collection/bulk with counts = current +
 * delta, so it's one round trip regardless of pack size.
 */
export function PackModal({ collection, onClose }: Props) {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const [raw, setRaw] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const speechLang = lang === 'pt' ? 'pt-PT' : 'en-US';
  const speech = useSpeechRecognition({ lang: speechLang });

  // When new final-transcript text arrives, normalise + append to the textarea
  // and reset the recognised buffer. Using a ref guard so we only consume each
  // chunk once even though `transcript` is a cumulative string.
  const consumedLen = useRef(0);
  useEffect(() => {
    if (speech.transcript.length === consumedLen.current) return;
    const fresh = speech.transcript.slice(consumedLen.current);
    consumedLen.current = speech.transcript.length;
    const normalised = normalizeSpokenStickers(fresh, lang);
    if (!normalised) return;
    setRaw((prev) => (prev ? `${prev.replace(/\s+$/, '')} ${normalised} ` : `${normalised} `));
  }, [speech.transcript, lang]);

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

  const toggleMic = () => {
    if (speech.isListening) speech.stop();
    else speech.start();
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
          {speech.supported && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={
                speech.isListening ? t('pack.mic_stop_aria') : t('pack.mic_start_aria')
              }
              aria-pressed={speech.isListening}
              className={`absolute right-2 top-2 w-9 h-9 rounded-full border-2 border-panini-ink flex items-center justify-center transition-colors ${
                speech.isListening
                  ? 'bg-panini-red text-white animate-pulse'
                  : 'bg-white hover:bg-panini-cream'
              }`}
              title={speech.isListening ? t('pack.mic_stop') : t('pack.mic_start')}
            >
              <span aria-hidden="true">🎤</span>
            </button>
          )}
        </div>

        {/* Live transcript while listening */}
        {speech.isListening && (
          <div className="mt-2 label-mono opacity-70 italic min-h-[14px]" aria-live="polite">
            {speech.interim || t('pack.mic_listening')}
          </div>
        )}
        {speech.error && speech.error !== 'aborted' && (
          <p className="mt-2 label-mono text-panini-red">
            {t('pack.mic_error', { err: speech.error })}
          </p>
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
