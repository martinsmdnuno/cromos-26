import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
