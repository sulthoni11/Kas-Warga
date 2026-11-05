import { Router } from 'express';
import { ping } from '../db.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'scff-api',
    version: '0.2.0',
    uptime: Math.round(process.uptime()),
    providers: {
      payment: config.PAYMENT_PROVIDER,
      whatsapp: config.WA_PROVIDER,
    },
  });
});

healthRouter.get('/db', async (_req, res) => {
  try {
    await ping();
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'degraded', error: error.code ?? 'DB_UNAVAILABLE' });
  }
});
