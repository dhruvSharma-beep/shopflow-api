import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';

interface Payload { sub: string; email: string; role: string; iat: number; exp: number; }
declare global { namespace Express { interface Request { user?: Payload; } } }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token ?? req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as Payload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isActive: true } });
    if (!user?.isActive) return res.status(401).json({ error: 'Account suspended' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: `Role ${req.user.role} not authorized` });
    next();
  };
}