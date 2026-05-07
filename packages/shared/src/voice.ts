/**
 * Voice → sticker tokens.
 *
 * Web Speech Recognition is reasonable at hearing single letters and numbers
 * but not at hearing 3-letter codes as one word ("POR" usually comes back as
 * either "por" — sometimes confused with the Portuguese preposition — or as
 * three separate letters "p", "o", "r"). This module normalises whatever the
 * browser hands back into a flat string of canonical labels (`POR1 FWC14 245`)
 * that `parseStickerList` already consumes.
 *
 * Strategy:
 *  1. Lowercase + deaccent + tokenise on whitespace.
 *  2. Collapse runs of single letters into 3-letter prefix candidates.
 *  3. Convert digit words ("um", "três" / "one", "three") to digits.
 *  4. Merge adjacent (PREFIX, NUMBER) pairs into combined `POR3` tokens.
 *
 * The lang hint biases the digit-word lookup but we always try the other lang
 * as a fallback — speech recognition's lang detection is unreliable, and a
 * Portuguese-speaking user might still get "tres" interpreted in EN mode.
 */

const PT_DIGITS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezasseis: 16,
  dezassete: 17,
  dezoito: 18,
  dezanove: 19,
  vinte: 20,
};

const EN_DIGITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizeSpokenStickers(
  transcript: string,
  lang: 'pt' | 'en' = 'pt',
): string {
  const primary = lang === 'pt' ? PT_DIGITS : EN_DIGITS;
  const fallback = lang === 'pt' ? EN_DIGITS : PT_DIGITS;

  const words = deaccent(transcript)
    .toLowerCase()
    .split(/\s+/)
    .filter((s) => s.length > 0);

  const tokens: string[] = [];
  let letterRun: string[] = [];

  const flushLetters = () => {
    while (letterRun.length >= 3) {
      tokens.push(letterRun.slice(0, 3).join('').toUpperCase());
      letterRun = letterRun.slice(3);
    }
    // Leftover < 3 letters are noise (e.g. "or" alone) — drop.
    letterRun = [];
  };

  for (const w of words) {
    // Single letter — accumulate into the current prefix run.
    if (/^[a-z]$/.test(w)) {
      letterRun.push(w);
      continue;
    }
    flushLetters();

    if (/^\d+$/.test(w)) {
      tokens.push(w);
      continue;
    }

    if (w in primary) {
      tokens.push(String(primary[w]));
      continue;
    }
    if (w in fallback) {
      tokens.push(String(fallback[w]));
      continue;
    }

    // Pre-merged tokens: "POR" / "FWC" / "POR3".
    if (/^[a-z]{3}$/.test(w)) {
      tokens.push(w.toUpperCase());
      continue;
    }
    if (/^[a-z]{3}\d+$/.test(w)) {
      tokens.push(w.toUpperCase());
      continue;
    }

    // Unknown word (e.g. country name we didn't map) — drop. The user can edit
    // the transcript to fix it.
  }
  flushLetters();

  // Merge adjacent (PREFIX, NUMBER) pairs into one combined token.
  const merged: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const cur = tokens[i]!;
    const next = tokens[i + 1];
    if (/^[A-Z]{3}$/.test(cur) && next && /^\d+$/.test(next)) {
      merged.push(cur + next);
      i += 2;
    } else {
      merged.push(cur);
      i += 1;
    }
  }

  return merged.join(' ');
}
