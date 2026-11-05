/**
 * Seed data demo (D4: demo akademik). Idempoten berdasarkan slug komunitas.
 *   node apps/api/scripts/seed.js
 */
import { getPool, closePool } from '../src/db.js';
import { hashPassword } from '../src/auth/passwords.js';
import { appendEntry } from '../src/services/ledger.js';
import { reconcileCommunityInstallments } from '../src/services/installments.js';
import { buildInstallmentPlan } from '../src/services/summary.js';
import { randomUUID } from 'node:crypto';

const DEMO_PASSWORD = '12345678';
const COMMUNITY_SLUG = 'r2-09-dukuh-tlobong';
const COMMUNITY_NAME = 'R2 09 Dukuh Tlobong';
const LEGACY_SLUG = 'rt-05-sukamaju';

const ACCOUNTS = [
  { email: 'bendahara@gmail.com', role: 'BENDAHARA' },
  { email: 'ketua@gmail.com', role: 'KETUA' },
  { email: 'admin@gmail.com', role: 'SUPER_ADMIN' },
];

const MEMBERS = [
  { name: 'Budi Santoso', phone: '+6281211100001', rt: '01' },
  { name: 'Siti Aminah', phone: '+6281211100002', rt: '01' },
  { name: 'Agus Riyanto', phone: '+6281211100003', rt: '02' },
  { name: 'Dewi Lestari', phone: '+6281211100004', rt: '02' },
  { name: 'Hendra Wijaya', phone: '+6281211100005', rt: '03' },
  { name: 'Rina Marlina', phone: '+6281211100006', rt: '03' },
];

const PACKAGES = [
  { name: 'Tabungan Qurban', targetAmount: 2_400_000, frequency: 'WEEKLY', daysAhead: 210 },
  { name: 'Sembako Harian', targetAmount: 500_000, frequency: 'DAILY', daysAhead: 30 },
  { name: 'Kas RT', targetAmount: 0, frequency: 'DAILY', daysAhead: 30 },
];

async function upsertUser(pool, email, role) {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

  // Akun yang sudah ada ikut disetel ulang agar kredensial default selalu konsisten.
  if (rows[0]) {
    await pool.query(
      'UPDATE users SET password_hash = ?, role = ?, is_active = 1, failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [passwordHash, role, rows[0].id],
    );
    return Number(rows[0].id);
  }

  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
    [email, passwordHash, role],
  );
  return Number(result.insertId);
}

/**
 * Pastikan kedua paket tetap ada, beserta pendaftaran anggota dan jadwal cicilannya.
 * Idempoten: paket yang sudah ada dilewati, sehingga aman dijalankan berulang.
 */
