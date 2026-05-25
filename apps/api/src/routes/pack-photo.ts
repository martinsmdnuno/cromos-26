import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { extractStickerCodesFromOcr } from '@cromos/shared';
import { requireAuth } from '../auth.js';
import { env } from '../env.js';

/**
 * POST /api/pack/photo
 *
 * Accepts a base64-encoded photo of Panini WC 2026 sticker backs, asks
 * Claude (vision) to read the codes printed in each sticker's top-right
 * badge, and returns them as a space-joined string the pack modal can
 * drop straight into its textarea.
 *
 * Why a server endpoint and not a direct browser-to-Anthropic call:
 *   - the API key MUST stay on the server (never ship in the bundle)
 *   - we get a single gate to log usage, enforce auth, and resize/sanitise
 *
 * Image budget: client resizes to ~1568px max edge at JPEG q=0.85 before
 * base64-encoding. A typical photo lands at ~300-500 KB → ~400-700 KB
 * base64. Per-route bodyLimit is bumped to 6 MB to leave headroom for
 * larger inputs without lifting the global 1 MB default.
 *
 * Output: a space-separated string of canonical tokens (`POR3 FWC14 ...`)
 * already filtered through `extractStickerCodesFromOcr`, so any model
 * hallucinations that aren't in the 49-prefix whitelist get dropped
 * before we trust them.
 */

const requestSchema = z.object({
  /** base64 (or data URL) of the JPEG/PNG/WebP photo. Limit ~6 MB raw bytes. */
  image: z
    .string()
    .min(64, 'image too small')
    .max(8_000_000, 'image too large (>~6 MB base64)'),
  mediaType: z
    .enum(['image/jpeg', 'image/png', 'image/webp'])
    .default('image/jpeg'),
});

const PROMPT = [
  'You are looking at a photo of Panini FIFA World Cup 2026 sticker backs.',
  '',
  'Each sticker has a code printed in a dark rounded badge in the top-right',
  'corner of the back. The format is exactly:',
  '  - 3 uppercase letters + (optional space) + a 1- or 2-digit number',
  '  - the 3-letter prefix is either a country code (POR, BRA, ARG, MEX, USA,',
  '    CAN, JOR, TUR, AUT, PAN, NED, JPN, TUN, etc.) or "FWC" for World Cup',
  '    theme stickers.',
  '  - number range: 1-20 for country codes, 1-19 for FWC.',
  '',
  'Extract every code visible in the photo. Return ONLY the codes joined by',
  'spaces in the order they appear (top-left → bottom-right). No commentary,',
  'no JSON, no markdown — just the codes.',
  '',
  'Example correct output:',
  '  JOR7 TUR12 AUT4 PAN4 NED7 JPN19 TUN9',
  '',
  'If you cannot see any sticker codes, respond with exactly: NONE',
].join('\n');

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
}

export async function packPhotoRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: requireAuth,
      bodyLimit: 6 * 1024 * 1024,
      // Each call spends real money on the Anthropic API with our key — cap it
      // hard per client so one account can't run up unbounded LLM cost.
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      if (!env.ANTHROPIC_API_KEY) {
        return reply.code(503).send({ error: 'photo_scan_not_configured' });
      }

      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_request',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      // Tolerate both raw base64 and data URLs (`data:image/jpeg;base64,...`).
      const base64 = parsed.data.image.replace(/^data:image\/[a-z]+;base64,/, '');

      let apiRes: Response;
      try {
        apiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: env.ANTHROPIC_MODEL,
            max_tokens: 256,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: parsed.data.mediaType,
                      data: base64,
                    },
                  },
                  { type: 'text', text: PROMPT },
                ],
              },
            ],
          }),
        });
      } catch (err) {
        req.log.error({ err }, 'anthropic fetch failed');
        return reply.code(502).send({ error: 'upstream_unreachable' });
      }

      if (!apiRes.ok) {
        const errText = await apiRes.text().catch(() => '');
        req.log.error({ status: apiRes.status, errText }, 'anthropic api error');
        return reply.code(502).send({
          error: 'photo_scan_failed',
          upstream: apiRes.status,
        });
      }

      const result = (await apiRes.json()) as AnthropicMessageResponse;
      const rawText =
        result.content
          ?.filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('\n') ?? '';

      if (rawText.trim().toUpperCase() === 'NONE') {
        return { codes: '', raw: rawText };
      }

      // Defence in depth: even if the model goes off-script, this drops any
      // token whose 3-letter prefix isn't a real team code or "FWC".
      const codes = extractStickerCodesFromOcr(rawText);
      return { codes, raw: rawText };
    },
  );
}
