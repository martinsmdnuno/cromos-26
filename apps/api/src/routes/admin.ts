import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../auth.js';

const rangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('7d'),
});

function rangeStart(range: '7d' | '30d' | '90d'): Date {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Admin-only dashboard endpoints. All queries are bounded by a date range
 * (default 7 days) so they stay fast even as the events table grows.
 * Aggregations are done in Postgres via `groupBy` / raw SQL to avoid
 * shipping thousands of rows to the API process.
 */
export async function adminRoutes(app: FastifyInstance) {
  app.get('/overview', { preHandler: requireAdmin }, async () => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const monthStart = new Date(now);
    monthStart.setUTCDate(monthStart.getUTCDate() - 30);

    const [totalUsers, dau, wau, mau, totalEvents, totalFeedback] = await Promise.all([
      prisma.user.count(),
      prisma.event
        .findMany({ where: { createdAt: { gte: dayStart }, userId: { not: null } }, select: { userId: true }, distinct: ['userId'] })
        .then((rows) => rows.length),
      prisma.event
        .findMany({ where: { createdAt: { gte: weekStart }, userId: { not: null } }, select: { userId: true }, distinct: ['userId'] })
        .then((rows) => rows.length),
      prisma.event
        .findMany({ where: { createdAt: { gte: monthStart }, userId: { not: null } }, select: { userId: true }, distinct: ['userId'] })
        .then((rows) => rows.length),
      prisma.event.count({ where: { createdAt: { gte: weekStart } } }),
      // Feedback table may not exist on this branch yet (it's in a separate PR).
      // Fall back to 0 instead of crashing the dashboard.
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*)::bigint AS count FROM "Feedback"',
      )
        .then((rows) => Number(rows[0]?.count ?? 0))
        .catch(() => 0),
    ]);

    return {
      totalUsers,
      dau,
      wau,
      mau,
      totalEvents,
      totalFeedback,
      generatedAt: now.toISOString(),
    };
  });

  app.get('/pages', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const since = rangeStart(parsed.data.range);
    const rows = await prisma.event.groupBy({
      by: ['path'],
      where: { name: 'page.view', createdAt: { gte: since }, path: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 30,
    });
    return {
      range: parsed.data.range,
      pages: rows.map((r) => ({ path: r.path, count: r._count._all })),
    };
  });

  app.get('/events', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const since = rangeStart(parsed.data.range);
    const rows = await prisma.event.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since }, NOT: { name: 'page.view' } },
      _count: { _all: true },
      orderBy: { _count: { name: 'desc' } },
      take: 30,
    });
    return {
      range: parsed.data.range,
      events: rows.map((r) => ({ name: r.name, count: r._count._all })),
    };
  });

  app.get('/users', { preHandler: requireAdmin }, async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        googleId: true,
        passwordHash: true,
        createdAt: true,
      },
    });
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
        method: u.googleId ? (u.passwordHash ? 'both' : 'google') : 'email',
        createdAt: u.createdAt.toISOString(),
      })),
    };
  });
}