async function ensurePackages(pool, communityId) {
  const [members] = await pool.query(
    "SELECT id FROM members WHERE community_id = ? AND status = 'ACTIVE'",
    [communityId],
  );
  const memberIds = members.map((row) => Number(row.id));
  const today = new Date();
  let created = 0;

  for (const pkg of PACKAGES) {
    const [found] = await pool.query(
      'SELECT id FROM packages WHERE community_id = ? AND name = ? LIMIT 1',
      [communityId, pkg.name],
    );
    if (found[0]) continue;

    const dueDate = new Date(today.getTime() + pkg.daysAhead * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const [packageResult] = await pool.query(
      'INSERT INTO packages (community_id, name, target_amount, due_date, frequency) VALUES (?, ?, ?, ?, ?)',
      [communityId, pkg.name, pkg.targetAmount, dueDate, pkg.frequency],
    );
    const packageId = Number(packageResult.insertId);
    const plan = buildInstallmentPlan({
      targetAmount: pkg.targetAmount,
      dueDate,
      frequency: pkg.frequency,
    });

    for (const memberId of memberIds) {
      const [mp] = await pool.query(
        'INSERT INTO member_packages (member_id, package_id, status) VALUES (?, ?, ?)',
        [memberId, packageId, 'ACTIVE'],
      );
      for (const item of plan.schedule) {
        await pool.query(
          'INSERT INTO installments (member_package_id, seq, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
          [mp.insertId, item.seq, item.amount, item.dueDate, 'DUE'],
        );
      }
    }

    created += 1;
  }

  return created;
}

/** Hapus akun demo lama (@scff.test) supaya daftar akun tidak membingungkan. */
async function removeLegacyAccounts(pool) {
  const [rows] = await pool.query("SELECT id FROM users WHERE email LIKE '%@scff.test'");
  for (const row of rows) {
    await pool.query('DELETE FROM sessions WHERE user_id = ?', [row.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [row.id]);
  }
  return rows.length;
}

async function main() {
  const pool = getPool();

  for (const account of ACCOUNTS) {
    await upsertUser(pool, account.email, account.role);
  }

  const removed = await removeLegacyAccounts(pool);
  if (removed > 0) console.log(`Akun lama (@scff.test) dihapus: ${removed}`);

  console.log('Akun pengurus siap:');
  for (const account of ACCOUNTS) {
    console.log(`  ${account.email}  (${account.role})`);
  }
  console.log(`  password: ${DEMO_PASSWORD}`);

  // Ganti nama komunitas demo lama bila masih memakai slug sebelumnya.
  await pool.query('UPDATE communities SET name = ?, slug = ? WHERE slug = ?', [
    COMMUNITY_NAME,
    COMMUNITY_SLUG,
    LEGACY_SLUG,
  ]);

  const [existing] = await pool.query('SELECT id FROM communities WHERE slug = ? LIMIT 1', [
    COMMUNITY_SLUG,
  ]);
  if (existing[0]) {
    // Samakan nama paket pada database lama tanpa membuat jadwal baru.
    await pool.query(
      "UPDATE packages SET name = 'Sembako Harian' WHERE community_id = ? AND name = 'Sembako Lebaran'",
      [existing[0].id],
    );

    // Lengkapi RT anggota demo lama yang belum punya (migrasi 004).
    for (const member of MEMBERS) {
      await pool.query(
        "UPDATE members SET rt = ? WHERE community_id = ? AND name = ? AND (rt IS NULL OR rt = '')",
        [member.rt, existing[0].id, member.name],
      );
    }

    // Lengkapi paket tetap yang belum ada (mis. setelah pembersihan data).
    const added = await ensurePackages(pool, Number(existing[0].id));

    const [packageList] = await pool.query(
      'SELECT name FROM packages WHERE community_id = ? ORDER BY id ASC',
      [existing[0].id],
    );

    // Samakan status cicilan dengan setoran yang sudah ada (termasuk data lama
    // yang dibuat sebelum alokasi setoran diperkenalkan).
    const reconciled = await reconcileCommunityInstallments(Number(existing[0].id));
    if (reconciled.failed > 0) {
      throw new Error(`Rekonsiliasi cicilan gagal untuk ${reconciled.failed} anggota`);
    }

    console.log(`Komunitas "${COMMUNITY_NAME}" siap (id ${existing[0].id}).`);
    if (added > 0) console.log(`  paket dilengkapi: ${added}`);
    console.log(`  cicilan direkonsiliasi: ${reconciled.reconciled} anggota`);
    console.log(`  paket aktif: ${packageList.map((row) => row.name).join(', ')}`);
    return;
  }

  const today = new Date();
  const periodStart = new Date(today.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const periodEnd = new Date(today.getTime() + 210 * 86_400_000).toISOString().slice(0, 10);

  const [communityResult] = await pool.query(
    'INSERT INTO communities (name, slug, period_start, period_end, status) VALUES (?, ?, ?, ?, ?)',
    [COMMUNITY_NAME, COMMUNITY_SLUG, periodStart, periodEnd, 'ACTIVE'],
  );
  const communityId = Number(communityResult.insertId);

  const memberIds = [];
  for (const member of MEMBERS) {
    const [result] = await pool.query(
      'INSERT INTO members (community_id, name, phone_e164, rt, status, consent_at, consent_version) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?)',
      [communityId, member.name, member.phone, member.rt, 'ACTIVE', '1.0'],
    );
    memberIds.push(Number(result.insertId));
  }

  await ensurePackages(pool, communityId);

  // Setoran demo: 12 transaksi tersebar, masing-masing menghasilkan 1 entri ledger.
  const depositPlan = [
    [0, 0, 50_000], [0, 0, 50_000], [0, 1, 25_000],
    [1, 0, 50_000], [1, 1, 25_000],
    [2, 0, 50_000], [2, 1, 50_000], [2, 1, 50_000],
    [3, 0, 25_000],
    [4, 0, 50_000], [4, 1, 25_000],
    [5, 0, 50_000],
  ];

  const [packages] = await pool.query(
    'SELECT id FROM packages WHERE community_id = ? ORDER BY id ASC',
    [communityId],
  );

  for (const [memberIndex, packageIndex, amount] of depositPlan) {
    const occurredAt = new Date(today.getTime() - Math.floor(Math.random() * 25) * 86_400_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [deposit] = await pool.query(
      `INSERT INTO deposits (community_id, member_id, package_id, amount, method, occurred_at, status, idempotency_key)
       VALUES (?, ?, ?, ?, 'CASH', ?, 'CONFIRMED', ?)`,
      [
        communityId,
        memberIds[memberIndex],
        packages[packageIndex]?.id ?? null,
        amount,
        occurredAt,
        `seed-${randomUUID()}`,
      ],
    );

    const entry = await appendEntry({
      communityId,
      entryType: 'DEPOSIT',
      memberId: memberIds[memberIndex],
      amount,
      occurredAt,
      refType: 'deposit',
      refId: Number(deposit.insertId),
      note: 'Setoran demo',
    });

    await pool.query('UPDATE deposits SET ledger_seq = ? WHERE id = ?', [entry.seq, deposit.insertId]);
  }

  // Setoran demo langsung dialokasikan ke cicilan supaya angka tunggakan
  // di dashboard konsisten sejak awal.
  const reconciled = await reconcileCommunityInstallments(communityId);
  if (reconciled.failed > 0) {
    throw new Error(`Rekonsiliasi cicilan gagal untuk ${reconciled.failed} anggota`);
  }

  const [counts] = await pool.query(
    'SELECT COUNT(*) AS entries FROM ledger_entries WHERE community_id = ?',
    [communityId],
  );

  console.log('Seed selesai:');
  console.log(`  komunitas   : ${communityId} (${COMMUNITY_NAME})`);
  console.log(`  anggota     : ${memberIds.length}`);
  console.log(`  paket       : ${packages.length}`);
  console.log(`  cicilan     : direkonsiliasi untuk ${reconciled.reconciled} anggota`);
  console.log(`  entri ledger: ${Number(counts[0].entries)}`);
  console.log('  akun demo   : bendahara@gmail.com / ketua@gmail.com / admin@gmail.com');
  console.log(`  password    : ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('SEED GAGAL', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
