import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';

export const COOKIE_NAME = 'cromos_token';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Decorator: throws 401 if no valid JWT cookie. Sets `request.user`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
}

/**
 * Decorator: requires both a valid session AND `isAdmin=true` on the user row.
 * Use as the only preHandler — it calls jwtVerify itself, so don't chain it
 * with requireAuth. Returns 403 (not 404) when not admin, since the existence
 * of /api/admin/* is not secret.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
  if (!user?.isAdmin) return reply.code(403).send({ error: 'forbidden' });
}

declare module 'fastify' {
  interface FastifyRequest {
    user: { sub: string };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
