import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const brandRouter = Router();

// GET all
brandRouter.get('/', cacheResponse({ ttlSeconds: 120, staleWhileRevalidateSeconds: 300, tag: 'brands' }), async (req, res) => {
  try {
    const items = await prisma.brand.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// GET by ID
brandRouter.get('/:id', cacheResponse({ ttlSeconds: 120, staleWhileRevalidateSeconds: 300, tag: 'brands' }), async (req, res) => {
  try {
    const item = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
brandRouter.post('/', async (req, res) => {
  try {
    const item = await prisma.brand.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
brandRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.brand.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
brandRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.brand.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
