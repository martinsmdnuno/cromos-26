import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { TOTAL_STICKERS } from '@cromos/shared';

const stickerNumberSchema = z.coerce.number().int().min(1).max(TOTAL_STICKERS);

/**
 * Where did this mutation come from? Used by the /history page to show
 * users an icon next to each change. New sources can be added without a
 * migration — the column is just `text` and the UI falls back to a
 * generic icon for unknown values.
 */
const sourceSchema = z
  .enum(['tap', 'long_press', 'pack', 'photo', 'trade', 'unknown'])
  .optional()
  .default('unknown');

export async function collectionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Returns the user's full collection as a sparse map { stickerNumber: count }.
  app.get('/', async (req) => {
    const rows = await prisma.userSticker.findMany({
      where: { userId: req.user.sub, count: { gt: 0 } },
    });
    const map: Record<number, number> = {};
    for (const r of rows) map[r.stickerNumber] = r.count;
    return { collection: map };
  });

  // Set the count for a single sticker. count=0 removes it.
  const setSchema = z.object({
    number: stickerNumberSchema,
    count: z.number().int().min(0).max(99),
    source: sourceSchema,
  });
  app.put('/sticker', async (req, reply) => {
    const parsed = setSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { number, count, source } = parsed.data;
    const userId = req.user.sub;

    // Wrap read-before + mutation + history-insert in a single transaction so
    // /history can never disagree with the actual UserSticker row.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userSticker.findUnique({
        where: { userId_stickerNumber: { userId, stickerNumber: number } },
      });
      const before = existing?.count ?? 0;
      if (count === 0) {
        if (existing) {
          await tx.userSticker.delete({
            where: { userId_stickerNumber: { userId, stickerNumber: number } },
          });
        }
      } else {
        await tx.userSticker.upsert({
          where: { userId_stickerNumber: { userId, stickerNumber: number } },
          create: { userId, stickerNumber: number, count },
          update: { count },
        });
      }
      if (before !== count) {
        await tx.stickerHistory.create({
          data: {
            userId,
            stickerNumber: number,
            countBefore: before,
            countAfter: count,
            source,
          },
        });
      }
    });

    return { number, count };
  });

  // Bulk set: efficient for "I just opened a packet, here are 5 numbers" or initial import.
  // Each entry replaces the existing count.
  const bulkSchema = z.object({
    items: z
      .array(
        z.object({
          number: stickerNumberSchema,
          count: z.number().int().min(0).max(99),
        }),
      )
      .min(1)
      .max(1000),
    source: sourceSchema,
  });
  app.post('/bulk', async (req, reply) => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const userId = req.user.sub;
    const { items, source } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // Read all the touched stickers' current counts up-front so the history
      // entries can record correct `countBefore` values.
      const existingRows = await tx.userSticker.findMany({
        where: { userId, stickerNumber: { in: items.map((i) => i.number) } },
      });
      const beforeMap = new Map<number, number>(
        existingRows.map((r) => [r.stickerNumber, r.count]),
      );

      // Apply: deletes + upserts.
      const toDelete = items.filter((i) => i.count === 0).map((i) => i.number);
      const toUpsert = items.filter((i) => i.count > 0);
      if (toDelete.length) {
        await tx.userSticker.deleteMany({
          where: { userId, stickerNumber: { in: toDelete } },
        });
      }
      for (const i of toUpsert) {
        await tx.userSticker.upsert({
          where: { userId_stickerNumber: { userId, stickerNumber: i.number } },
          create: { userId, stickerNumber: i.number, count: i.count },
          update: { count: i.count },
        });
      }

      // One history row per item whose count actually changed.
      const historyRows = items.flatMap((i) => {
        const before = beforeMap.get(i.number) ?? 0;
        if (before === i.count) return [];
        return [
          {
            userId,
            stickerNumber: i.number,
            countBefore: before,
            countAfter: i.count,
            source,
          },
        ];
      });
      if (historyRows.length) {
        await tx.stickerHistory.createMany({ data: historyRows });
      }
    });

    return { updated: items.length };
  });

  // Increment / decrement helper — handy for "got another duplicate" tap.
  const deltaSchema = z.object({
    number: stickerNumberSchema,
    delta: z.number().int().min(-99).max(99),
    source: sourceSchema,
  });
  app.post('/sticker/delta', async (req, reply) => {
    const parsed = deltaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { number, delta, source } = parsed.data;
    const userId = req.user.sub;

    const next = await prisma.$transaction(async (tx) => {
      const existing = await tx.userSticker.findUnique({
        where: { userId_stickerNumber: { userId, stickerNumber: number } },
      });
      const current = existing?.count ?? 0;
      const next = Math.max(0, current + delta);

      if (next === 0) {
        if (existing) {
          await tx.userSticker.delete({
            where: { userId_stickerNumber: { userId, stickerNumber: number } },
          });
        }
      } else if (existing) {
        await tx.userSticker.update({
          where: { userId_stickerNumber: { userId, stickerNumber: number } },
          data: { count: next },
        });
      } else {
        await tx.userSticker.create({
          data: { userId, stickerNumber: number, count: next },
        });
      }
      if (current !== next) {
        await tx.stickerHistory.create({
          data: {
            userId,
            stickerNumber: number,
            countBefore: current,
            countAfter: next,
            source,
          },
        });
      }
      return next;
    });

    return { number, count: next };
  });

  // List the user's history, newest first, with cursor pagination. Each row
  // is small (~100 bytes) so even users with thousands of mutations stay
  // cheap to query thanks to the [userId, createdAt] index.
  const historySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    /// Opaque cursor: the createdAt of the last row from the previous page,
    /// as an ISO string. The next page starts strictly before this timestamp.
    cursor: z.string().datetime().optional(),
  });
  app.get('/history', async (req, reply) => {
    const parsed = historySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { limit, cursor } = parsed.data;
    const userId = req.user.sub;

    const rows = await prisma.stickerHistory.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // peek one past the page to know if there's more
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
    return {
      entries: page.map((r) => ({
        id: r.id,
        stickerNumber: r.stickerNumber,
        countBefore: r.countBefore,
        countAfter: r.countAfter,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
    };
  });
}
