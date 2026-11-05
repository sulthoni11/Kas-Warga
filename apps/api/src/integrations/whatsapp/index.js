import { config } from '../../config.js';
import { createConsoleProvider } from './providers/console.js';
import { createFonnteProvider } from './providers/fonnte.js';

/**
 * Kontrak adapter (PRD §13.2):
 *   sendMessage({ to, templateKey, params }) -> { providerRef, status }
 *
 * Menambah provider nyata hanya butuh file baru di ./providers dan satu entri di factory ini.
 */
function createProvider(name) {
  switch (name) {
    case 'console':
      return createConsoleProvider();
    case 'fonnte':
    case 'waba':
      // Sengaja gagal keras: lebih baik aplikasi menolak start daripada
      // diam-diam menganggap pesan terkirim (FR-08 AC).
      createFonnteProvider();
      return null;
    default:
      throw new Error(`WA_PROVIDER tidak dikenal: ${name}`);
  }
}

export const waProvider = createProvider(config.WA_PROVIDER);
