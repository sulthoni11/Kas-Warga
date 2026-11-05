/**
 * Smoke test ledger (M2): rantai, konkurensi, dan penolakan UPDATE/DELETE
 * oleh akun aplikasi. Exit code non-zero bila ada yang gagal.
 *
 *   node apps/api/scripts/ledger-smoke.js
 */
import { getPool, closePool } from '../src/db.js';
import { appendEntry, verifyChain } from '../src/services/ledger.js';

let failed = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

async function createCommunity(label) {
  const slug = `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [result] = await getPool().query(
    `INSERT INTO communities (name, slug, period_start, period_end, status)
     VALUES (?, ?, '2026-01-01', '2026-12-31', 'ACTIVE')`,
    [`Test ${label}`, slug],
  );
  return Number(result.insertId);
}

async function main() {
  // ---- 1. rantai dasar
  const chainCommunity = await createCommunity('chain');
  console.log(`SMOKE_COMMUNITY_ID=${chainCommunity}`);

  const first = await appendEntry({
    communityId: chainCommunity,
    entryType: 'DEPOSIT',
    amount: 50000,
    note: 'setoran pertama',
  });
  const second = await appendEntry({
    communityId: chainCommunity,
    entryType: 'DEPOSIT',
    amount: 25000,
  });
  const third = await appendEntry({
    communityId: chainCommunity,
    entryType: 'VOID',
    amount: -25000,
    note: 'koreksi entri 2',
  });

  check(
    'seq berurutan 1,2,3',
    [first.seq, second.seq, third.seq].join(',') === '1,2,3',
    [first.seq, second.seq, third.seq].join(','),
  );
  check('entri 1 memakai genesis (64 nol)', first.prevHash === '0'.repeat(64));
  check('prev_hash entri 2 = hash entri 1', second.prevHash === first.hash);
  check('VOID boleh bernilai negatif', third.amount === -25000);

  const chainVerify = await verifyChain(chainCommunity);
  check('verifyChain VALID', chainVerify.ok === true, JSON.stringify(chainVerify));
  check('root hash = hash entri terakhir', chainVerify.rootHash === third.hash);

  // ---- 2. konkurensi (10 penulisan paralel pada satu komunitas)
  const raceCommunity = await createCommunity('race');
  const settled = await Promise.allSettled(
    Array.from({ length: 10 }, (_, index) =>
      appendEntry({
        communityId: raceCommunity,
        entryType: 'DEPOSIT',
        amount: 10000 + index,
      }),
    ),
  );

  const rejected = settled.filter((item) => item.status === 'rejected');
  check(
    '10 penulisan paralel tanpa error',
    rejected.length === 0,
    rejected.map((item) => item.reason?.code ?? item.reason?.message).join(' | '),
  );

  const [raceRows] = await getPool().query(
    'SELECT seq FROM ledger_entries WHERE community_id = ? ORDER BY seq ASC',
    [raceCommunity],
  );
  const seqs = raceRows.map((row) => Number(row.seq));
  const expectedSeqs = Array.from({ length: 10 }, (_, index) => index + 1);
  check('seq konkuren linier 1..10 tanpa duplikat', seqs.join(',') === expectedSeqs.join(','), seqs.join(','));

  const raceVerify = await verifyChain(raceCommunity);
  check('rantai hasil konkuren VALID', raceVerify.ok === true, JSON.stringify(raceVerify));

  // ---- 3. penolakan oleh akun aplikasi (lapis 1)
  try {
    await getPool().query('UPDATE ledger_entries SET amount = 0 WHERE community_id = ?', [
      chainCommunity,
    ]);
    check('UPDATE ditolak akun aplikasi', false, 'UPDATE berhasil — hak akses DB belum dikunci');
  } catch (error) {
    check('UPDATE ditolak akun aplikasi', error.errno === 1142, `${error.code} (errno ${error.errno})`);
  }

  try {
    await getPool().query('DELETE FROM ledger_entries WHERE community_id = ?', [chainCommunity]);
    check('DELETE ditolak akun aplikasi', false, 'DELETE berhasil — hak akses DB belum dikunci');
  } catch (error) {
    check('DELETE ditolak akun aplikasi', error.errno === 1142, `${error.code} (errno ${error.errno})`);
  }
}

main()
  .catch((error) => {
    console.error('SMOKE ERROR', error);
    failed += 1;
  })
  .finally(async () => {
    await closePool();
    process.exit(failed === 0 ? 0 : 1);
  });
