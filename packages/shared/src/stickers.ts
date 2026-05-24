import type { CategoryDef, PaletteKey } from './types.js';

/**
 * STICKER & TEAM CONFIG — Panini FIFA World Cup 2026™ Official Sticker Collection
 * ================================================================================
 * Source: Panini America + checklistinsider.com (verified 2026-05-07).
 *
 * Total: 980 stickers (the largest WC album Panini has ever produced).
 *
 * Structure:
 *  - #1            Panini logo foil (the "00" in Panini's own numbering)
 *  - #2–9          Tournament intro (8 stickers — emblems, mascots, slogan, ball, hosts)
 *  - #10–20        FIFA Museum (11 stickers — past WC champions, Italy 1934 → Argentina 2022)
 *  - #21–980       48 teams × 20 stickers each
 *                  Per team: 1 team crest foil + 1 team photo + 18 player portraits
 *
 * The 12 Coca-Cola exclusive stickers are NOT part of the base 980 set — they're a
 * separate insert that ships in marked Coke bottles. We don't model them here.
 *
 * Team order matches Panini's official album layout (FIFA group order at print time).
 *
 * --- HOW TO UPDATE ---
 * Each `CategoryDef` has an inclusive [start, end] range, a `colorKey` from the
 * 8-color palette, and an `emoji` (country flag for teams, themed emoji otherwise).
 * The runtime sanity check at the bottom fails loudly if ranges overlap or don't sum
 * to 980. No DB migration needed — categories are computed on the fly. Existing user
 * data (sticker numbers + counts) is preserved.
 */

export const PALETTE: Record<PaletteKey, string> = {
  red: '#E63027',
  orange: '#F2812A',
  yellow: '#F4C430',
  green: '#6FBE44',
  teal: '#2FB8AB',
  blue: '#2E6FB8',
  navy: '#1B3A6B',
  purple: '#7B4B9E',
};

export const TOTAL_STICKERS = 980;

const PALETTE_KEYS: PaletteKey[] = [
  'red',
  'yellow',
  'blue',
  'green',
  'orange',
  'teal',
  'navy',
  'purple',
];

/**
 * 48 teams in Panini's official album order, paired with their flag emoji and the
 * 3-letter code Panini prints on each sticker (FIFA / IOC standard, with the few
 * Panini-specific quirks: KSA for Saudi Arabia, MAR for Morocco, ALG for Algeria,
 * KOR for South Korea, CIV for Côte d'Ivoire, CUW for Curaçao, BIH for Bosnia).
 *
 * Scotland and England use the regional UN flag glyphs (🏴󠁧󠁢󠁳󠁣󠁴󠁿 / 🏴󠁧󠁢󠁥󠁮󠁧󠁿) — not all
 * platforms render those, so they may show as ⚫ on Windows. That's a system-level
 * font fallback we can't fix here without shipping a flag image set.
 */
