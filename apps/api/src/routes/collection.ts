import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { TOTAL_STICKERS } from '@cromos/shared';

const stickerNumberSchema = z.coerce.number().int().min(1).max(TOTAL_STICKERS);

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
  });
  app.put('/sticker', async (req, reply) => {
    const parsed = setSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { number, count } = parsed.data;
    if (count === 0) {
      await prisma.userSticker.deleteMany({
        where: { userId: req.user.sub, stickerNumber: number },
      });
    } else {
      await prisma.userSticker.upsert({
        where: { userId_stickerNumber: { userId: req.user.sub, stickerNumber: number } },
        create: { userId: req.user.sub, stickerNumber: number, count },
        update: { count },
      });
    }
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
  });
  app.post('/bulk', async (req, reply) => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const userId = req.user.sub;
    const { items } = parsed.data;

    // Group: deletes (count=0) and upserts (count>0).
    const toDelete = items.filter((i) => i.count === 0).map((i) => i.number);
    const toUpsert = items.filter((i) => i.count > 0);

    await prisma.$transaction([
      ...(toDelete.length
        ? [
            prisma.userSticker.deleteMany({
              where: { userId, stickerNumber: { in: toDelete } },
            }),
          ]
        : []),
      ...toUpsert.map((i) =>
        prisma.userSticker.upsert({
          where: { userId_stickerNumber: { userId, stickerNumber: i.number } },
          create: { userId, stickerNumber: i.number, count: i.count },
          update: { count: i.count },
        }),
      ),
    ]);

    return { updated: items.length };
  });

  // Increment / decrement helper — handy for "got another duplicate" tap.
  const deltaSchema = z.object({
    number: stickerNumberSchema,
    delta: z.number().int().min(-99).max(99),
  });
  app.post('/sticker/delta', async (req, reply) => {
    const parsed = deltaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { number, delta } = parsed.data;
    const userId = req.user.sub;

    const existing = await prisma.userSticker.findUnique({
      where: { userId_stickerNumber: { userId, stickerNumber: number } },
    });
    const current = existing?.count ?? 0;
    const next = Math.max(0, current + delta);

    if (next === 0) {
      await prisma.userSticker.deleteMany({ where: { userId, stickerNumber: number } });
    } else if (existing) {
      await prisma.userSticker.update({
        where: { userId_stickerNumber: { userId, stickerNumber: number } },
        data: { count: next },
      });
    } else {
      await prisma.userSticker.create({
        data: { userId, stickerNumber: number, count: next },
      });
    }
    return { number, count: next };
  });
}
