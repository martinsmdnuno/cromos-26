import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';

const eventSchema = z.object({
  name: z.string().trim().min(1).max(64),
  path: z.string().max(200).optional(),
  props: z.record(z.unknown()).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

/**
 * In-house analytics ingest. Batched (max 50 events per request) so route
 * changes + a few side-effects can ship together via `navigator.sendBeacon`
 * or a plain fetch. Authenticated — anon ingest isn't needed yet.
 *
 * Best-effort: validation failures return 400, but any DB error is swallowed
 * so a misbehaving analytics path can never break the user's session.
 */
export async function eventRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

    try {
      await prisma.event.createMany({
        data: parsed.data.events.map((e) => ({
          userId: req.user.sub,
          name: e.name,
          path: e.path ?? null,
          props: (e.props ?? null) as never,
        })),
      });
    } catch (err) {
      req.log.warn({ err }, 'event ingest failed');
    }
    return reply.code(204).send();
  });
}
