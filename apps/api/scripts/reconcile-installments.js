/**
 * Hitung ulang alokasi setoran -> cicilan untuk seluruh komunitas.
 * Dipakai sekali setelah migrasi 007 atau kapan pun angka tunggakan perlu
 * disegarkan dari sumbernya (tabel deposits).
 *
 *   node apps/api/scripts/reconcile-installments.js
 */
import { getPool, closePool } from '../src/db.js';
import { reconcileCommunityInstallments } from '../src/services/installments.js';

async function main() {
  const [communities] = await getPool().query('SELECT id, name FROM communities ORDER BY id ASC');

  for (const community of communities) {
    const members = await reconcileCommunityInstallments(Number(community.id));
    console.log(`[reconcile] ${community.name} (id ${community.id}): ${members} anggota`);
  }

  console.log(`[reconcile] selesai untuk ${communities.length} komunitas`);
}

main()
  .catch((error) => {
    console.error('REKONSILIASI GAGAL', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
