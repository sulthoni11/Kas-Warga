import { config } from '../../config.js';
import { dummyPaymentProvider } from './providers/dummy.js';

const registry = {
  dummy: dummyPaymentProvider,
};

/**
 * Kontrak adapter (PRD §13.3):
 *   createInvoice({ amount, depositId, method }) -> invoice dummy
 *   verifyWebhook({ rawBody, signature })        -> boolean
 *
 * Provider nyata (midtrans/xendit) sengaja tidak didaftarkan: arsitektur awal
 * hanya memakai dummy (D1, §13.5). Memilih provider lain akan menghentikan
 * aplikasi dengan pesan yang jelas, bukan menjalankan alur setengah jadi.
 */
export function getPaymentProvider() {
  const provider = registry[config.PAYMENT_PROVIDER];
  if (!provider) {
    throw new Error(
      `PAYMENT_PROVIDER=${config.PAYMENT_PROVIDER} belum diimplementasikan. ` +
        'Arsitektur awal hanya mendukung "dummy" (PRD §13.5).',
    );
  }
  return provider;
}
