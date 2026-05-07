// Domain types shared between API and web.

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Sticker {
  number: number;
  count: number; // 0 = missing, 1 = owned, 2+ = duplicates
}

export type CollectionMap = Record<number, number>; // sticker number -> count

export interface Group {
  id: string;
  name: string;
  code: string; // 6-char uppercase alphanumeric
  createdById: string;
  createdAt: string;
  members: GroupMember[];
}

export interface GroupMember {
  userId: string;
  name: string;
  joinedAt: string;
  /** team color assigned within the group, hex string */
  color: string;
}

/** Per-member view inside a group: stats only (no individual sticker numbers leak unless requested). */
export interface MemberStats {
  userId: string;
  name: string;
  color: string;
  owned: number;
  duplicates: number;
  total: number;
  completionPct: number;
}

/** Public view of a member's full collection (for trade matching with peers in the same group). */
export interface MemberCollection {
  userId: string;
  name: string;
  collection: CollectionMap;
}

export interface DirectTradeView {
  // From the perspective of the current user vs `otherId`.
  iCanGive: number[]; // my dups they're missing
  theyCanGive: number[]; // their dups I'm missing
}

export interface TradeSuggestion {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  /** balanced count: same number of stickers each direction */
  count: number;
  aGives: number[];
  bGives: number[];
  /** true if current user is one of the two parties */
  involvesMe: boolean;
}

export interface CategoryDef {
  id: string;
  name: string;
  /** color id from the palette (red|orange|yellow|green|teal|blue|navy|purple) */
  colorKey: PaletteKey;
  /** inclusive sticker number range */
  range: [number, number];
}

export type PaletteKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'navy'
  | 'purple';
