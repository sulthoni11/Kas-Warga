import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db.js';
import { getPaymentProvider } from '../integrations/payments/index.js';
import {
  findInvoice,
  PaymentError,
  settleInvoice,
  storeInvoice,
} from '../services/payments.js';

export const devRouter = Router();

const createInvoiceSchema = z.object({
  communityId: z.coerce.number().int().positive().optional(),
  memberId: z.coerce.number().int().positive().optional(),
  packageId: z.coerce.number().int().positive().optional(),
  depositId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().int().positive().max(1_000_000_000),
  method: z.enum(['QRIS', 'VA']).default('QRIS'),
});

const settleSchema = z.object({
  providerRef: z.string().min(1).max(120),
  status: z.enum(['PAID', 'FAILED', 'EXPIRED']).default('PAID'),
  amount: z.coerce.number().int().positive().max(1_000_000_000).optional(),
});

function badRequest(res, issues) {
  return res.status(400).json({ error: 'VALIDATION_ERROR', issues });
}

async function createInvoice(input) {
  const pool = getPool();
  let deposit;

  if (input.depositId) {
    const [[row]] = await pool.query(
      `SELECT id, community_id, member_id, amount, status
         FROM deposits WHERE id = ? LIMIT 1`,
      [input.depositId],
    );
    if (!row) return { error: 'DEPOSIT_NOT_FOUND', status: 404 };
    if (row.status !== 'PENDING') return { error: 'DEPOSIT_NOT_PENDING', status: 409 };
    if (Number(row.amount) !== input.amount) {
      return { error: 'INVOICE_AMOUNT_MISMATCH', status: 400 };
    }
    deposit = row;
  } else {
    if (!input.communityId || !input.memberId) {
      return { error: 'COMMUNITY_AND_MEMBER_REQUIRED', status: 400 };
    }

    const [[member]] = await pool.query(
      'SELECT id FROM members WHERE id = ? AND community_id = ? LIMIT 1',
      [input.memberId, input.communityId],
    );
    if (!member) return { error: 'MEMBER_NOT_FOUND', status: 404 };

    if (input.packageId) {
      const [[pkg]] = await pool.query(
        'SELECT id FROM packages WHERE id = ? AND community_id = ? LIMIT 1',
        [input.packageId, input.communityId],
      );
      if (!pkg) return { error: 'PACKAGE_NOT_FOUND', status: 404 };

      const [[enrolled]] = await pool.query(
        'SELECT id FROM member_packages WHERE member_id = ? AND package_id = ? LIMIT 1',
        [input.memberId, input.packageId],
      );
      if (!enrolled) return { error: 'PACKAGE_NOT_ENROLLED', status: 400 };
    }

    const occurredAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query(
      `INSERT INTO deposits
         (community_id, member_id, package_id, amount, method, occurred_at, status, idempotency_key)
       VALUES (?, ?, ?, ?, 'GATEWAY', ?, 'PENDING', ?)`,
      [
        input.communityId,
        input.memberId,
        input.packageId ?? null,
        input.amount,
        occurredAt,
        `gw-${randomUUID()}`,
      ],
    );

    const [[row]] = await pool.query(
      `SELECT id, community_id, member_id, amount, status
         FROM deposits WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    deposit = row;
  }

  const provider = getPaymentProvider();
  const invoice = await provider.createInvoice({
    amount: Number(deposit.amount),
    depositId: Number(deposit.id),
    method: input.method,
  });
  const stored = await storeInvoice({
    provider: provider.name,
    invoice,
    depositId: Number(deposit.id),
  });

  return {
    invoice: stored,
    deposit: {
      id: Number(deposit.id),
      communityId: Number(deposit.community_id),
      memberId: Number(deposit.member_id),
      amount: Number(deposit.amount),
      status: deposit.status,
    },
  };
}

/**
 * Hanya aktif di luar production (lihat app.js).
 * - Tanpa `providerRef`: membuat deposit PENDING + invoice dummy (PRD §13.3).
 * - Dengan `providerRef`: menyelesaikan invoice (PAID/FAILED/EXPIRED).
 */
devRouter.post('/payments/simulate', async (req, res, next) => {
  try {
    const body = req.body ?? {};

    if (body.providerRef !== undefined) {
      const input = settleSchema.parse(body);
      const provider = getPaymentProvider();
      const result = await settleInvoice({
        provider: provider.name,
        providerRef: input.providerRef,
        status: input.status,
        amount: input.amount ?? null,
      });
      return res.json(result);
    }

    const input = createInvoiceSchema.parse(body);
    const result = await createInvoice(input);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest(res, error.issues);
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ error: error.code, ...error.details });
    }
    return next(error);
  }
});

devRouter.get('/payments/:providerRef', async (req, res, next) => {
  try {
    const provider = getPaymentProvider();
    const invoice = await findInvoice(provider.name, req.params.providerRef);
    if (!invoice) return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    return res.json({ invoice });
  } catch (error) {
    return next(error);
  }
});

/** Inspeksi cicilan anggota (dipakai smoke test alokasi setoran). */
devRouter.get('/installments/:memberId', async (req, res, next) => {
  try {
    const memberId = z.coerce.number().int().positive().parse(req.params.memberId);
    const [rows] = await getPool().query(
      `SELECT i.id, i.seq, i.amount, i.paid_amount, i.due_date, i.status,
              p.id AS package_id, p.name AS package_name
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
         JOIN packages p ON p.id = mp.package_id
        WHERE mp.member_id = ?
        ORDER BY i.due_date ASC, i.seq ASC, i.id ASC`,
      [memberId],
    );

    return res.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        packageId: Number(row.package_id),
        packageName: row.package_name,
        seq: Number(row.seq),
        amount: Number(row.amount),
        paidAmount: Number(row.paid_amount),
        dueDate: row.due_date,
        status: row.status,
      })),
    });
  } catch (error) {
    return next(error);
  }
});
