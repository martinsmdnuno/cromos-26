import type { FastifyInstance } from 'fastify';
import { CATEGORIES, PALETTE, TOTAL_STICKERS } from '@cromos/shared';

/** Static data the frontend needs but doesn't want to bundle separately. */
export async function metaRoutes(app: FastifyInstance) {
  app.get('/categories', async () => ({
    total: TOTAL_STICKERS,
    palette: PALETTE,
    categories: CATEGORIES,
  }));
}
