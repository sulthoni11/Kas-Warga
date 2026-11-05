import { randomUUID } from 'node:crypto';

/**
 * Provider dummy untuk arsitektur awal (PRD §13.2).
 * Tidak melakukan panggilan jaringan apa pun; pesan hanya dicatat ke log
 * dan (pada M4) dicatat ke tabel reminder_outbox oleh pemanggil.
 */
export function createConsoleProvider() {
  return {
    name: 'console',
    async sendMessage({ to, templateKey, params = {} }) {
      const providerRef = `dummy-${randomUUID()}`;
      console.log(
        `[WA:DUMMY] to=${to} template=${templateKey} params=${JSON.stringify(params)} ref=${providerRef}`,
      );
      return { providerRef, status: 'SENT' };
    },
  };
}
