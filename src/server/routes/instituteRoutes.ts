import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { cacheResponse } from '../middleware/cacheMiddleware';

export const instituteRouter = Router();

instituteRouter.get('/', cacheResponse({ ttlSeconds: 300, staleWhileRevalidateSeconds: 600, tag: 'institute' }), async (req, res) => {
  const item = await prisma.instituteInfo.findUnique({ where: { id: 'global' } });
  res.json(item || {});
});

instituteRouter.post('/', requireAdmin, async (req, res) => {
  const item = await prisma.instituteInfo.upsert({
    where: { id: 'global' },
    update: req.body,
    create: { id: 'global', ...req.body }
  });
  res.json(item);
});
