import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../../../config.js';

const INVOICE_TTL_MS = 15 * 60 * 1000;
let counter = 0;

function signWebhook(rawBody) {
  return createHmac('sha256', config.DUMMY_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

/**
 * Payment gateway dummy untuk arsitektur awal (PRD §13.3, §13.5).
 * Tidak ada SDK, tidak ada panggilan jaringan, tidak ada uang yang bergerak.
 */
export const dummyPaymentProvider = {
  name: 'dummy',

  async createInvoice({ amount, depositId = null, method = 'QRIS' }) {
    counter += 1;
    const providerRef = `DUMMY-INV-${Date.now()}-${counter}`;
    return {
      providerRef,
      depositId,
      method,
      amount,
      qrString: `SCFF-DUMMY-QR-${randomUUID()}`,
      virtualAccount: `8808${String(counter).padStart(8, '0')}`,
      expiresAt: new Date(Date.now() + INVOICE_TTL_MS).toISOString(),
      isDummy: true,
    };
  },

  signWebhook,

  verifyWebhook({ rawBody, signature }) {
    if (!signature) return false;
    let received;
    try {
      received = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    const expected = Buffer.from(signWebhook(rawBody ?? Buffer.alloc(0)), 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  },
};
