import { createApp } from './app.js';
import { config } from './config.js';
import { closePool } from './db.js';
import { startReminderJob } from './jobs/reminders.js';

const app = createApp();

const server = app.listen(
  { port: config.PORT, host: '::', ipv6Only: false },
  () => {
    console.log(
      `[api] http://localhost:${config.PORT} | payment=${config.PAYMENT_PROVIDER} | whatsapp=${config.WA_PROVIDER}`,
    );
  },
);

startReminderJob();

async function shutdown(signal) {
  console.log(`[api] ${signal} diterima, mematikan server...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
