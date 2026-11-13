import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const customerRouter = Router();

// GET all customers
customerRouter.get('/', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'customers' }), async (req, res) => {
  try {
    const items = await prisma.customer.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET by ID
customerRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST bulk import customers
customerRouter.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'customers array is required' });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const c of customers) {
      if (!c.phone && !c.name) continue;
      const phone = String(c.phone || '').trim();
      const id = c.id || phone || `cust-${Date.now()}-${Math.floor(Math.random()*1000)}`;

      const dataToSave = {
        id,
        name: String(c.name || 'Customer').trim(),
        phone: phone || 'N/A',
        email: c.email || undefined,
        address: c.address || undefined,
        district: c.district || undefined,
        totalOrders: Number(c.totalOrders) || 0,
        totalSpent: Number(c.totalSpent) || 0,
        points: Number(c.points) || 0,
        lastOrderDate: c.lastOrderDate || new Date().toISOString(),
        createdAt: c.createdAt || new Date().toISOString()
      };

      try {
        const existing = await prisma.customer.findFirst({
          where: {
            OR: [
              { id },
              ...(phone && phone !== 'N/A' ? [{ phone }] : [])
            ]
          }
        });

        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name: dataToSave.name || existing.name,
              address: dataToSave.address || existing.address,
              district: dataToSave.district || existing.district,
              email: dataToSave.email || existing.email,
              totalOrders: Math.max(existing.totalOrders || 0, dataToSave.totalOrders),
              totalSpent: Math.max(existing.totalSpent || 0, dataToSave.totalSpent),
              points: Math.max(existing.points || 0, dataToSave.points)
            }
          });
          updatedCount++;
        } else {
          await prisma.customer.create({ data: dataToSave });
          createdCount++;
        }
      } catch (singleErr) {
        console.warn('Customer bulk row import skipped:', singleErr);
      }
    }

    res.json({ success: true, createdCount, updatedCount, totalProcessed: createdCount + updatedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to bulk import customers' });
  }
});

// POST create
customerRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.customer.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
customerRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
customerRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
