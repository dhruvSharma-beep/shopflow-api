import express, { Request, Response } from 'express';
import { prisma } from '../lib/db';

const router = express.Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const mem  = process.memoryUsage();
  res.json({
    status:    dbOk ? 'ok' : 'degraded',
    version:   process.env.npm_package_version ?? '1.0.0',
    uptime:    Math.floor(process.uptime()),
    memory:    { used: Math.round(mem.heapUsed / 1024 / 1024) + 'MB', total: Math.round(mem.heapTotal / 1024 / 1024) + 'MB' },
    db:        dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  });
});

export default router;