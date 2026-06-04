import { api } from '../api';

/**
 * Decode the file as an image, scale so the longest edge ≤ `maxEdge`, and
 * return the JPEG base64 (without the data-URL prefix) ready to POST.
 * Keeps the photo small enough for a snappy upload and well under Anthropic's
 * 5 MB image cap.
 */
export async function resizeAndEncode(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<string> {
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

/** Which step the scan is on, so callers can show a matching status line. */
export type ScanPhase = 'uploading' | 'analyzing';

/**
 * Snap → downsize → ask the server (which forwards to Claude vision, keeping
 * the API key off the client) to read the sticker codes off the backs.
 * Returns a space-separated codes string ready for `parseStickerList`, or an
 * empty string when nothing was recognised. Shared by the pack and trade
 * modals so the photo pipeline lives in exactly one place.
 */
export async function scanStickerPhoto(
  file: File,
  onPhase?: (phase: ScanPhase) => void,
): Promise<string> {
  onPhase?.('uploading');
  // Downsize to ~1568 px max edge at JPEG q=0.85 — keeps upload to ~400-700 KB
  // while preserving badge legibility. (1568 px is Anthropic's documented
  // sweet spot.)
  const base64 = await resizeAndEncode(file, 1568, 0.85);
  onPhase?.('analyzing');
  const res = await api.post<{ codes: string; raw: string }>('/api/pack/photo', {
    image: base64,
    mediaType: 'image/jpeg',
  });
  return res.codes ?? '';
}
