import type { FastifyInstance } from 'fastify';
import oauthPlugin, {
  fastifyOauth2,
  type OAuth2Namespace,
} from '@fastify/oauth2';
import { prisma } from '../prisma.js';
import { COOKIE_NAME } from '../auth.js';
import { env } from '../env.js';

/**
 * Google OAuth flow:
 *  1. Browser hits  GET /api/auth/google/start
 *     → fastify-oauth2 redirects to Google's consent screen.
 *  2. Google redirects back to /api/auth/google/callback with a code.
 *     → we exchange code for token, fetch userinfo, find-or-create the User row,
 *       link by email if a password account already exists with the same address,
 *       set the cromos_token JWT cookie, and 302 to /collection.
 *
 * If GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET aren't set, this plugin is a no-op
 * and the routes simply don't exist (404). The frontend button still renders;
 * it'll just hit a 404 until the operator configures OAuth.
 */

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

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

/** Resolve the public URL of the API itself (same origin as the frontend behind Caddy in prod). */
function apiPublicUrl(): string {
  if (env.API_PUBLIC_URL) return env.API_PUBLIC_URL.replace(/\/$/, '');
  // Same-origin: behind Caddy /api/* proxies to the API container, so APP_URL host is correct.
  return env.APP_URL.replace(/\/$/, '');
}

export async function googleRoutes(app: FastifyInstance) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    app.log.warn('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login disabled');
    return;
  }

  const callbackUri = `${apiPublicUrl()}/api/auth/google/callback`;

  await app.register(oauthPlugin, {
    name: 'googleOAuth',
    scope: ['profile', 'email', 'openid'],
    credentials: {
      client: {
        id: env.GOOGLE_CLIENT_ID,
        secret: env.GOOGLE_CLIENT_SECRET,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/start',
    callbackUri,
    callbackUriParams: {
      // Force the account chooser even if the user is already signed into a Google account
      // — friendlier when multiple personal/work Google accounts are in play.
      prompt: 'select_account',
    },
  });

  app.get('/callback', async (req, reply) => {
    const oauth = (app as unknown as { googleOAuth: OAuth2Namespace }).googleOAuth;
    const tokenResponse = await oauth.getAccessTokenFromAuthorizationCodeFlow(req as never);
    const accessToken = tokenResponse.token.access_token;

    // Fetch userinfo. Could also decode the id_token, but userinfo is simpler.
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      req.log.error({ status: res.status }, 'failed to fetch Google userinfo');
      return reply.code(502).send({ error: 'google_userinfo_failed' });
    }
    const profile = (await res.json()) as GoogleProfile;
    if (!profile.email || !profile.email_verified) {
      return reply.code(400).send({ error: 'email_not_verified' });
    }

    const email = profile.email.toLowerCase();
    const name = profile.name || profile.given_name || email.split('@')[0]!;

    // Find by googleId first (fast path). Otherwise find by email and link.
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Link the Google account to the existing user.
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: profile.sub,
            avatarUrl: profile.picture ?? existing.avatarUrl,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId: profile.sub,
            avatarUrl: profile.picture,
          },
        });
      }
    }

    const token = app.jwt.sign({ sub: user.id });
    reply.setCookie(COOKIE_NAME, token, cookieOptions());
    // Redirect back to the SPA. In dev, APP_URL is :5173. In prod, it's the public domain.
    return reply.redirect(`${env.APP_URL}/collection`);
  });
}
