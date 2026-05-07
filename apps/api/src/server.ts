import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { env } from './env.js';
import { COOKIE_NAME } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { googleRoutes } from './routes/google.js';
import { collectionRoutes } from './routes/collection.js';
import { groupRoutes } from './routes/groups.js';
import { tradeRoutes } from './routes/trades.js';
import { statsRoutes } from './routes/stats.js';
import { metaRoutes } from './routes/meta.js';

export function buildServer() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: true,
  });

  app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.APP_URL : true,
    credentials: true,
  });

  app.register(cookie);

  app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: COOKIE_NAME, signed: false },
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.register(metaRoutes, { prefix: '/api/meta' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(googleRoutes, { prefix: '/api/auth/google' });
  app.register(collectionRoutes, { prefix: '/api/collection' });
  app.register(groupRoutes, { prefix: '/api/groups' });
  app.register(tradeRoutes, { prefix: '/api/trades' });
  app.register(statsRoutes, { prefix: '/api/stats' });

  return app;
}