const TEAMS_48: { name: string; emoji: string; code: string }[] = [
  { name: 'Mexico', emoji: '🇲🇽', code: 'MEX' },
  { name: 'South Africa', emoji: '🇿🇦', code: 'RSA' },
  { name: 'South Korea', emoji: '🇰🇷', code: 'KOR' },
  { name: 'Czechia', emoji: '🇨🇿', code: 'CZE' },
  { name: 'Canada', emoji: '🇨🇦', code: 'CAN' },
  { name: 'Bosnia and Herzegovina', emoji: '🇧🇦', code: 'BIH' },
  { name: 'Qatar', emoji: '🇶🇦', code: 'QAT' },
  { name: 'Switzerland', emoji: '🇨🇭', code: 'SUI' },
  { name: 'Brazil', emoji: '🇧🇷', code: 'BRA' },
  { name: 'Morocco', emoji: '🇲🇦', code: 'MAR' },
  { name: 'Haiti', emoji: '🇭🇹', code: 'HAI' },
  { name: 'Scotland', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'SCO' },
  { name: 'USA', emoji: '🇺🇸', code: 'USA' },
  { name: 'Paraguay', emoji: '🇵🇾', code: 'PAR' },
  { name: 'Australia', emoji: '🇦🇺', code: 'AUS' },
  { name: 'Turkey', emoji: '🇹🇷', code: 'TUR' },
  { name: 'Germany', emoji: '🇩🇪', code: 'GER' },
  { name: 'Curaçao', emoji: '🇨🇼', code: 'CUW' },
  { name: 'Ivory Coast', emoji: '🇨🇮', code: 'CIV' },
  { name: 'Ecuador', emoji: '🇪🇨', code: 'ECU' },
  { name: 'Netherlands', emoji: '🇳🇱', code: 'NED' },
  { name: 'Japan', emoji: '🇯🇵', code: 'JPN' },
  { name: 'Sweden', emoji: '🇸🇪', code: 'SWE' },
  { name: 'Tunisia', emoji: '🇹🇳', code: 'TUN' },
  { name: 'Belgium', emoji: '🇧🇪', code: 'BEL' },
  { name: 'Egypt', emoji: '🇪🇬', code: 'EGY' },
  { name: 'Iran', emoji: '🇮🇷', code: 'IRN' },
  { name: 'New Zealand', emoji: '🇳🇿', code: 'NZL' },
  { name: 'Spain', emoji: '🇪🇸', code: 'ESP' },
  { name: 'Cape Verde', emoji: '🇨🇻', code: 'CPV' },
  { name: 'Saudi Arabia', emoji: '🇸🇦', code: 'KSA' },
  { name: 'Uruguay', emoji: '🇺🇾', code: 'URU' },
  { name: 'France', emoji: '🇫🇷', code: 'FRA' },
  { name: 'Senegal', emoji: '🇸🇳', code: 'SEN' },
  { name: 'Iraq', emoji: '🇮🇶', code: 'IRQ' },
  { name: 'Norway', emoji: '🇳🇴', code: 'NOR' },
  { name: 'Argentina', emoji: '🇦🇷', code: 'ARG' },
  { name: 'Algeria', emoji: '🇩🇿', code: 'ALG' },
  { name: 'Austria', emoji: '🇦🇹', code: 'AUT' },
  { name: 'Jordan', emoji: '🇯🇴', code: 'JOR' },
  { name: 'Portugal', emoji: '🇵🇹', code: 'POR' },
  { name: 'Congo DR', emoji: '🇨🇩', code: 'COD' },
  { name: 'Uzbekistan', emoji: '🇺🇿', code: 'UZB' },
  { name: 'Colombia', emoji: '🇨🇴', code: 'COL' },
  { name: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG' },
  { name: 'Croatia', emoji: '🇭🇷', code: 'CRO' },
  { name: 'Ghana', emoji: '🇬🇭', code: 'GHA' },
  { name: 'Panama', emoji: '🇵🇦', code: 'PAN' },
];

/** Codes in album order, exported so other modules don't need to re-derive them. */
export const TEAM_CODES: string[] = TEAMS_48.map((t) => t.code);

function buildCategories(): CategoryDef[] {
  const cats: CategoryDef[] = [];

  // #1–9 — Tournament intro (Panini "00" foil + emblems + mascots + slogan + ball + hosts).
  // Panini labels these FWC1..FWC8 on the stickers themselves; #1 is the silver "00".
  cats.push({
    id: 'opening',
    name: 'Opening / Logos',
    colorKey: 'red',
    range: [1, 9],
    emoji: '🎉',
    prefix: 'FWC',
  });

  // #10–20 — FIFA Museum (11 historical World Cup champions, FWC9..FWC19 on the album).
  cats.push({
    id: 'fifa-museum',
    name: 'FIFA Museum',
    colorKey: 'navy',
    range: [10, 20],
    emoji: '🏆',
    prefix: 'FWC',
  });

  // #21–980 — 48 teams × 20 stickers each = 960 stickers. Each team's stickers are
  // labelled `${code}1..${code}20` on the album.
  let cursor = 21;
  const stickersPerTeam = 20;
  for (let i = 0; i < 48; i++) {
    const start = cursor;
    const end = cursor + stickersPerTeam - 1;
    const team = TEAMS_48[i]!;
    cats.push({
      id: `team-${i + 1}`,
      name: team.name,
      colorKey: PALETTE_KEYS[i % PALETTE_KEYS.length]!,
      range: [start, end],
      emoji: team.emoji,
      prefix: team.code,
    });
    cursor = end + 1;
  }

  return cats;
}

export const CATEGORIES: CategoryDef[] = buildCategories();

// Sanity check: ranges are contiguous and cover 1..TOTAL_STICKERS exactly.
(() => {
  let expected = 1;
  for (const c of CATEGORIES) {
    if (c.range[0] !== expected) {
      throw new Error(
        `Category ${c.id} starts at ${c.range[0]}, expected ${expected}. ` +
          `Check stickers.ts ranges — they must be contiguous from 1 to ${TOTAL_STICKERS}.`,
      );
    }
    if (c.range[1] < c.range[0]) {
      throw new Error(`Category ${c.id} has invalid range ${c.range[0]}..${c.range[1]}`);
    }
    expected = c.range[1] + 1;
  }
  const last = CATEGORIES[CATEGORIES.length - 1]!;
  if (last.range[1] !== TOTAL_STICKERS) {
    throw new Error(
      `Categories cover up to ${last.range[1]} but expected ${TOTAL_STICKERS}. Update stickers.ts.`,
    );
  }
})();

export function categoryForSticker(num: number): CategoryDef {
  for (const c of CATEGORIES) {
    if (num >= c.range[0] && num <= c.range[1]) return c;
  }
  throw new Error(`Sticker number ${num} is out of range 1..${TOTAL_STICKERS}`);
}

export function colorForSticker(num: number): string {
  return PALETTE[categoryForSticker(num).colorKey];
}

export function categorySize(c: CategoryDef): number {
  return c.range[1] - c.range[0] + 1;
}

/** All sticker numbers in order. */
export function allStickerNumbers(): number[] {
  const arr = new Array(TOTAL_STICKERS);
  for (let i = 0; i < TOTAL_STICKERS; i++) arr[i] = i + 1;
  return arr;
}

/**
 * Album-printed label for a sticker number, matching Panini's own numbering scheme.
 *
 *  - #1            → `00`        (Panini silver foil — the official "zero")
 *  - #2..#9        → `FWC1..FWC8`  (tournament intro, opening block)
 *  - #10..#20      → `FWC9..FWC19` (FIFA Museum, past champions)
 *  - #21..#40      → `MEX1..MEX20` (team prefix from the 3-letter FIFA code)
 *  - #41..#60      → `RSA1..RSA20`
 *  - …
 *  - #961..#980    → `PAN1..PAN20`
 *
 * The internal integer (1..980) is the source of truth for storage and trades; this
 * function only affects how the sticker is rendered to humans.
 */
export function stickerLabel(num: number): string {
  if (num === 1) return '00';
  const cat = categoryForSticker(num);
  if (cat.prefix === 'FWC') {
    // FWC numbering starts at sticker #2, so subtract 1 to get FWC1..FWC19.
    return `FWC${num - 1}`;
  }
  const positionInTeam = num - cat.range[0] + 1;
  return `${cat.prefix}${positionInTeam}`;
}

/**
 * Position of a sticker *within its album section*, as printed under the section
 * heading on a checklist:
 *
 *  - #1            → `00`        (Panini silver foil)
 *  - #2..#20       → `1..19`     (FWC section — opening + FIFA Museum share one heading)
 *  - team stickers → `1..20`
 *
 * Unlike `stickerLabel`, this drops the prefix because the section heading already
 * carries it (e.g. the row labelled `POR` lists `1 2 5 …`, not `POR1 POR2 POR5`).
 */
export function stickerPositionLabel(num: number): string {
  if (num === 1) return '00';
  const cat = categoryForSticker(num);
  if (cat.prefix === 'FWC') return String(num - 1);
  return String(num - cat.range[0] + 1);
}

/** One album section (FWC block or a single team) with the positions still missing. */
export interface MissingSection {
  /** 3-letter section code: `FWC` for the opening + museum block, else the team code. */
  code: string;
  /** 0-based album index of the team (Mexico = 0 … Panama = 47), or `null` for the FWC block. */
  teamIndex: number | null;
  /** Missing positions within the section, in ascending album order (e.g. `['00','1','7']`). */
  positions: string[];
}

/**
 * Group a list of missing sticker numbers into album-ordered sections: the FWC block
 * (opening + FIFA Museum, sharing one `FWC` heading) first, then the 48 teams in album
 * order. Sections with nothing missing are omitted. Input may be unsorted and contain
 * duplicates; output positions are de-duplicated and sorted ascending.
 *
 * Drives the printable "missing stickers" checklist — one row per section, the prefix in
 * the heading, the bare positions listed after it.
 */
export function groupMissingBySection(missing: number[]): MissingSection[] {
  const sorted = [...new Set(missing)].sort((a, b) => a - b);
  const sections: MissingSection[] = [];
  let current: MissingSection | null = null;
  for (const n of sorted) {
    if (n < 1 || n > TOTAL_STICKERS) continue;
    const code = categoryForSticker(n).prefix;
    if (!current || current.code !== code) {
      current = {
        code,
        teamIndex: code === 'FWC' ? null : TEAM_CODES.indexOf(code),
        positions: [],
      };
      sections.push(current);
    }
    current.positions.push(stickerPositionLabel(n));
  }
  return sections;
}

// Reverse lookup: 3-letter code -> 0-based team index (Mexico = 0, Panama = 47).
const CODE_TO_TEAM_INDEX: Map<string, number> = (() => {
  const m = new Map<string, number>();
  TEAMS_48.forEach((t, i) => m.set(t.code, i));
  return m;
})();

/**
 * Parse a single human-typed token (e.g. `POR3`, `mex 12`, `FWC14`, `245`, `00`)
 * back to the canonical 1..980 sticker number. Returns `null` if the token is not
 * a valid sticker label.
 *
 * Rules, all case-insensitive and tolerant of surrounding whitespace + leading zeros:
 *  - `00`             → 1     (Panini foil)
 *  - pure digits 1..980 → that number
 *  - `FWC1..FWC19`    → 2..20
 *  - `<3-letter code>1..20` → team's offset + position (POR1 = 821, POR20 = 840)
 *
 * Useful for bulk-entry flows: `"POR1 POR3 mex5, 245"` → `[821, 823, 25, 245]`.
 */
export function parseStickerToken(raw: string): number | null {
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  if (t === '00') return 1;
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= TOTAL_STICKERS ? n : null;
  }
  const m = /^([A-Z]+)0*(\d+)$/.exec(t);
  if (!m) return null;
  const prefix = m[1]!;
  const n = Number(m[2]!);
  if (prefix === 'FWC') {
    if (n < 1 || n > 19) return null;
    return n + 1;
  }
  const teamIdx = CODE_TO_TEAM_INDEX.get(prefix);
  if (teamIdx === undefined) return null;
  if (n < 1 || n > 20) return null;
  return 21 + teamIdx * 20 + (n - 1);
}

