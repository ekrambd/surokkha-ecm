import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { storeModerators, saveModeratorsToDisk, storeOrders } from '../data/store';
import { ModeratorUser, StaffAttendanceRecord, StaffSalaryPayment } from '../../types';

export const moderatorRouter = Router();

// GET all staff / moderators (Requires admin or staff session)
moderatorRouter.get('/', requireAdmin, (req, res) => {
  try {
    // Return moderator list without exposing raw passwords if requested, or safe view
    const safeList = storeModerators.map(m => ({
      ...m,
      // Don't strip password completely if admin needs to edit, or return as is
      password: m.password || ''
    }));
    res.json(safeList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve moderators' });
  }
});

// GET performance statistics across date ranges
moderatorRouter.get('/stats', requireAdmin, (req, res) => {
  try {
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    
    const now = new Date();
    let startBoundary: Date = new Date();
    let endBoundary: Date = new Date();
    endBoundary.setHours(23, 59, 59, 999);

    if (range === 'today') {
      startBoundary.setHours(0, 0, 0, 0);
    } else if (range === 'last7days') {
      startBoundary.setDate(now.getDate() - 7);
      startBoundary.setHours(0, 0, 0, 0);
    } else if (range === 'thismonth') {
      startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (startDate && endDate) {
      startBoundary = new Date(startDate);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(endDate);
      endBoundary.setHours(23, 59, 59, 999);
    } else {
      // Default this month
      startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    // Filter orders within boundary
    const relevantOrders = storeOrders.filter(o => {
      const orderDate = new Date(o.createdAt || o.orderDate || Date.now());
      return orderDate >= startBoundary && orderDate <= endBoundary;
    });

    const moderatorStats = storeModerators.map(mod => {
      const acceptedOrders = relevantOrders.filter(o => 
        o.acceptedByModeratorId === mod.id || 
        (o.acceptedByModeratorName && o.acceptedByModeratorName.toLowerCase() === mod.name.toLowerCase())
      );

      const totalAccepted = acceptedOrders.length;
      const totalDelivered = acceptedOrders.filter(o => o.status === 'Delivered').length;
      const totalReturned = acceptedOrders.filter(o => o.status === 'Return').length;
      const totalSalesValue = acceptedOrders.reduce((acc, o) => {
        const val = Number(o.totalAmount ?? o.totalPrice ?? (o as any).total ?? 0);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      const commissionRate = mod.commissionPerOrder || 0;
      const earnedCommission = totalAccepted * commissionRate;

      return {
        moderatorId: mod.id,
        name: mod.name,
        phone: mod.phone,
        totalAccepted,
        totalDelivered,
        totalReturned,
        totalSalesValue,
        commissionRate,
        earnedCommission,
        baseSalary: mod.baseSalary || 0
      };
    });

    res.json({
      range: range || 'custom',
      startDate: startBoundary.toISOString(),
      endDate: endBoundary.toISOString(),
      stats: moderatorStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute performance stats' });
  }
});

// POST create staff / moderator
moderatorRouter.post('/', requireAdmin, (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const newId = data.id || `staff_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newModerator: ModeratorUser = {
      id: newId,
      name: String(data.name).trim(),
      phone: String(data.phone).trim(),
      email: data.email ? String(data.email).trim() : undefined,
      password: data.password ? String(data.password).trim() : 'staff123',
      role: data.role || 'moderator',
      permissions: Array.isArray(data.permissions) ? data.permissions : ['orders', 'pos'],
      isActive: data.isActive !== false,
      baseSalary: Number(data.baseSalary) || 0,
      commissionPerOrder: Number(data.commissionPerOrder) || 0,
      attendance: data.attendance || {},
      salaryPayments: data.salaryPayments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storeModerators.unshift(newModerator);
    saveModeratorsToDisk(storeModerators);

    res.status(201).json(newModerator);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create moderator' });
  }
});

// PUT update staff / moderator
moderatorRouter.put('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let index = storeModerators.findIndex(m => m.id === id);
    
    // If not found by id, upsert as new or match by phone
    if (index === -1) {
      if (req.body.phone) {
        index = storeModerators.findIndex(m => m.phone === req.body.phone);
      }
    }

    if (index === -1) {
      // Upsert: Create with the specified id so client never gets 404
      const created: ModeratorUser = {
        id,
        name: req.body.name || 'Staff Member',
        phone: req.body.phone || '',
        email: req.body.email,
        password: req.body.password || 'staff123',
        role: req.body.role || 'moderator',
        permissions: req.body.permissions || ['orders', 'pos'],
        isActive: req.body.isActive !== false,
        baseSalary: Number(req.body.baseSalary) || 0,
        commissionPerOrder: Number(req.body.commissionPerOrder) || 0,
        attendance: req.body.attendance || {},
        salaryPayments: req.body.salaryPayments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      storeModerators.unshift(created);
      saveModeratorsToDisk(storeModerators);
      return res.status(200).json(created);
    }

    storeModerators[index] = {
      ...storeModerators[index],
      ...req.body,
      id, // Preserve id
      updatedAt: new Date().toISOString()
    };

    saveModeratorsToDisk(storeModerators);
    res.json(storeModerators[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update moderator' });
  }
});

// POST record attendance
moderatorRouter.post('/:id/attendance', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { date, status, note } = req.body as { date: string; status: 'present' | 'absent' | 'half_day' | 'leave'; note?: string };

    if (!date || !status) {
      return res.status(400).json({ error: 'Date and status are required' });
    }

    const index = storeModerators.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    const mod = storeModerators[index];
    if (!mod.attendance) {
      mod.attendance = {};
    }

    const record: StaffAttendanceRecord = {
      date,
      status,
      note: note || '',
      markedAt: new Date().toISOString()
    };

    mod.attendance[date] = record;
    mod.updatedAt = new Date().toISOString();

    saveModeratorsToDisk(storeModerators);
    res.json({ success: true, attendance: mod.attendance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// POST record salary payment
moderatorRouter.post('/:id/salary', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body as StaffSalaryPayment;

    if (!payment.month || payment.amountPaid === undefined) {
      return res.status(400).json({ error: 'Month and amountPaid are required' });
    }

    const index = storeModerators.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    const mod = storeModerators[index];
    if (!mod.salaryPayments) {
      mod.salaryPayments = [];
    }

    const newPayment: StaffSalaryPayment = {
      id: payment.id || `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      month: payment.month,
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      baseSalary: Number(payment.baseSalary) || mod.baseSalary || 0,
      commissionEarned: Number(payment.commissionEarned) || 0,
      bonus: Number(payment.bonus) || 0,
      deduction: Number(payment.deduction) || 0,
      totalPayable: Number(payment.totalPayable) || 0,
      amountPaid: Number(payment.amountPaid) || 0,
      status: payment.status || 'paid',
      paymentMethod: payment.paymentMethod || 'Cash',
      transactionRef: payment.transactionRef || '',
      note: payment.note || '',
      createdAt: new Date().toISOString()
    };

    mod.salaryPayments.push(newPayment);
    mod.updatedAt = new Date().toISOString();

    saveModeratorsToDisk(storeModerators);
    res.json({ success: true, payment: newPayment, salaryPayments: mod.salaryPayments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record salary payment' });
  }
});

// DELETE staff / moderator
moderatorRouter.delete('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const index = storeModerators.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    storeModerators.splice(index, 1);
    saveModeratorsToDisk(storeModerators);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete moderator' });
  }
});
