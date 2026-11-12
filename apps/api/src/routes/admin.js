import { Router } from 'express';
import { z } from 'zod';
import { randomBytes, randomUUID } from 'node:crypto';
import { getPool } from '../db.js';
import { appendEntry, verifyChain } from '../services/ledger.js';
import { buildCommunitySummary, buildInstallmentPlan } from '../services/summary.js';
import {
  reconcileCommunityInstallments,
  reconcileMemberInstallmentsSafe,
} from '../services/installments.js';
import { emitCommunityUpdate } from '../services/events.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { hashToken } from '../auth/session.js';
import { hashPassword } from '../auth/passwords.js';
import { waProvider } from '../integrations/whatsapp/index.js';
import { config } from '../config.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

const write = requireRole('BENDAHARA', 'SUPER_ADMIN');
const read = requireRole('BENDAHARA', 'KETUA', 'SUPER_ADMIN');
// Ketua boleh membagikan portal warga (baca-saja) walau tidak boleh menulis data.
const linkWrite = requireRole('BENDAHARA', 'KETUA', 'SUPER_ADMIN');
const superAdmin = requireRole('SUPER_ADMIN');

const idParam = z.coerce.number().int().positive();

function badRequest(res, issues) {
  return res.status(400).json({ error: 'VALIDATION_ERROR', issues });
}

async function communityOr404(res, id) {
  const [rows] = await getPool().query('SELECT id, name FROM communities WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) {
    res.status(404).json({ error: 'COMMUNITY_NOT_FOUND' });
    return null;
  }
  return rows[0];
}

// ------------------------------------------------------------------ bootstrap

