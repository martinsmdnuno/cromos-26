import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { CATEGORIES, TOTAL_STICKERS, categorySize } from '@cromos/shared';

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (req) => {
    const rows = await prisma.userSticker.findMany({
      where: { userId: req.user.sub, count: { gt: 0 } },
    });

    let owned = 0;
    let duplicates = 0;
    let total = 0;
    const ownedByCategory: Record<string, number> = {};
    const ownedSet = new Set<number>();

    for (const r of rows) {
      ownedSet.add(r.stickerNumber);
      owned++;
      total += r.count;
      if (r.count > 1) duplicates += r.count - 1;
    }

    for (const c of CATEGORIES) {
      let n = 0;
      for (let s = c.range[0]; s <= c.range[1]; s++) if (ownedSet.has(s)) n++;
      ownedByCategory[c.id] = n;
    }

    const missing: number[] = [];
    for (let s = 1; s <= TOTAL_STICKERS; s++) if (!ownedSet.has(s)) missing.push(s);

    return {
      total: TOTAL_STICKERS,
      owned,
      missing: TOTAL_STICKERS - owned,
      duplicates,
      heldTotal: total,
      completionPct: Math.round((owned / TOTAL_STICKERS) * 1000) / 10,
      categories: CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name,
        colorKey: c.colorKey,
        size: categorySize(c),
        owned: ownedByCategory[c.id] ?? 0,
      })),
      missingNumbers: missing,
    };
  });
}
