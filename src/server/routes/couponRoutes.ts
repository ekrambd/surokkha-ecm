import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const couponRouter = Router();

// GET all coupons
couponRouter.get('/', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'coupons' }), async (req, res) => {
  try {
    const items = await prisma.coupon.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// GET by ID
couponRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
couponRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.coupon.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
couponRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.coupon.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
couponRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
