import type { CategoryDef, PaletteKey } from './types.js';

/**
 * STICKER & TEAM CONFIG
 * =====================
 * The Panini FIFA World Cup 2026 sticker album has 744 stickers total.
 * The official sticker list isn't fully public yet; the structure below is a
 * best-guess layout that matches the "expanded 48-team" 2026 format and is
 * easy to update when Panini publishes the real list.
 *
 * --- HOW TO UPDATE WHEN THE OFFICIAL LIST PUBLISHES ---
 *  1. Each section below is a `CategoryDef` with an inclusive [start, end] sticker range.
 *  2. The `colorKey` picks one of the 8 palette colors (see PALETTE) — that color drives
 *     the team's tile color, category-flag color, progress-bar color, and stats-row color
 *     across the entire UI. So changing it here updates every screen.
 *  3. Re-run `pnpm typecheck` — the assertion at the bottom of this file (TOTAL === 744)
 *     will fail with a clear error if your ranges overlap or don't cover all 744 stickers.
 *  4. No DB migration needed — categories are computed on the fly. Existing user data
 *     (sticker numbers + counts) is preserved.
 *
 * Layout used here:
 *  - 1–20    Opening / Logos / FIFA mascot
 *  - 21–40   Stadiums (16 host stadiums across USA/Mexico/Canada)
 *  - 41–664  48 teams × 13 stickers each (1 team-header + 12 player + variants)
 *  - 665–714 Legends (50 historic players)
 *  - 715–744 Shiny Specials (golden moments, parallel inserts)
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

export const TOTAL_STICKERS = 744;

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

const TEAMS_48 = [
  'Canada',
  'Mexico',
  'USA',
  'Argentina',
  'Brasil',
  'Uruguai',
  'Colômbia',
  'Equador',
  'Paraguai',
  'França',
  'Inglaterra',
  'Alemanha',
  'Espanha',
  'Portugal',
  'Itália',
  'Países Baixos',
  'Bélgica',
  'Croácia',
  'Suíça',
  'Áustria',
  'Dinamarca',
  'Polónia',
  'Sérvia',
  'Turquia',
  'Marrocos',
  'Senegal',
  'Tunísia',
  'Argélia',
  'Egito',
  'Nigéria',
  'Costa do Marfim',
  'Camarões',
  'Gana',
  'Japão',
  'Coreia do Sul',
  'Austrália',
  'Irão',
  'Arábia Saudita',
  'Qatar',
  'Iraque',
  'Uzbequistão',
  'Nova Zelândia',
  'Costa Rica',
  'Panamá',
  'Jamaica',
  'Chile',
  'Peru',
  'Bolívia',
];

// Build the categories programmatically so the totals always sum cleanly.
function buildCategories(): CategoryDef[] {
  const cats: CategoryDef[] = [];

  cats.push({
    id: 'opening',
    name: 'Opening / Logos',
    colorKey: 'red',
    range: [1, 20],
  });

  cats.push({
    id: 'stadiums',
    name: 'Stadiums',
    colorKey: 'navy',
    range: [21, 40],
  });

  // 48 teams × 13 stickers = 624 stickers, range 41..664
  let cursor = 41;
  const stickersPerTeam = 13;
  for (let i = 0; i < 48; i++) {
    const start = cursor;
    const end = cursor + stickersPerTeam - 1;
    cats.push({
      id: `team-${i + 1}`,
      name: TEAMS_48[i] ?? `Team ${i + 1}`,
      colorKey: PALETTE_KEYS[i % PALETTE_KEYS.length]!,
      range: [start, end],
    });
    cursor = end + 1;
  }

  cats.push({
    id: 'legends',
    name: 'Legends',
    colorKey: 'purple',
    range: [665, 714],
  });

  cats.push({
    id: 'shiny-specials',
    name: 'Shiny Specials',
    colorKey: 'yellow',
    range: [715, 744],
  });

  return cats;
}

export const CATEGORIES: CategoryDef[] = buildCategories();

// Compile-time-ish sanity check: ranges are contiguous and cover 1..744 exactly.
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
  // Should never happen given the sanity check above.
  throw new Error(`Sticker number ${num} is out of range 1..${TOTAL_STICKERS}`);
}

export function colorForSticker(num: number): string {
  return PALETTE[categoryForSticker(num).colorKey];
}

export function categorySize(c: CategoryDef): number {
  return c.range[1] - c.range[0] + 1;
}

/** All sticker numbers in order, useful for rendering the full grid. */
export function allStickerNumbers(): number[] {
  const arr = new Array(TOTAL_STICKERS);
  for (let i = 0; i < TOTAL_STICKERS; i++) arr[i] = i + 1;
  return arr;
}
