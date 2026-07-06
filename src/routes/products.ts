import express, { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { z } from 'zod';

const router = express.Router();

const Query = z.object({
  q:        z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page:     z.coerce.number().min(1).default(1),
  limit:    z.coerce.number().min(1).max(100).default(24),
  sortBy:   z.enum(['price_asc','price_desc','newest','rating']).default('newest'),
});

router.get('/', async (req: Request, res: Response) => {
  const q = Query.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const { q: search, category, minPrice, maxPrice, page, limit, sortBy } = q.data;
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };
  if (search)   where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
  if (category) where.categoryId = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };
  }

  const orderBy: any = { newest: { createdAt: 'desc' }, price_asc: { price: 'asc' }, price_desc: { price: 'desc' }, rating: { avgRating: 'desc' } }[sortBy];
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  res.json({ products, total, page, totalPages: Math.ceil(total / limit) });
});

export default router;