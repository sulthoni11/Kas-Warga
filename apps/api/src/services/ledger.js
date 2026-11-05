/**
 * Ledger append-only berantai hash (PRD §8.2, §9).
 *
 * Penulisan diserialisasi per komunitas dengan named lock MySQL (GET_LOCK),
 * bukan SELECT ... FOR UPDATE, karena akun aplikasi tidak punya privilege UPDATE
 * pada tabel ledger.
 */
import { createHash } from 'node:crypto';
import { getPool } from '../db.js';

export const GENESIS_PREV_HASH = '0'.repeat(64);
const LOCK_TIMEOUT_SECONDS = 5;
const SQL_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** Semua waktu masuk rantai sebagai string UTC detik agar hash dapat direproduksi. */
export function toLedgerTimestamp(value) {
  if (typeof value === 'string' && SQL_DATETIME.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_TIMESTAMP');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Payload kanonik: urutan field dan pemisah TIDAK boleh berubah,
 * karena mengubahnya akan memutus verifikasi seluruh entri lama.
 *
 *   seq|community_id|entry_type|member_id|amount|occurred_at|prev_hash
 */
export function canonicalPayload({
  seq,
  communityId,
  entryType,
  memberId = null,
  amount,
  occurredAt,
  prevHash,
}) {
  return [
    String(seq),
    String(communityId),
    entryType,
    memberId === null || memberId === undefined ? 'NULL' : String(memberId),
    String(amount),
    toLedgerTimestamp(occurredAt),
    prevHash,
  ].join('|');
}

export function computeHash(entry) {
  return createHash('sha256').update(canonicalPayload(entry), 'utf8').digest('hex');
}

/**
 * Menambahkan satu entri ke rantai milik komunitas.
 * `seq` dihitung sebagai entri terakhir + 1 di dalam lock, sehingga hash
 * sudah final sebelum INSERT.
 */
export async function appendEntry({
  communityId,
  entryType,
  memberId = null,
  amount,
  occurredAt = new Date(),
  refType = null,
  refId = null,
  note = null,
}) {
  if (!Number.isInteger(amount)) throw new Error('INVALID_AMOUNT');
  if (!Number.isInteger(Number(communityId))) throw new Error('INVALID_COMMUNITY_ID');

  const conn = await getPool().getConnection();
  const lockName = `scff.ledger.${communityId}`;

  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, ?) AS got', [
      lockName,
      LOCK_TIMEOUT_SECONDS,
    ]);
    if (lockRow.got !== 1) {
      const error = new Error('LEDGER_LOCK_TIMEOUT');
      error.code = 'LEDGER_LOCK_TIMEOUT';
      throw error;
    }

    await conn.beginTransaction();

    const [lastRows] = await conn.query(
      'SELECT seq, hash FROM ledger_entries WHERE community_id = ? ORDER BY seq DESC LIMIT 1',
      [communityId],
    );
    const last = lastRows[0] ?? null;

    const seq = Number(last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? GENESIS_PREV_HASH;
    const occurredAtSql = toLedgerTimestamp(occurredAt);
    const hash = computeHash({
      seq,
      communityId,
      entryType,
      memberId,
      amount,
      occurredAt: occurredAtSql,
      prevHash,
    });

    const [result] = await conn.query(
      `INSERT INTO ledger_entries
         (community_id, seq, entry_type, member_id, amount, occurred_at, ref_type, ref_id, note, prev_hash, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [communityId, seq, entryType, memberId, amount, occurredAtSql, refType, refId, note, prevHash, hash],
    );

    await conn.commit();

    return {
      id: Number(result.insertId),
      communityId: Number(communityId),
      seq,
      entryType,
      memberId,
      amount,
      occurredAt: occurredAtSql,
      prevHash,
      hash,
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* transaksi mungkin belum dimulai */
    }
    throw error;
  } finally {
    try {
      await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch {
      /* koneksi rusak; lock dilepas otomatis saat koneksi ditutup */
    }
    conn.release();
  }
}

/**
 * Menghitung ulang seluruh rantai satu komunitas (FR-11).
 * Mengembalikan VALID/INVALID beserta entri pertama yang rusak.
 */
export async function verifyChain(communityId) {
  const [rows] = await getPool().query(
    `SELECT seq, community_id, entry_type, member_id, amount, occurred_at, prev_hash, hash
       FROM ledger_entries
      WHERE community_id = ?
      ORDER BY seq ASC`,
    [communityId],
  );

  let expectedPrev = GENESIS_PREV_HASH;
  let expectedSeq = 1;

  for (const row of rows) {
    const seq = Number(row.seq);

    if (seq !== expectedSeq) {
      return {
        ok: false,
        reason: 'SEQ_GAP',
        totalEntries: rows.length,
        firstBrokenSeq: seq,
        rootHash: expectedPrev,
      };
    }

    if (row.prev_hash !== expectedPrev) {
      return {
        ok: false,
        reason: 'BROKEN_LINK',
        totalEntries: rows.length,
        firstBrokenSeq: seq,
        rootHash: expectedPrev,
      };
    }

    const recomputed = computeHash({
      seq,
      communityId: Number(row.community_id),
      entryType: row.entry_type,
      memberId: row.member_id,
      amount: Number(row.amount),
      occurredAt: row.occurred_at,
      prevHash: row.prev_hash,
    });

    if (recomputed !== row.hash) {
      return {
        ok: false,
        reason: 'HASH_MISMATCH',
        totalEntries: rows.length,
        firstBrokenSeq: seq,
        rootHash: expectedPrev,
      };
    }

    expectedPrev = row.hash;
    expectedSeq += 1;
  }

  return {
    ok: true,
    reason: null,
    totalEntries: rows.length,
    headSeq: rows.length,
    firstBrokenSeq: null,
    rootHash: rows.length ? expectedPrev : GENESIS_PREV_HASH,
  };
}