adminRouter.get('/bootstrap', read, async (req, res, next) => {
  try {
    const [communities] = await getPool().query(
      `SELECT c.id, c.name, c.slug, c.period_start, c.period_end, c.status,
              (SELECT COUNT(*) FROM members m
                WHERE m.community_id = c.id AND m.status = 'ACTIVE') AS member_count
         FROM communities c ORDER BY c.id ASC`,
    );

    res.json({
      user: req.user,
      communities: communities.map((row) => ({
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        status: row.status,
        memberCount: Number(row.member_count ?? 0),
      })),
      providers: { payment: config.PAYMENT_PROVIDER, whatsapp: config.WA_PROVIDER },
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------- users

/** Khusus SUPER_ADMIN: daftar akun pengurus (pembeda nyata dari BENDAHARA). */
adminRouter.get('/users', superAdmin, async (_req, res, next) => {
  try {
    const [rows] = await getPool().query(
      'SELECT id, email, role, is_active FROM users ORDER BY id ASC',
    );
    return res.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        email: row.email,
        role: row.role,
        active: Number(row.is_active) === 1,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(['BENDAHARA', 'KETUA', 'SUPER_ADMIN']),
});

adminRouter.post('/users', superAdmin, async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const { email, password, role } = parsed.data;

    try {
      const [result] = await getPool().query(
        'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, 1)',
        [email.toLowerCase(), hashPassword(password), role],
      );
      return res.status(201).json({
        user: { id: Number(result.insertId), email: email.toLowerCase(), role },
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'EMAIL_TAKEN' });
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

// -------------------------------------------------------------------- summary

adminRouter.get('/communities/:id/summary', read, async (req, res, next) => {
  try {
    const id = idParam.parse(req.params.id);
    const summary = await buildCommunitySummary(id);
    if (!summary) return res.status(404).json({ error: 'COMMUNITY_NOT_FOUND' });
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

// ------------------------------------------------------------------ analytics

/** Nama bulan pendek Indonesia untuk grafik aplikasi mobile. */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

adminRouter.get('/communities/:id/analytics', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 12));

    const summary = await buildCommunitySummary(communityId);
    if (!summary) return res.status(404).json({ error: 'COMMUNITY_NOT_FOUND' });

    const pool = getPool();

    // Net kas masuk per bulan langsung dari LEDGER (DEPOSIT minus VOID), sehingga
    // angka grafik selalu sama dengan angka dashboard.
    const [cashRows] = await pool.query(
      `SELECT DATE_FORMAT(le.occurred_at, '%Y-%m') AS ym, COALESCE(SUM(le.amount), 0) AS net
         FROM ledger_entries le
        WHERE le.community_id = ?
        GROUP BY ym`,
      [communityId],
    );
    const cashByMonth = new Map(cashRows.map((row) => [String(row.ym), Number(row.net)]));

    // Sisa cicilan yang jatuh tempo di bulan tersebut dan masih belum dibayar.
    const [dueRows] = await pool.query(
      `SELECT DATE_FORMAT(i.due_date, '%Y-%m') AS ym,
              COALESCE(SUM(i.amount - i.paid_amount), 0) AS due
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
         JOIN members m ON m.id = mp.member_id
        WHERE m.community_id = ?
          AND i.status = 'DUE'
          AND i.paid_amount < i.amount
        GROUP BY ym`,
      [communityId],
    );
    const dueByMonth = new Map(dueRows.map((row) => [String(row.ym), Number(row.due)]));

    const series = [];
    const now = new Date();
    for (let index = months - 1; index >= 0; index -= 1) {
      const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
      const ym = cursor.toISOString().slice(0, 7);
      series.push({
        month: ym,
        label: MONTH_LABELS[cursor.getUTCMonth()],
        collected: cashByMonth.get(ym) ?? 0,
        dueRemaining: dueByMonth.get(ym) ?? 0,
      });
    }

    const [[stats]] = await pool.query(
      `SELECT
          COUNT(*) AS total,
          SUM(i.status = 'PAID') AS paid,
          SUM(i.status = 'WAIVED') AS waived,
          COALESCE(SUM(CASE WHEN i.status = 'DUE' AND i.paid_amount < i.amount THEN i.amount - i.paid_amount ELSE 0 END), 0) AS dueRemaining,
          COALESCE(SUM(CASE WHEN i.status = 'DUE' AND i.due_date <= CURDATE() AND i.paid_amount < i.amount THEN i.amount - i.paid_amount ELSE 0 END), 0) AS overdueAmount
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
         JOIN members m ON m.id = mp.member_id
        WHERE m.community_id = ?`,
      [communityId],
    );

    return res.json({
      communityId,
      months,
      series,
      installmentStats: {
        total: Number(stats.total),
        paid: Number(stats.paid ?? 0),
        waived: Number(stats.waived ?? 0),
        dueRemaining: Number(stats.dueRemaining),
        overdueAmount: Number(stats.overdueAmount),
      },
      packages: summary.packages,
      rt: summary.rtSummary,
      totals: summary.totals,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Menyelaraskan ulang cicilan dengan seluruh setoran CONFIRMED.
 * Dipakai sebagai tombol pemulihan manual dan oleh cron harian.
 */
adminRouter.get('/communities/:id/members/:memberId/installments', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    const memberId = idParam.parse(req.params.memberId);
    const pool = getPool();
    if (!(await communityOr404(res, communityId))) return undefined;
    const [[member]] = await pool.query(
      'SELECT id, name, phone_e164, rt FROM members WHERE id = ? AND community_id = ? LIMIT 1',
      [memberId, communityId],
    );
    if (!member) return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });

    const [installments] = await pool.query(
      `SELECT i.id, i.seq, i.amount, i.paid_amount, i.due_date, i.status,
              p.id AS package_id, p.name AS package_name
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
         JOIN packages p ON p.id = mp.package_id
        WHERE mp.member_id = ?
        ORDER BY p.due_date ASC, i.due_date ASC, i.seq ASC, i.id ASC`,
      [memberId],
    );

    return res.json({
      member: { id: member.id, name: member.name, phone: member.phone_e164, rt: member.rt ?? null },
      installments: installments.map((row) => ({
        id: Number(row.id),
        seq: Number(row.seq),
        amount: Number(row.amount),
        paidAmount: Number(row.paid_amount),
        dueDate: row.due_date,
        status: row.status,
        packageId: Number(row.package_id),
        packageName: row.package_name,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/communities/:id/members/:memberId/installments/stats', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    const memberId = idParam.parse(req.params.memberId);
    if (!(await communityOr404(res, communityId))) return undefined;
    const [installments] = await pool.query(
      `SELECT id, status FROM installments i
       JOIN member_packages mp ON mp.id = i.member_package_id
      WHERE mp.member_id = ?`,
      [memberId],
    );
    const total = installments.length;
    const lunas = installments.filter(i => i.status === 'PAID').length;
    const waived = installments.filter(i => i.status === 'WAIVED').length;
    return res.json({ total, lunas, waived });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/communities/:id/installments/reconcile', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;

    const result = await reconcileCommunityInstallments(communityId, {
      onError: (memberId, error) =>
        console.error(`[installments] anggota ${memberId} gagal direkonsiliasi:`, error),
    });

    emitCommunityUpdate(communityId, { type: 'installments.reconciled' });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// --------------------------------------------------------------------- members

/**
 * Menerima nomor telepon seperti yang biasa diketik orang:
 *   0812-3456-7890 · 0812 3456 7890 · +62 812 3456 7890 · 6281234567890
 * lalu menyimpannya dalam bentuk E.164 (+6281234567890).
 * Mengembalikan undefined bila kosong dan null bila tidak bisa dikenali.
 */
function normalizePhone(input) {
  if (input === undefined || input === null) return undefined;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('62')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^\d{7,13}$/.test(digits)) return null;
  return `+62${digits}`;
}

/** RT disimpan sebagai 2 digit ("3" -> "03", "003" -> "03"). */
function normalizeRt(input) {
  if (input === undefined || input === null) return undefined;
  const value = String(input).trim().replace(/^rt\s*/i, '');
  if (!value) return undefined;
  if (!/^\d{1,3}$/.test(value)) return null;
  return value.padStart(2, '0');
}

adminRouter.post('/communities/:id/members', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;

    const schema = z.object({
      name: z
        .string()
        .trim()
        .min(2, 'Nama anggota minimal 2 karakter.')
        .max(150, 'Nama anggota maksimal 150 karakter.'),
      phone: z.union([z.string().max(25), z.null()]).optional(),
      rt: z.union([z.string().max(8), z.number(), z.null()]).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const phone = normalizePhone(parsed.data.phone);
    if (phone === null) {
      return res.status(400).json({
        error: 'PHONE_INVALID',
        message: 'Nomor telepon tidak valid. Contoh: 0812-3456-7890 atau +62 812 3456 7890.',
      });
    }

    const rt = normalizeRt(parsed.data.rt);
    if (rt === null) {
      return res.status(400).json({
        error: 'RT_INVALID',
        message: 'Nomor RT tidak valid. Isi 1–3 angka, contoh: 03.',
      });
    }

    const [result] = await getPool().query(
      'INSERT INTO members (community_id, name, phone_e164, rt, status) VALUES (?, ?, ?, ?, ?)',
      [communityId, parsed.data.name, phone ?? null, rt ?? null, 'ACTIVE'],
    );

    emitCommunityUpdate(communityId, { type: 'member.created' });
    return res.status(201).json({
      member: { id: Number(result.insertId), name: parsed.data.name, phone, rt: rt ?? null },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'MEMBER_DUPLICATE' });
    return next(error);
  }
});

adminRouter.patch('/communities/:id/members/:memberId', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;
    const memberId = idParam.parse(req.params.memberId);

    const pool = getPool();
    const [[member]] = await pool.query(
      'SELECT id, name, phone_e164, rt FROM members WHERE id = ? AND community_id = ? LIMIT 1',
      [memberId, communityId],
    );
    if (!member) return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });

    const schema = z.object({
      name: z
        .string()
        .trim()
        .min(2, 'Nama anggota minimal 2 karakter.')
        .max(150, 'Nama anggota maksimal 150 karakter.')
        .optional(),
      phone: z.union([z.string().max(25), z.null()]).optional(),
      rt: z.union([z.string().max(8), z.number(), z.null()]).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const name = parsed.data.name ?? member.name;
    const phone =
      parsed.data.phone === undefined ? member.phone_e164 : normalizePhone(parsed.data.phone);
    if (phone === null) {
      return res.status(400).json({
        error: 'PHONE_INVALID',
        message: 'Nomor telepon tidak valid. Contoh: 0812-3456-7890 atau +62 812 3456 7890.',
      });
    }

    const rt = parsed.data.rt === undefined ? member.rt : normalizeRt(parsed.data.rt);
    if (rt === null) {
      return res.status(400).json({
        error: 'RT_INVALID',
        message: 'Nomor RT tidak valid. Isi 1–3 angka, contoh: 03.',
      });
    }

    await pool.query('UPDATE members SET name = ?, phone_e164 = ?, rt = ? WHERE id = ?', [
      name,
      phone ?? null,
      rt ?? null,
      memberId,
    ]);

    emitCommunityUpdate(communityId, { type: 'member.updated' });
    return res.json({
      member: { id: memberId, name, phone: phone ?? null, rt: rt ?? null },
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.delete('/communities/:id/members/:memberId', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;
    const memberId = idParam.parse(req.params.memberId);

    const pool = getPool();
    const [[member]] = await pool.query(
      'SELECT id, name FROM members WHERE id = ? AND community_id = ? LIMIT 1',
      [memberId, communityId],
    );
    if (!member) return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });

    const [[history]] = await pool.query(
      'SELECT COUNT(*) AS total FROM deposits WHERE member_id = ?',
      [memberId],
    );

    // Riwayat setoran tidak boleh dihapus (audit trail). Anggota yang sudah
    // pernah menyetor hanya dinonaktifkan, sehingga angka ledger tetap utuh.
    if (Number(history.total) > 0) {
      await pool.query("UPDATE members SET status = 'INACTIVE' WHERE id = ?", [memberId]);
      emitCommunityUpdate(communityId, { type: 'member.deactivated' });
      return res.json({
        mode: 'deactivated',
        name: member.name,
        message: 'Anggota punya riwayat setoran, jadi dinonaktifkan.',
      });
    }

    // Belum ada setoran: hapus tuntas beserta jadwal cicilan dan pengingatnya.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `DELETE i FROM installments i
           JOIN member_packages mp ON mp.id = i.member_package_id
          WHERE mp.member_id = ?`,
        [memberId],
      );
      await conn.query('DELETE FROM member_packages WHERE member_id = ?', [memberId]);
      await conn.query('DELETE FROM reminder_outbox WHERE member_id = ?', [memberId]);
      await conn.query('DELETE FROM public_tokens WHERE member_id = ?', [memberId]);
      await conn.query('DELETE FROM members WHERE id = ?', [memberId]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    emitCommunityUpdate(communityId, { type: 'member.deleted' });
    return res.json({ mode: 'deleted', name: member.name });
  } catch (error) {
    return next(error);
  }
});

// -------------------------------------------------------------------- packages

adminRouter.post('/communities/:id/packages', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;

    const schema = z.object({
      name: z.string().min(2).max(120),
      targetAmount: z.coerce.number().int().positive().max(1_000_000_000),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const { name, targetAmount, dueDate, frequency } = parsed.data;
    if (new Date(dueDate) <= new Date()) {
      return res.status(400).json({ error: 'DUE_DATE_IN_PAST' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO packages (community_id, name, target_amount, due_date, frequency) VALUES (?, ?, ?, ?, ?)',
      [communityId, name, targetAmount, dueDate, frequency],
    );
    const packageId = Number(result.insertId);

    // Semua anggota aktif otomatis diikutkan (D7: satu komunitas boleh multi paket).
    const [members] = await pool.query(
      "SELECT id FROM members WHERE community_id = ? AND status = 'ACTIVE'",
      [communityId],
    );
    const plan = buildInstallmentPlan({ targetAmount, dueDate, frequency });

    for (const member of members) {
      const [mp] = await pool.query(
        'INSERT INTO member_packages (member_id, package_id, status) VALUES (?, ?, ?)',
        [member.id, packageId, 'ACTIVE'],
      );
      for (const item of plan.schedule) {
        await pool.query(
          'INSERT INTO installments (member_package_id, seq, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
          [mp.insertId, item.seq, item.amount, item.dueDate, 'DUE'],
        );
      }
    }

    emitCommunityUpdate(communityId, { type: 'package.created' });
    return res.status(201).json({
      package: { id: packageId, name, targetAmount, dueDate, frequency },
      plan: { periods: plan.periods, regular: plan.regular, last: plan.last },
      enrolledMembers: members.length,
    });
  } catch (error) {
    return next(error);
  }
});

// -------------------------------------------------------------------- deposits

adminRouter.post('/deposits', write, async (req, res, next) => {
  try {
    const schema = z.object({
      communityId: z.coerce.number().int().positive(),
      memberId: z.coerce.number().int().positive(),
      packageId: z.coerce.number().int().positive().nullish(),
      amount: z.coerce.number().int().positive().max(1_000_000_000),
      method: z.enum(['CASH', 'TRANSFER', 'GATEWAY']).default('CASH'),
      occurredAt: z.string().optional(),
      idempotencyKey: z.string().min(6).max(120).optional(),
      note: z.string().max(255).optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const { communityId, memberId, packageId, amount, method, note } = parsed.data;
    const idempotencyKey = parsed.data.idempotencyKey ?? randomUUID();
    const occurredAtSql = parsed.data.occurredAt
      ? parsed.data.occurredAt.replace('T', ' ').slice(0, 19)
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    const pool = getPool();

    const [members] = await pool.query(
      'SELECT id FROM members WHERE id = ? AND community_id = ? LIMIT 1',
      [memberId, communityId],
    );
    if (!members[0]) return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });

    // Paket harus milik komunitas ini DAN anggota sudah terdaftar di paket itu,
    // supaya setoran tidak menjadi "uang menggantung" tanpa cicilan tujuan.
    if (packageId) {
      const [packages] = await pool.query(
        'SELECT id FROM packages WHERE id = ? AND community_id = ? LIMIT 1',
        [packageId, communityId],
      );
      if (!packages[0]) return res.status(404).json({ error: 'PACKAGE_NOT_FOUND' });

      const [enrolled] = await pool.query(
        'SELECT id FROM member_packages WHERE member_id = ? AND package_id = ? LIMIT 1',
        [memberId, packageId],
      );
      if (!enrolled[0]) {
        return res.status(400).json({
          error: 'PACKAGE_NOT_ENROLLED',
          message: 'Anggota belum terdaftar di paket itu.',
        });
      }
    }

    const [existing] = await pool.query(
      'SELECT id, amount, ledger_seq, status FROM deposits WHERE community_id = ? AND idempotency_key = ? LIMIT 1',
      [communityId, idempotencyKey],
    );
    if (existing[0]) {
      try {
        await reconcileMemberInstallmentsSafe(memberId);
      } catch (error) {
        console.error(`[installments] rekonsiliasi anggota ${memberId} gagal:`, error);
      }
      return res.json({
        idempotent: true,
        deposit: { id: Number(existing[0].id), amount: Number(existing[0].amount), status: existing[0].status },
        ledgerSeq: existing[0].ledger_seq ? Number(existing[0].ledger_seq) : null,
      });
    }

    const [depositResult] = await pool.query(
      `INSERT INTO deposits (community_id, member_id, package_id, amount, method, occurred_at, status, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
      [communityId, memberId, packageId ?? null, amount, method, occurredAtSql, idempotencyKey],
    );
    const depositId = Number(depositResult.insertId);

    let entry;
    try {
      entry = await appendEntry({
        communityId,
        entryType: 'DEPOSIT',
        memberId,
        amount,
        occurredAt: occurredAtSql,
        refType: 'deposit',
        refId: depositId,
        note: note ?? null,
      });
    } catch (error) {
      // Tabel deposits boleh dihapus; ledger tidak. Batalkan baris deposit
      // agar tidak ada setoran tanpa entri rantai.
      await pool.query('DELETE FROM deposits WHERE id = ?', [depositId]);
      throw error;
    }

    await pool.query('UPDATE deposits SET ledger_seq = ? WHERE id = ?', [entry.seq, depositId]);

    // Setoran langsung melunasi cicilan tertua anggota (paket terkait bila ada).
    try {
      await reconcileMemberInstallmentsSafe(memberId);
    } catch (error) {
      console.error(`[installments] rekonsiliasi anggota ${memberId} gagal:`, error);
    }

    emitCommunityUpdate(communityId, { type: 'deposit.created', seq: entry.seq, amount });

    return res.status(201).json({
      deposit: { id: depositId, amount, status: 'CONFIRMED', ledgerSeq: entry.seq },
      entry,
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/deposits/:id/correct', write, async (req, res, next) => {
  try {
    const depositId = idParam.parse(req.params.id);

    const schema = z.object({
      correctedAmount: z.coerce.number().int().positive().max(1_000_000_000),
      reason: z.string().min(10).max(255),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return badRequest(res, parsed.error.issues);

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, community_id, member_id, package_id, amount, occurred_at, status
         FROM deposits WHERE id = ? LIMIT 1`,
      [depositId],
    );
    const original = rows[0];
    if (!original) return res.status(404).json({ error: 'DEPOSIT_NOT_FOUND' });
    if (original.status !== 'CONFIRMED') return res.status(409).json({ error: 'DEPOSIT_NOT_CORRECTABLE' });

    const originalAmount = Number(original.amount);
    if (parsed.data.correctedAmount === originalAmount) {
      return res.status(400).json({ error: 'NO_CHANGE' });
    }

    const communityId = Number(original.community_id);
    const memberId = Number(original.member_id);

    const voidEntry = await appendEntry({
      communityId,
      entryType: 'VOID',
      memberId,
      amount: -originalAmount,
      refType: 'deposit_void',
      refId: depositId,
      note: `Koreksi: ${parsed.data.reason}`,
    });

    const [newDeposit] = await pool.query(
      `INSERT INTO deposits (community_id, member_id, package_id, amount, method, occurred_at, status, idempotency_key)
       VALUES (?, ?, ?, ?, 'TRANSFER', ?, 'CONFIRMED', ?)`,
      [
        communityId,
        memberId,
        original.package_id ?? null,
        parsed.data.correctedAmount,
        original.occurred_at,
        `correction-${depositId}-${Date.now()}`,
      ],
    );

    const newEntry = await appendEntry({
      communityId,
      entryType: 'DEPOSIT',
      memberId,
      amount: parsed.data.correctedAmount,
      occurredAt: original.occurred_at,
      refType: 'deposit',
      refId: Number(newDeposit.insertId),
      note: `Koreksi setoran #${depositId}: ${parsed.data.reason}`,
    });

    await pool.query("UPDATE deposits SET status = 'VOIDED' WHERE id = ?", [depositId]);
    await pool.query('UPDATE deposits SET ledger_seq = ? WHERE id = ?', [newEntry.seq, newDeposit.insertId]);

    // Hitung ulang dari seluruh setoran CONFIRMED: yang lama sudah VOIDED,
    // setoran koreksi otomatis menggantikannya.
    try {
      await reconcileMemberInstallmentsSafe(memberId);
    } catch (error) {
      console.error(`[installments] rekonsiliasi anggota ${memberId} gagal:`, error);
    }

    emitCommunityUpdate(communityId, { type: 'deposit.corrected', seq: newEntry.seq });

    return res.json({
      voidEntry,
      newEntry,
      newDepositId: Number(newDeposit.insertId),
      originalAmount,
      correctedAmount: parsed.data.correctedAmount,
    });
  } catch (error) {
    return next(error);
  }
});

// --------------------------------------------------------------- hapus paket

/** Hanya untuk paket yang belum punya setoran terkonfirmasi (mis. salah buat). */
adminRouter.delete('/packages/:id', write, async (req, res, next) => {
  try {
    const packageId = idParam.parse(req.params.id);
    const pool = getPool();

    const [[confirmed]] = await pool.query(
      "SELECT COUNT(*) AS total FROM deposits WHERE package_id = ? AND status = 'CONFIRMED'",
      [packageId],
    );
    if (Number(confirmed.total) > 0) {
      return res.status(409).json({ error: 'PACKAGE_HAS_DEPOSITS' });
    }

    await pool.query('UPDATE deposits SET package_id = NULL WHERE package_id = ?', [packageId]);
    await pool.query(
      'DELETE i FROM installments i JOIN member_packages mp ON mp.id = i.member_package_id WHERE mp.package_id = ?',
      [packageId],
    );
    await pool.query('DELETE FROM member_packages WHERE package_id = ?', [packageId]);
    const [result] = await pool.query('DELETE FROM packages WHERE id = ?', [packageId]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'PACKAGE_NOT_FOUND' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// ------------------------------------------------------------- public token

/** Token mentah hanya dikembalikan sekali; database menyimpan SHA-256-nya saja. */
async function mintPublicToken({ communityId, memberId = null, scope }) {
  const raw = randomBytes(32).toString('base64url');
  await getPool().query(
    'INSERT INTO public_tokens (community_id, member_id, token_hash, scope) VALUES (?, ?, ?, ?)',
    [communityId, memberId, hashToken(raw), scope],
  );
  return { token: raw, url: `/s/${raw}` };
}

adminRouter.post('/communities/:id/public-token', linkWrite, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;

    const { token, url } = await mintPublicToken({ communityId, scope: 'COMMUNITY' });
    return res.status(201).json({ token, url });
  } catch (error) {
    return next(error);
  }
});

/** Tautan pribadi: portal hanya menampilkan posisi dan mutasi satu anggota. */
adminRouter.post(
  '/communities/:id/members/:memberId/public-token',
  linkWrite,
  async (req, res, next) => {
    try {
      const communityId = idParam.parse(req.params.id);
      const memberId = idParam.parse(req.params.memberId);
      if (!(await communityOr404(res, communityId))) return undefined;

      const [rows] = await getPool().query(
        'SELECT id, name FROM members WHERE id = ? AND community_id = ? LIMIT 1',
        [memberId, communityId],
      );
      if (!rows[0]) return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });

      const { token, url } = await mintPublicToken({ communityId, memberId, scope: 'MEMBER' });
      return res.status(201).json({ token, url, member: { id: memberId, name: rows[0].name } });
    } catch (error) {
      return next(error);
    }
  },
);

// ---------------------------------------------------------------- reminders

adminRouter.get('/communities/:id/reminders', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);

    const [rows] = await getPool().query(
      `SELECT ro.id, ro.template_key, ro.status, ro.scheduled_date, ro.sent_at, ro.provider_ref,
              m.name AS member_name
         FROM reminder_outbox ro
         JOIN members m ON m.id = ro.member_id
        WHERE m.community_id = ?
        ORDER BY ro.id DESC
        LIMIT 50`,
      [communityId],
    );

    return res.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        memberName: row.member_name,
        templateKey: row.template_key,
        status: row.status,
        scheduledDate: row.scheduled_date,
        sentAt: row.sent_at,
        providerRef: row.provider_ref,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/communities/:id/reminders/run', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    if (!(await communityOr404(res, communityId))) return undefined;

    const pool = getPool();
    const [due] = await pool.query(
      `SELECT m.id AS member_id, m.name, m.phone_e164,
              COUNT(*) AS installments, SUM(i.amount - i.paid_amount) AS amount, MIN(i.due_date) AS first_due
         FROM installments i
         JOIN member_packages mp ON mp.id = i.member_package_id
         JOIN members m ON m.id = mp.member_id
        WHERE m.community_id = ?
          AND m.status = 'ACTIVE'
          AND i.status = 'DUE'
          AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
          AND i.paid_amount < i.amount
        GROUP BY m.id, m.name, m.phone_e164`,
      [communityId],
    );

    const today = new Date().toISOString().slice(0, 10);
    let queued = 0;
    let sent = 0;

    for (const row of due) {
      const [insert] = await pool.query(
        `INSERT IGNORE INTO reminder_outbox (member_id, template_key, payload_json, status, scheduled_date)
         VALUES (?, 'installment_due', ?, 'QUEUED', ?)`,
        [
          row.member_id,
          JSON.stringify({ amount: Number(row.amount), installments: Number(row.installments) }),
          today,
        ],
      );

      if (insert.affectedRows === 0) continue; // sudah pernah dikirim hari ini
      queued += 1;

      const result = await waProvider.sendMessage({
        to: row.phone_e164 ?? `member-${row.member_id}`,
        templateKey: 'installment_due',
        params: {
          name: row.name,
          amount: Number(row.amount),
          installments: Number(row.installments),
          due: row.first_due,
        },
      });

      await pool.query(
        "UPDATE reminder_outbox SET status = 'SENT', sent_at = UTC_TIMESTAMP(), provider_ref = ? WHERE member_id = ? AND template_key = 'installment_due' AND scheduled_date = ?",
        [result.providerRef, row.member_id, today],
      );
      sent += 1;
    }

    return res.json({ queued, sent, provider: waProvider.name, candidates: due.length });
  } catch (error) {
    return next(error);
  }
});

// ------------------------------------------------------------------- reports

adminRouter.get('/communities/:id/arrears.csv', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    const summary = await buildCommunitySummary(communityId);
    if (!summary) return res.status(404).json({ error: 'COMMUNITY_NOT_FOUND' });

    const header = 'nama;rt;telepon;total_setoran;cicilan_tertunggak\n';
    const body = summary.members
      .map((member) =>
        [member.name, member.rt ?? '', member.phone ?? '', member.total, member.arrears].join(';'),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tunggakan-${communityId}.csv"`);
    return res.send(header + body);
  } catch (error) {
    return next(error);
  }
});

adminRouter.get('/communities/:id/verify', read, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    return res.json(await verifyChain(communityId));
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/communities/:id/anchor', write, async (req, res, next) => {
  try {
    const communityId = idParam.parse(req.params.id);
    const result = await verifyChain(communityId);
    if (!result.ok) return res.status(409).json({ error: 'CHAIN_INVALID', verify: result });

    const today = new Date().toISOString().slice(0, 10);
    const pool = getPool();

    // Tabel anchor bersifat append-only (trigger menolak UPDATE), jadi anchor
    // hari yang sama tidak bisa ditimpa — cukup kembalikan yang sudah ada.
    const [existing] = await pool.query(
      'SELECT anchor_date, total_entries, root_hash FROM ledger_anchors WHERE community_id = ? AND anchor_date = ? LIMIT 1',
      [communityId, today],
    );

    if (existing[0]) {
      return res.json({
        anchorDate: existing[0].anchor_date,
        totalEntries: Number(existing[0].total_entries),
        rootHash: existing[0].root_hash,
        existing: true,
        currentEntries: result.totalEntries,
      });
    }

    await pool.query(
      'INSERT INTO ledger_anchors (community_id, anchor_date, total_entries, root_hash) VALUES (?, ?, ?, ?)',
      [communityId, today, result.totalEntries, result.rootHash],
    );

    return res.status(201).json({ anchorDate: today, totalEntries: result.totalEntries, rootHash: result.rootHash });
  } catch (error) {
    return next(error);
  }
});
