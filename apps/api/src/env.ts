import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  // Google OAuth — optional. If unset, the /api/auth/google/* routes are NOT registered
  // and the "Continue with Google" button on the frontend will 404. See README.md for
  // how to obtain these from Google Cloud Console.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Where the API itself lives — used to build the OAuth callback URL. Defaults to APP_URL when same-origin. */
  API_PUBLIC_URL: z.string().url().optional(),
  // Resend email forwarding for /api/feedback. Both optional — if either is
  // missing, feedback is still stored in the DB and the endpoint succeeds, we
  // just don't ping anyone.
  RESEND_API_KEY: z.string().optional(),
  FEEDBACK_NOTIFY_EMAIL: z.string().email().optional(),
  /** From-address for the feedback email. Defaults to Resend's onboarding sender,
   *  which only allows sending to the email the Resend account was created with —
   *  perfectly fine for this use case. Override to use a verified domain. */
  FEEDBACK_FROM_EMAIL: z.string().default('Cromos 26 <onboarding@resend.dev>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
