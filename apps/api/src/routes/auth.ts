import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { COOKIE_NAME, hashPassword, requireAuth, verifyPassword } from '../auth.js';
import { env } from '../env.js';

const credentialsSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(200),
});

const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(60),
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 30, // 30d
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { email, password, name } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return reply.code(409).send({ error: 'email_taken' });
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: await hashPassword(password),
      },
    });
    const token = app.jwt.sign({ sub: user.id });
    reply.setCookie(COOKIE_NAME, token, cookieOptions());
    return { user: { id: user.id, email: user.email, name: user.name } };
  });

  app.post('/login', async (req, reply) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
    // Google-only users have no password hash — they have to sign in via OAuth.
    if (!user.passwordHash) return reply.code(401).send({ error: 'use_google_signin' });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });
    const token = app.jwt.sign({ sub: user.id });
    reply.setCookie(COOKIE_NAME, token, cookieOptions());
    return { user: { id: user.id, email: user.email, name: user.name } };
  });

  app.post('/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    return { user: { id: user.id, email: user.email, name: user.name } };
  });
}
