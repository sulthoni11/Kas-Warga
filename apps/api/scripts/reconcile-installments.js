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
  let totalFailed = 0;

  for (const community of communities) {
    const result = await reconcileCommunityInstallments(Number(community.id));
    totalFailed += result.failed;
    const failed = result.failed > 0 ? `, ${result.failed} gagal` : '';
    console.log(
      `[reconcile] ${community.name} (id ${community.id}): ${result.reconciled}/${result.members} anggota${failed}`,
    );
  }

  console.log(`[reconcile] selesai untuk ${communities.length} komunitas`);
  if (totalFailed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('REKONSILIASI GAGAL', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