/**
 * Parse a free-form list (any of: spaces, commas, semicolons, newlines, slashes)
 * of sticker tokens. Returns the resolved integer numbers (in input order, with
 * duplicates preserved) and the unrecognised raw tokens for user feedback.
 */
export function parseStickerList(raw: string): { numbers: number[]; unknown: string[] } {
  const tokens = raw
    .split(/[\s,;/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const numbers: number[] = [];
  const unknown: string[] = [];
  for (const tok of tokens) {
    const n = parseStickerToken(tok);
    if (n === null) unknown.push(tok);
    else numbers.push(n);
  }
  return { numbers, unknown };
}

/**
 * Extract canonical sticker tokens from raw OCR text (e.g. produced by
 * Tesseract.js scanning a photo of sticker backs).
 *
 * Each Panini WC26 sticker back shows the code in a dark badge top-right
 * (e.g. `JOR 7`, `TUR 12`, `FWC 4`). OCR also picks up boilerplate like
 * `FIFA WORLD CUP 2026` and the copyright footer — we filter aggressively
 * against the canonical set of valid prefixes (`TEAM_CODES ∪ {'FWC'}`) so
 * stray uppercase words become noise we drop instead of fake tokens.
 *
 * Returns a space-joined string in the same shape `parseStickerList`
 * already consumes; safe to drop straight into the pack-modal textarea.
 */
export function extractStickerCodesFromOcr(rawOcr: string): string {
  if (!rawOcr) return '';
  const validPrefixes = new Set<string>(['FWC', ...TEAM_CODES]);
  const out: string[] = [];
  // Allow optional whitespace between the prefix and the number ("JOR 7" or "JOR7").
  // Duplicates are preserved on purpose — two stickers with the same code in
  // one packet appear as two badges in the photo and the user wants both
  // counted. The pack modal's preview groups them visually as `POR7 ×2`.
  const re = /\b([A-Z]{3})\s*0*(\d{1,2})\b/g;
  const upper = rawOcr.toUpperCase();
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) {
    const prefix = m[1]!;
    if (!validPrefixes.has(prefix)) continue;
    const n = Number(m[2]!);
    // FWC valid range is 1..19; team codes 1..20.
    if (prefix === 'FWC' ? n < 1 || n > 19 : n < 1 || n > 20) continue;
    out.push(`${prefix}${n}`);
  }
  return out.join(' ');
}

/**
 * Does the sticker `num`'s label match this search query?
 *
 * Designed to feel forgiving:
 *  - Empty/whitespace query → every sticker matches.
 *  - Pure digits → match labels OR the raw integer (so "23" finds both #23 and POR23).
 *  - Letters → case-insensitive substring match against the label (POR finds the
 *    whole Portugal range; POR1 finds exactly POR1).
 *  - Mixed → substring match against the label.
 */
export function stickerMatchesQuery(num: number, query: string): boolean {
  const q = query.trim().toUpperCase();
  if (!q) return true;
  const label = stickerLabel(num).toUpperCase();
  if (label.includes(q)) return true;
  // Allow searching by raw integer for backwards compatibility / power users.
  if (/^\d+$/.test(q) && String(num).includes(q)) return true;
  return false;
}
