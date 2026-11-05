/**
 * Settlement invoice payment gateway dummy (FR-09).
 *
 * Alur: invoice PENDING -> webhook PAID -> deposit CONFIRMED + tepat satu entri
 * ledger. Idempotensi dijaga tiga lapis:
 *   1. named lock MySQL per invoice (serialisasi webhook yang datang bersamaan),
 *   2. status invoice + `ledger_seq` sebagai penanda selesai,
 *   3. pengecekan entri ledger berdasarkan (ref_type='deposit', ref_id) untuk
 *      memulihkan keadaan bila proses berhenti di tengah jalan.
 */
import { getPool } from '../db.js';
import { appendEntry } from './ledger.js';
import { reconcileMemberInstallmentsSafe } from './installments.js';
import { emitCommunityUpdate } from './events.js';

const LOCK_TIMEOUT_SECONDS = 5;
const PAYABLE_STATUS = new Set(['PENDING', 'PAID']);
const TERMINAL_STATUS = new Set(['PAID', 'FAILED', 'EXPIRED']);

export class PaymentError extends Error {
  constructor(code, status, details = {}) {
    super(code);
    this.name = 'PaymentError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Semua DATETIME ditulis sebagai string UTC detik agar konsisten dengan ledger. */
export function toSqlDatetime(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_TIMESTAMP');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const value = new Date(`${String(expiresAt).replace(' ', 'T')}Z`);
  return !Number.isNaN(value.getTime()) && value.getTime() <= Date.now();
}

function shapeInvoice(row) {
  return {
    id: Number(row.id),
    provider: row.provider,
    providerRef: row.provider_ref,
    depositId: row.deposit_id === null || row.deposit_id === undefined ? null : Number(row.deposit_id),
    amount: Number(row.amount),
    status: row.status,
    ledgerSeq: row.ledger_seq === null || row.ledger_seq === undefined ? null : Number(row.ledger_seq),
    expiresAt: row.expires_at ?? null,
    paidAt: row.paid_at ?? null,
  };
}

function shapeDeposit(row) {
  return {
    id: Number(row.id),
    communityId: Number(row.community_id),
    memberId: Number(row.member_id),
    amount: Number(row.amount),
    status: row.status,
    ledgerSeq: row.ledger_seq === null || row.ledger_seq === undefined ? null : Number(row.ledger_seq),
  };
}

/** Menyimpan invoice dummy yang dibuat provider ke tabel `invoices` (PENDING). */
export async function storeInvoice({ provider, invoice, depositId = null }) {
  const linkId = depositId ?? invoice.depositId ?? null;
  const [result] = await getPool().query(
    `INSERT INTO invoices (deposit_id, provider, provider_ref, amount, status, expires_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`,
    [
      linkId,
      provider,
      invoice.providerRef,
      invoice.amount,
      toSqlDatetime(invoice.expiresAt),
    ],
  );

  return {
    ...invoice,
    id: Number(result.insertId),
    provider,
    depositId: linkId === null ? null : Number(linkId),
    status: 'PENDING',
  };
}

export async function findInvoice(provider, providerRef) {
  const [rows] = await getPool().query(
    `SELECT id, provider, provider_ref, deposit_id, amount, status, ledger_seq, expires_at, paid_at
       FROM invoices
      WHERE provider = ? AND provider_ref = ?
      LIMIT 1`,
    [provider, providerRef],
  );
  return rows[0] ? shapeInvoice(rows[0]) : null;
}

/**
 * Menyelesaikan invoice berdasarkan event webhook.
 * `amount` opsional: bila dikirim, harus sama dengan nominal invoice.
 */
export async function settleInvoice({ provider, providerRef, status, amount = null }) {
  if (!TERMINAL_STATUS.has(status)) {
    throw new PaymentError('INVALID_STATUS', 400, { allowed: [...TERMINAL_STATUS] });
  }

  const conn = await getPool().getConnection();
  const lockName = `scff.invoice.${provider}.${providerRef}`;
  let locked = false;

  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, ?) AS got', [
      lockName,
      LOCK_TIMEOUT_SECONDS,
    ]);
    if (lockRow.got !== 1) throw new PaymentError('INVOICE_LOCK_TIMEOUT', 503);
    locked = true;

    const [[row]] = await conn.query(
      `SELECT id, provider, provider_ref, deposit_id, amount, status, ledger_seq, expires_at, paid_at
         FROM invoices
        WHERE provider = ? AND provider_ref = ?
        LIMIT 1`,
      [provider, providerRef],
    );
    if (!row) throw new PaymentError('INVOICE_NOT_FOUND', 404, { provider, providerRef });

    const invoice = shapeInvoice(row);

    if (status === 'FAILED' || status === 'EXPIRED') {
      if (invoice.status === 'PENDING') {
        await conn.query('UPDATE invoices SET status = ? WHERE id = ? AND status = \'PENDING\'', [
          status,
          invoice.id,
        ]);
        return { outcome: status, ledgerWritten: false, invoice: { ...invoice, status } };
      }
      return { outcome: `ALREADY_${invoice.status}`, ledgerWritten: false, invoice };
    }

    if (invoice.status === 'PAID' && invoice.ledgerSeq !== null) {
      return {
        outcome: 'ALREADY_PAID',
        ledgerWritten: false,
        ledgerSeq: invoice.ledgerSeq,
        invoice,
      };
    }

    if (!PAYABLE_STATUS.has(invoice.status)) {
      throw new PaymentError('INVOICE_NOT_PAYABLE', 409, {
        invoiceStatus: invoice.status,
      });
    }

    if (amount !== null && amount !== undefined && Number(amount) !== invoice.amount) {
      throw new PaymentError('AMOUNT_MISMATCH', 400, {
        expected: invoice.amount,
        received: Number(amount),
      });
    }

    if (isExpired(invoice.expires_at)) {
      await conn.query("UPDATE invoices SET status = 'EXPIRED' WHERE id = ? AND status = 'PENDING'", [
        invoice.id,
      ]);
      throw new PaymentError('INVOICE_EXPIRED', 409, { expiresAt: invoice.expires_at });
    }

    let deposit = null;
    let ledgerSeq = invoice.ledgerSeq;

    if (invoice.depositId !== null) {
      const [[depositRow]] = await conn.query(
        `SELECT id, community_id, member_id, amount, occurred_at, status, ledger_seq
           FROM deposits WHERE id = ? LIMIT 1`,
        [invoice.depositId],
      );
      if (!depositRow) {
        throw new PaymentError('DEPOSIT_NOT_FOUND', 409, { depositId: invoice.depositId });
      }
      if (depositRow.status === 'VOIDED') {
        throw new PaymentError('DEPOSIT_VOIDED', 409, { depositId: invoice.depositId });
      }
      if (Number(depositRow.amount) !== invoice.amount) {
        throw new PaymentError('INVOICE_AMOUNT_MISMATCH', 409, {
          invoiceAmount: invoice.amount,
          depositAmount: Number(depositRow.amount),
        });
      }

      deposit = shapeDeposit(depositRow);

      if (deposit.ledgerSeq === null) {
        // Pulihkan bila appendEntry sempat commit tetapi update deposit gagal.
        const [[existing]] = await conn.query(
          `SELECT seq FROM ledger_entries
            WHERE community_id = ? AND ref_type = 'deposit' AND ref_id = ?
            ORDER BY seq ASC LIMIT 1`,
          [deposit.communityId, deposit.id],
        );

        if (existing) {
          ledgerSeq = Number(existing.seq);
        } else {
          const entry = await appendEntry({
            communityId: deposit.communityId,
            entryType: 'DEPOSIT',
            memberId: deposit.memberId,
            amount: deposit.amount,
            occurredAt: depositRow.occurred_at,
            refType: 'deposit',
            refId: deposit.id,
            note: 'Pembayaran gateway dummy',
          });
          ledgerSeq = entry.seq;
        }

        await conn.query(
          "UPDATE deposits SET status = 'CONFIRMED', ledger_seq = ? WHERE id = ?",
          [ledgerSeq, deposit.id],
        );
        deposit = { ...deposit, status: 'CONFIRMED', ledgerSeq };
      } else {
        ledgerSeq = deposit.ledgerSeq;
      }
    }

    await conn.query(
      "UPDATE invoices SET status = 'PAID', paid_at = UTC_TIMESTAMP(), ledger_seq = ? WHERE id = ?",
      [ledgerSeq, invoice.id],
    );

    if (deposit && ledgerSeq !== null) {
      // Pembayaran gateway yang sudah CONFIRMED ikut melunasi cicilan.
      try {
        await reconcileMemberInstallmentsSafe(deposit.memberId);
      } catch (error) {
        console.error(`[installments] rekonsiliasi anggota ${deposit.memberId} gagal:`, error);
      }

      emitCommunityUpdate(deposit.communityId, {
        type: 'deposit.created',
        seq: ledgerSeq,
        amount: deposit.amount,
        source: 'gateway',
      });
    }

    return {
      outcome: ledgerSeq === null ? 'PAID_WITHOUT_LEDGER' : 'PAID',
      ledgerWritten: ledgerSeq !== null,
      ledgerSeq,
      invoice: { ...invoice, status: 'PAID', paidAt: new Date().toISOString(), ledgerSeq },
      deposit,
    };
  } finally {
    if (locked) {
      try {
        await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch {
        /* koneksi rusak; named lock dilepas otomatis saat koneksi tertutup */
      }
    }
    conn.release();
  }
}
