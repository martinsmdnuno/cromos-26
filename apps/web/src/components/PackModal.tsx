import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseStickerList, stickerLabel, type CollectionMap } from '@cromos/shared';
import { api } from '../api';
import { useT } from '../i18n/LangContext';

interface Props {
  collection: CollectionMap;
  onClose: () => void;
}

type OcrPhase =
  | { kind: 'idle' }
  | { kind: 'uploading' } // resizing + uploading the photo
  | { kind: 'analyzing' } // server is talking to Claude
  | { kind: 'error'; msg: string };

/**
 * Fast-entry modal for "I just opened a pack" or "I want to import a list".
 *
 * Two input paths, both funneling through the same `parseStickerList` parser:
 *   - Type / paste: any whitespace/comma/semicolon/newline-separated codes
 *     (POR3, FWC14, MEX1, 245, 00).
 *   - Photo: tap the camera button, snap the 7 sticker backs lined up on a
 *     surface. The image is downsized client-side to ~1568 px max edge and
 *     POSTed to /api/pack/photo, which forwards it to Claude vision (the
 *     API key lives on the server, never in the bundle). Extracted codes
 *     get appended to the textarea where the user can review before
 *     submitting.
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
  // Used to distinguish "photo OCR fed the codes" vs "user typed/pasted them"
  // so the /history page can show the correct icon (📷 vs 📦).
  const usedOcrRef = useRef(false);

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
      return api.post<{ updated: number }>('/api/collection/bulk', {
        items,
        source: usedOcrRef.current ? 'photo' : 'pack',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
  });

  const total = parsed.numbers.length;

  const onPhoto = async (file: File) => {
    setOcr({ kind: 'uploading' });
    try {
      // Downsize to ~1568 px max edge at JPEG q=0.85 before encoding — keeps
      // upload size to ~400-700 KB while preserving the badge legibility
      // Claude needs. (1568 px is Anthropic's documented sweet spot.)
      const base64 = await resizeAndEncode(file, 1568, 0.85);

      setOcr({ kind: 'analyzing' });
      const res = await api.post<{ codes: string; raw: string }>('/api/pack/photo', {
        image: base64,
        mediaType: 'image/jpeg',
      });

      if (!res.codes) {
        setOcr({ kind: 'error', msg: t('pack.photo_none_found') });
        return;
      }
      // Append to existing input rather than overwrite — lets users stack
      // multiple photos and still tweak the textarea before submitting.
      setRaw((prev) => (prev ? `${prev.replace(/\s+$/, '')} ${res.codes} ` : `${res.codes} `));
      usedOcrRef.current = true;
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
            disabled={ocr.kind === 'uploading' || ocr.kind === 'analyzing'}
            aria-label={t('pack.photo_aria')}
            title={t('pack.photo_title')}
            className="absolute right-2 top-2 w-9 h-9 rounded-full border-2 border-panini-ink flex items-center justify-center bg-white hover:bg-panini-cream disabled:opacity-50 transition-colors"
          >
            <span aria-hidden="true">📷</span>
          </button>
        </div>

        {/* OCR status line */}
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

/**
 * Decode the file as an image, scale so the longest edge ≤ `maxEdge`, and
 * return the JPEG base64 (without the data-URL prefix) ready to POST.
 * Used to keep the photo small enough for a snappy upload and well under
 * Anthropic's 5 MB image cap.
 */
async function resizeAndEncode(file: File, maxEdge: number, quality: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image_decode_failed'));
      i.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas_unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('encode_failed'))),
        'image/jpeg',
        quality,
      );
    });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('read_failed'));
      r.readAsDataURL(blob);
    });
    // Strip the data URL prefix; the server expects raw base64.
    return dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
  } finally {
    URL.revokeObjectURL(url);
  }
}
