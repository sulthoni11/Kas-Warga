/**
 * STUB — belum diimplementasikan (PRD §5.2, D3).
 *
 * Fonnte/Wablas adalah gateway tidak resmi (berbasis protokol WhatsApp Web)
 * dengan risiko pemblokiran nomor dan pelanggaran ToS. Adapter resmi yang
 * direkomendasikan adalah WhatsApp Cloud API (WABA). Implementasi nyata
 * ditunda sampai keputusan bisnis dibuka kembali (PRD §13.4, §13.5).
 */
export function createFonnteProvider() {
  throw new Error(
    'NOT_IMPLEMENTED: provider WhatsApp "fonnte" belum tersedia pada arsitektur awal. ' +
      'Gunakan WA_PROVIDER=console (dummy). Lihat PRD §13.5.',
  );
}
