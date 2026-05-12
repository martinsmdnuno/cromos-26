import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { env } from '../env.js';

const feedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  page: z.string().max(500).optional(),
  contactOk: z.boolean().optional(),
});

/**
 * Forward feedback through Resend if configured. Fire-and-forget — failure
 * never bubbles up to the caller because the message is already persisted.
 *
 * Returns true on a 2xx response from Resend, false otherwise. The caller
 * uses the return value only to flip the `emailed` flag on the row.
 */
async function tryForwardEmail(opts: {
  message: string;
  page?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  contactOk: boolean;
}): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.FEEDBACK_NOTIFY_EMAIL) return false;
  const subject = `[Cromos 26] Feedback${opts.contactOk ? ' (contact OK)' : ''}`;
  const fromLine = opts.userName
    ? `${opts.userName}${opts.userEmail ? ` <${opts.userEmail}>` : ''}`
    : opts.userEmail ?? 'unknown user';
  const pageLine = opts.page ?? '(not provided)';
  const text = [
    `From: ${fromLine}`,
    `Page:  ${pageLine}`,
    `Contact OK: ${opts.contactOk ? 'yes' : 'no'}`,
    '',
    opts.message,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FEEDBACK_FROM_EMAIL,
        to: env.FEEDBACK_NOTIFY_EMAIL,
        reply_to: opts.contactOk && opts.userEmail ? opts.userEmail : undefined,
        subject,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { message, page, contactOk = false } = parsed.data;
    const userAgent = req.headers['user-agent'] ?? null;

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    const emailed = await tryForwardEmail({
      message,
      page,
      userEmail: user?.email ?? null,
      userName: user?.name ?? null,
      contactOk,
    });

    await prisma.feedback.create({
      data: {
        userId: req.user.sub,
        message,
        page: page ?? null,
        userAgent,
        contactOk,
        emailed,
      },
    });

    return { ok: true };
  });
}
