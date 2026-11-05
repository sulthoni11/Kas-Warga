/**
 * Alokasi setoran ke cicilan (M5).
 *
 * Aturan:
 *   - Hanya setoran CONFIRMED yang dialokasikan; setoran VOIDED/PENDING tidak.
 *   - Setoran dengan `package_id` hanya melunasi cicilan paket tersebut.
 *   - Setoran tanpa `package_id` melunasi cicilan semua paket anggota,
 *     urut jatuh tempo terawal.
 *   - Alokasi bersifat FIFO dan boleh sebagian; `paid_amount` menyimpan sisa
 *     yang sudah dibayar, status menjadi PAID saat paid_amount >= amount.
 *
 * Fungsi ini idempoten: seluruh alokasi anggota dihitung ulang dari sumbernya
 * (tabel deposits), sehingga aman dipanggil ulang setelah koreksi/void.
 */
import { getPool } from '../db.js';

const LOCK_TIMEOUT_SECONDS = 5;

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

/**
 * Hitung ulang alokasi untuk satu anggota.
 * @returns {Promise<{total:number, paid:number, partial:number}>}
 */
export async function reconcileMemberInstallments(memberId) {
  const id = Number(memberId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('INVALID_MEMBER_ID');

  const conn = await getPool().getConnection();
  const lockName = `scff.installments.${id}`;
  let locked = false;

  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, ?) AS got', [
      lockName,
      LOCK_TIMEOUT_SECONDS,
    ]);
    if (lockRow.got !== 1) throw new Error('INSTALLMENT_LOCK_TIMEOUT');
    locked = true;

    const [installments] = await conn.query(
      `SELECT i.id, i.amount, i.due_date, i.status, mp.package_id
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
        WHERE mp.member_id = ?
        ORDER BY i.due_date ASC, i.seq ASC, i.id ASC`,
      [id],
    );

    if (installments.length === 0) return { total: 0, paid: 0, partial: 0 };

    const [deposits] = await conn.query(
      `SELECT id, package_id, amount
         FROM deposits
        WHERE member_id = ? AND status = 'CONFIRMED'
        ORDER BY occurred_at ASC, created_at ASC, id ASC`,
      [id],
    );

    const state = installments.map((row) => ({
      id: Number(row.id),
      packageId: toNumber(row.package_id),
      amount: Number(row.amount),
      paid: 0,
      waived: row.status === 'WAIVED',
    }));

    for (const deposit of deposits) {
      let remaining = Number(deposit.amount);
      if (remaining <= 0) continue;
      const depositPackage = toNumber(deposit.package_id);

      for (const item of state) {
        if (remaining <= 0) break;
        if (item.waived) continue;
        if (depositPackage !== null && item.packageId !== depositPackage) continue;

        const outstanding = item.amount - item.paid;
        if (outstanding <= 0) continue;

        const applied = Math.min(outstanding, remaining);
        item.paid += applied;
        remaining -= applied;
      }
    }

    let paid = 0;
    let partial = 0;
    for (const item of state) {
      if (item.waived) continue;
      const status = item.paid >= item.amount ? 'PAID' : 'DUE';
      if (status === 'PAID') paid += 1;
      else if (item.paid > 0) partial += 1;

      await conn.query('UPDATE installments SET paid_amount = ?, status = ? WHERE id = ?', [
        item.paid,
        status,
        item.id,
      ]);
    }

    return { total: installments.length, paid, partial };
  } finally {
    if (locked) {
      try {
        await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch {
        /* named lock dilepas otomatis saat koneksi tertutup */
      }
    }
    conn.release();
  }
}

/** Hitung ulang seluruh anggota aktif pada satu komunitas. */
export async function reconcileCommunityInstallments(communityId) {
  const [rows] = await getPool().query(
    "SELECT id FROM members WHERE community_id = ? AND status = 'ACTIVE' ORDER BY id ASC",
    [communityId],
  );

  for (const row of rows) {
    await reconcileMemberInstallments(Number(row.id));
  }

  return rows.length;
}
