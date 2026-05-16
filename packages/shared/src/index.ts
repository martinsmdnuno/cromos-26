export * from './types.js';
export * from './stickers.js';
export * from './trade-optimizer.js';

/** Generate a 6-character uppercase alphanumeric invite code (excluding 0/O/I/1 to avoid confusion). */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

/** Hex colors used to assign a per-member color identity inside a group. */
export const MEMBER_COLOR_CYCLE = [
  '#E63027', // red
  '#2E6FB8', // blue
  '#6FBE44', // green
  '#7B4B9E', // purple
  '#F2812A', // orange
  '#2FB8AB', // teal
  '#1B3A6B', // navy
  '#F4C430', // yellow
];

export function memberColor(index: number): string {
  return MEMBER_COLOR_CYCLE[index % MEMBER_COLOR_CYCLE.length]!;
}
