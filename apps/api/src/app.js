import express from 'express';
import cors from 'cors';
import { config, isProduction } from './config.js';
import { healthRouter } from './routes/health.js';
import { webhooksRouter } from './routes/webhooks.js';
import { devRouter } from './routes/dev.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({ origin: config.APP_BASE_URL, credentials: true }));

  // rawBody disimpan untuk verifikasi signature webhook (HMAC atas body mentah).
  app.use(
    express.json({
      limit: '100kb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/webhooks', webhooksRouter);
  if (!isProduction) app.use('/api/dev', devRouter);

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    // Body JSON rusak: jangan sampai tampil sebagai INTERNAL_ERROR.
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'INVALID_JSON' });
    }
    // ZodError yang lolos dari route (mis. parameter path tidak valid).
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.issues });
    }
    console.error('[api] unhandled error:', error);
    return res.status(error.status ?? 500).json({ error: error.code ?? 'INTERNAL_ERROR' });
  });

  return app;
}
