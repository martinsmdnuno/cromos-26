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
 * 48 teams in Panini's official album order, paired with their flag emoji.
 * Order: Mexico → … → England → Croatia → Ghana → Panama (positions 46–48 confirmed
 * via the wiki's CRO/GHA/PAN section codes).
 *
 * Scotland and England use the regional UN flag glyphs (🏴󠁧󠁢󠁳󠁣󠁴󠁿 / 🏴󠁧󠁢󠁥󠁮󠁧󠁿) — not all
 * platforms render those, so they may show as ⚫ on Windows. That's a system-level
 * font fallback we can't fix here without shipping a flag image set.
 */
const TEAMS_48: { name: string; emoji: string }[] = [
  { name: 'Mexico', emoji: '🇲🇽' },
  { name: 'South Africa', emoji: '🇿🇦' },
  { name: 'South Korea', emoji: '🇰🇷' },
  { name: 'Czechia', emoji: '🇨🇿' },
  { name: 'Canada', emoji: '🇨🇦' },
  { name: 'Bosnia and Herzegovina', emoji: '🇧🇦' },
  { name: 'Qatar', emoji: '🇶🇦' },
  { name: 'Switzerland', emoji: '🇨🇭' },
  { name: 'Brazil', emoji: '🇧🇷' },
  { name: 'Morocco', emoji: '🇲🇦' },
  { name: 'Haiti', emoji: '🇭🇹' },
  { name: 'Scotland', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'USA', emoji: '🇺🇸' },
  { name: 'Paraguay', emoji: '🇵🇾' },
  { name: 'Australia', emoji: '🇦🇺' },
  { name: 'Turkey', emoji: '🇹🇷' },
  { name: 'Germany', emoji: '🇩🇪' },
  { name: 'Curaçao', emoji: '🇨🇼' },
  { name: 'Ivory Coast', emoji: '🇨🇮' },
  { name: 'Ecuador', emoji: '🇪🇨' },
  { name: 'Netherlands', emoji: '🇳🇱' },
  { name: 'Japan', emoji: '🇯🇵' },
  { name: 'Sweden', emoji: '🇸🇪' },
  { name: 'Tunisia', emoji: '🇹🇳' },
  { name: 'Belgium', emoji: '🇧🇪' },
  { name: 'Egypt', emoji: '🇪🇬' },
  { name: 'Iran', emoji: '🇮🇷' },
  { name: 'New Zealand', emoji: '🇳🇿' },
  { name: 'Spain', emoji: '🇪🇸' },
  { name: 'Cape Verde', emoji: '🇨🇻' },
  { name: 'Saudi Arabia', emoji: '🇸🇦' },
  { name: 'Uruguay', emoji: '🇺🇾' },
  { name: 'France', emoji: '🇫🇷' },
  { name: 'Senegal', emoji: '🇸🇳' },
  { name: 'Iraq', emoji: '🇮🇶' },
  { name: 'Norway', emoji: '🇳🇴' },
  { name: 'Argentina', emoji: '🇦🇷' },
  { name: 'Algeria', emoji: '🇩🇿' },
  { name: 'Austria', emoji: '🇦🇹' },
  { name: 'Jordan', emoji: '🇯🇴' },
  { name: 'Portugal', emoji: '🇵🇹' },
  { name: 'Congo DR', emoji: '🇨🇩' },
  { name: 'Uzbekistan', emoji: '🇺🇿' },
  { name: 'Colombia', emoji: '🇨🇴' },
  { name: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Croatia', emoji: '🇭🇷' },
  { name: 'Ghana', emoji: '🇬🇭' },
  { name: 'Panama', emoji: '🇵🇦' },
];

function buildCategories(): CategoryDef[] {
  const cats: CategoryDef[] = [];

  // #1–9 — Tournament intro (Panini logo + emblems + mascots + slogan + ball + hosts).
  cats.push({
    id: 'opening',
    name: 'Opening / Logos',
    colorKey: 'red',
    range: [1, 9],
    emoji: '🎉',
  });

  // #10–20 — FIFA Museum (11 historical World Cup champions).
  cats.push({
    id: 'fifa-museum',
    name: 'FIFA Museum',
    colorKey: 'navy',
    range: [10, 20],
    emoji: '🏆',
  });

  // #21–980 — 48 teams × 20 stickers each = 960 stickers.
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
