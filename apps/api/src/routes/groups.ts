import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import {
  generateInviteCode,
  memberColor,
  TOTAL_STICKERS,
  type CollectionMap,
} from '@cromos/shared';

async function ensureMember(groupId: string, userId: string): Promise<boolean> {
  const m = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!m;
}

function statsForCollection(collection: CollectionMap) {
  let owned = 0;
  let duplicates = 0;
  let total = 0;
  for (const count of Object.values(collection)) {
    if (count > 0) {
      owned++;
      total += count;
      if (count > 1) duplicates += count - 1;
    }
  }
  return {
    owned,
    duplicates,
    total,
    completionPct: Math.round((owned / TOTAL_STICKERS) * 1000) / 10,
  };
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const c = generateInviteCode();
    const exists = await prisma.group.findUnique({ where: { code: c } });
    if (!exists) return c;
  }
  throw new Error('Could not generate unique invite code');
}

export async function groupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // List groups the current user belongs to (with member counts and rough completion).
  app.get('/', async (req) => {
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: req.user.sub },
      include: {
        group: {
          include: {
            memberships: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      groups: memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        code: m.group.code,
        memberCount: m.group.memberships.length,
        createdById: m.group.createdById,
        createdAt: m.group.createdAt.toISOString(),
        myColor: memberColor(m.colorIdx),
      })),
    };
  });

  // Create group.
  const createSchema = z.object({ name: z.string().trim().min(1).max(60) });
  app.post('/', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const code = await uniqueCode();
    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        code,
        createdById: req.user.sub,
        memberships: {
          create: { userId: req.user.sub, colorIdx: 0 },
        },
      },
    });
    return { group: { id: group.id, name: group.name, code: group.code } };
  });

  // Join via 6-char code.
  const joinSchema = z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6}$/),
  });
  app.post('/join', async (req, reply) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_code' });
    const group = await prisma.group.findUnique({
      where: { code: parsed.data.code },
      include: { memberships: true },
    });
    if (!group) return reply.code(404).send({ error: 'group_not_found' });
    const already = group.memberships.find((m) => m.userId === req.user.sub);
    if (already) return { group: { id: group.id, name: group.name, code: group.code } };

    const used = new Set(group.memberships.map((m) => m.colorIdx));
    let colorIdx = 0;
    while (used.has(colorIdx) && colorIdx < 8) colorIdx++;

    await prisma.groupMembership.create({
      data: { groupId: group.id, userId: req.user.sub, colorIdx },
    });
    return { group: { id: group.id, name: group.name, code: group.code } };
  });

  // Group detail: members + each member's collection (so the frontend can compute trades).
  app.get('/:id', async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    const { id } = params.data;
    if (!(await ensureMember(id, req.user.sub))) return reply.code(403).send({ error: 'not_a_member' });

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!group) return reply.code(404).send({ error: 'not_found' });

    // Pull every member's collection in one query.
    const memberIds = group.memberships.map((m) => m.userId);
    const stickerRows = await prisma.userSticker.findMany({
      where: { userId: { in: memberIds }, count: { gt: 0 } },
    });
    const byMember = new Map<string, CollectionMap>();
    for (const r of stickerRows) {
      let m = byMember.get(r.userId);
      if (!m) {
        m = {};
        byMember.set(r.userId, m);
      }
      m[r.stickerNumber] = r.count;
    }

    const members = group.memberships.map((m) => {
      const collection = byMember.get(m.userId) ?? {};
      const s = statsForCollection(collection);
      return {
        userId: m.user.id,
        name: m.user.name,
        color: memberColor(m.colorIdx),
        joinedAt: m.joinedAt.toISOString(),
        collection,
        ...s,
      };
    });

    return {
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        createdById: group.createdById,
        createdAt: group.createdAt.toISOString(),
      },
      members,
    };
  });

  // Rename group (creator only).
  const renameSchema = z.object({ name: z.string().trim().min(1).max(60) });
  app.put('/:id', async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const group = await prisma.group.findUnique({ where: { id: params.data.id } });
    if (!group) return reply.code(404).send({ error: 'not_found' });
    if (group.createdById !== req.user.sub) return reply.code(403).send({ error: 'not_creator' });
    await prisma.group.update({ where: { id: group.id }, data: { name: parsed.data.name } });
    return { ok: true };
  });

  // Delete group (creator only).
  app.delete('/:id', async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    const group = await prisma.group.findUnique({ where: { id: params.data.id } });
    if (!group) return reply.code(404).send({ error: 'not_found' });
    if (group.createdById !== req.user.sub) return reply.code(403).send({ error: 'not_creator' });
    await prisma.group.delete({ where: { id: group.id } });
    return { ok: true };
  });

  // Leave group.
  app.post('/:id/leave', async (req, reply) => {
    const params = z.object({ id: z.string() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    await prisma.groupMembership.deleteMany({
      where: { groupId: params.data.id, userId: req.user.sub },
    });
    return { ok: true };
  });
}
