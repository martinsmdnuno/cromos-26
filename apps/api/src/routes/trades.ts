import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import {
  directTrade,
  memberColor,
  optimizeTrades,
  type CollectionMap,
  type MemberCollection,
} from '@cromos/shared';

async function loadGroupCollections(groupId: string, requesterId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  if (!memberships.find((m) => m.userId === requesterId)) return null;

  const memberIds = memberships.map((m) => m.userId);
  const rows = await prisma.userSticker.findMany({
    where: { userId: { in: memberIds }, count: { gt: 0 } },
  });
  const byMember = new Map<string, CollectionMap>();
  for (const r of rows) {
    let m = byMember.get(r.userId);
    if (!m) {
      m = {};
      byMember.set(r.userId, m);
    }
    m[r.stickerNumber] = r.count;
  }

  const collections: MemberCollection[] = memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    collection: byMember.get(m.userId) ?? {},
  }));
  const colorByUser = new Map(memberships.map((m) => [m.userId, memberColor(m.colorIdx)]));
  return { collections, colorByUser };
}

export async function tradeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Direct 1-to-1 trade view: what I can give them, what they can give me.
  app.get('/direct', async (req, reply) => {
    const q = z
      .object({ groupId: z.string(), otherId: z.string() })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid_input' });
    const data = await loadGroupCollections(q.data.groupId, req.user.sub);
    if (!data) return reply.code(403).send({ error: 'not_a_member' });
    const r = directTrade(req.user.sub, q.data.otherId, data.collections);
    return r;
  });

  // Multi-trade optimizer for an entire group.
  app.get('/optimize', async (req, reply) => {
    const q = z.object({ groupId: z.string() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid_input' });
    const data = await loadGroupCollections(q.data.groupId, req.user.sub);
    if (!data) return reply.code(403).send({ error: 'not_a_member' });
    const suggestions = optimizeTrades(data.collections, req.user.sub);
    return { suggestions };
  });
}
