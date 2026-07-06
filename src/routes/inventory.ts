import express, { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

const AdjustSchema = z.object({
  productId: z.string().cuid(),
  quantity:  z.number().int(),
  reason:    z.enum(['sale','restock','adjustment','damaged','returned']),
  note:      z.string().max(500).optional(),
});

router.get('/:productId', requireAuth, async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where:  { id: req.params.productId },
    select: { id: true, name: true, stock: true, reservedStock: true, sku: true, lowStockThreshold: true },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product, available: product.stock - (product.reservedStock ?? 0) });
});

router.post('/adjust', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  const body = AdjustSchema.safeParse(req.body);
  if (!body.success) return res.status(422).json({ error: body.error.flatten() });

  const { productId, quantity, reason, note } = body.data;

  const [product] = await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } }),
    prisma.inventoryLog.create({ data: { productId, quantity, reason, note: note ?? '', userId: req.user!.sub, balanceAfter: 0 } }),
  ]);

  res.json({ success: true, newStock: product.stock });
});

export default router;