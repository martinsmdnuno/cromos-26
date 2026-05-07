import type { CollectionMap, MemberCollection, TradeSuggestion } from './types.js';

/**
 * Compute the set of stickers user A could give to user B:
 *  A's duplicates (count > 1) that B is missing (count = 0).
 */
export function giveable(from: CollectionMap, to: CollectionMap): number[] {
  const out: number[] = [];
  for (const [numStr, count] of Object.entries(from)) {
    if (count > 1) {
      const num = Number(numStr);
      const theirCount = to[num] ?? 0;
      if (theirCount === 0) out.push(num);
    }
  }
  out.sort((x, y) => x - y);
  return out;
}

/**
 * Direct 1-to-1 trade between two members of a group.
 * Returns the full lists from each side's perspective; the caller picks how many to actually trade.
 */
export function directTrade(
  meId: string,
  otherId: string,
  collections: MemberCollection[],
): { iCanGive: number[]; theyCanGive: number[] } {
  const me = collections.find((c) => c.userId === meId);
  const other = collections.find((c) => c.userId === otherId);
  if (!me || !other) return { iCanGive: [], theyCanGive: [] };
  return {
    iCanGive: giveable(me.collection, other.collection),
    theyCanGive: giveable(other.collection, me.collection),
  };
}

/**
 * Multi-trade optimizer.
 *
 * For every unordered pair (A, B) in the group, compute:
 *   giveable(A→B), giveable(B→A)
 * Take the balanced count = min(|A→B|, |B→A|) — each trade must be even.
 * Pick the first `balanced` items (sorted ascending) from each side as the actual trade.
 *
 * Pairs with balanced count == 0 are dropped. Result is sorted by `count` desc so the
 * best trades surface first.
 *
 * Note: this is intentionally an independent-pair optimizer (each pair stands alone). Stickers
 * given in one pair are still "duplicates" you could in principle give to a different pair —
 * we don't try to globally schedule who-gives-what, because:
 *   1. Real trades happen one pair at a time, not as a coordinated multi-party event.
 *   2. Independent pairs make the suggestion list intuitive: "you and Maria can swap 12 each".
 *   3. Global ILP is overkill for typical group sizes (3–8 members).
 */
export function optimizeTrades(
  collections: MemberCollection[],
  currentUserId: string | null,
): TradeSuggestion[] {
  const out: TradeSuggestion[] = [];

  for (let i = 0; i < collections.length; i++) {
    for (let j = i + 1; j < collections.length; j++) {
      const a = collections[i]!;
      const b = collections[j]!;
      const aToB = giveable(a.collection, b.collection);
      const bToA = giveable(b.collection, a.collection);
      const balanced = Math.min(aToB.length, bToA.length);
      if (balanced === 0) continue;

      out.push({
        aId: a.userId,
        aName: a.name,
        bId: b.userId,
        bName: b.name,
        count: balanced,
        aGives: aToB.slice(0, balanced),
        bGives: bToA.slice(0, balanced),
        involvesMe:
          currentUserId !== null && (a.userId === currentUserId || b.userId === currentUserId),
      });
    }
  }

  // Sort: trades involving the current user first (within same score), then by score desc, then alphabetical.
  out.sort((x, y) => {
    if (x.involvesMe !== y.involvesMe) return x.involvesMe ? -1 : 1;
    if (x.count !== y.count) return y.count - x.count;
    return (x.aName + x.bName).localeCompare(y.aName + y.bName);
  });

  return out;
}
