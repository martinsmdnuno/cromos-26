import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './env.js';
import { COOKIE_NAME } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { googleRoutes } from './routes/google.js';
import { collectionRoutes } from './routes/collection.js';
import { groupRoutes } from './routes/groups.js';
import { tradeRoutes } from './routes/trades.js';
import { statsRoutes } from './routes/stats.js';
import { metaRoutes } from './routes/meta.js';
import { feedbackRoutes } from './routes/feedback.js';
import { packPhotoRoutes } from './routes/pack-photo.js';
import { eventRoutes } from './routes/events.js';
import { adminRoutes } from './routes/admin.js';

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

  // Anti-abuse rate limiting, keyed by client IP (trustProxy resolves the real
  // IP behind Caddy). The generous global cap stops runaway loops; the
  // expensive/abusable routes (pack/photo, feedback) tighten this per-route via
  // their own `config.rateLimit`. In-memory store is fine for the single API
  // instance this app runs.
  app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // The container healthcheck hammers /api/health; never rate-limit it.
    allowList: (req) => req.url === '/api/health',
  });

  // Don't leak internal error details (stack traces, upstream messages) to
  // clients. Log everything server-side; return a generic body for 5xx and the
  // original status for client errors (validation, 429, etc.).
  app.setErrorHandler((error: FastifyError, req, reply) => {
    req.log.error(error);
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      return reply.code(500).send({ error: 'internal_error' });
    }
    return reply.code(status).send({ error: error.code ?? 'request_error' });
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.register(metaRoutes, { prefix: '/api/meta' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(googleRoutes, { prefix: '/api/auth/google' });
  app.register(collectionRoutes, { prefix: '/api/collection' });
  app.register(groupRoutes, { prefix: '/api/groups' });
  app.register(tradeRoutes, { prefix: '/api/trades' });
  app.register(statsRoutes, { prefix: '/api/stats' });
  app.register(feedbackRoutes, { prefix: '/api/feedback' });
  app.register(packPhotoRoutes, { prefix: '/api/pack/photo' });
  app.register(eventRoutes, { prefix: '/api/events' });
  app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
