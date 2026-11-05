import cron from 'node-cron';
import { config } from '../config.js';
import { getPool } from '../db.js';
import { waProvider } from '../integrations/whatsapp/index.js';
import { verifyChain } from '../services/ledger.js';

async function reminderSweep() {
  const pool = getPool();

  const [due] = await pool.query(
    `SELECT m.id AS member_id, m.name, m.phone_e164, m.community_id,
            COUNT(*) AS installments, SUM(i.amount - i.paid_amount) AS amount, MIN(i.due_date) AS first_due
       FROM installments i
       JOIN member_packages mp ON mp.id = i.member_package_id
       JOIN members m ON m.id = mp.member_id
      WHERE m.status = 'ACTIVE'
        AND i.status = 'DUE'
        AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND i.paid_amount < i.amount
      GROUP BY m.id, m.name, m.phone_e164, m.community_id`,
  );

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;

  for (const row of due) {
    const [insert] = await pool.query(
      `INSERT IGNORE INTO reminder_outbox (member_id, template_key, payload_json, status, scheduled_date)
       VALUES (?, 'installment_due', ?, 'QUEUED', ?)`,
      [row.member_id, JSON.stringify({ amount: Number(row.amount) }), today],
    );
    if (insert.affectedRows === 0) continue;

    const result = await waProvider.sendMessage({
      to: row.phone_e164 ?? `member-${row.member_id}`,
      templateKey: 'installment_due',
      params: { name: row.name, amount: Number(row.amount), due: row.first_due },
    });

    await pool.query(
      "UPDATE reminder_outbox SET status = 'SENT', sent_at = UTC_TIMESTAMP(), provider_ref = ? WHERE member_id = ? AND template_key = 'installment_due' AND scheduled_date = ?",
      [result.providerRef, row.member_id, today],
    );
    sent += 1;
  }

  console.log(`[cron] pengingat terkirim (dummy): ${sent}`);
}

/** Ancor harian (FR-11): root hash + jumlah entri per komunitas, agar penulisan ulang massal terdeteksi. */
async function dailyAnchor() {
  const pool = getPool();
  const [communities] = await pool.query("SELECT id FROM communities WHERE status = 'ACTIVE'");
  const today = new Date().toISOString().slice(0, 10);

  for (const row of communities) {
    const verify = await verifyChain(Number(row.id));
    if (!verify.ok) {
      console.warn(`[cron] rantai komunitas ${row.id} INVALID: ${verify.reason} @ seq ${verify.firstBrokenSeq}`);
      continue;
    }
    // INSERT IGNORE, bukan ON DUPLICATE KEY UPDATE: trigger append-only menolak
    // UPDATE, dan anchor hari yang sama sengaja tidak ditimpa.
    await pool.query(
      'INSERT IGNORE INTO ledger_anchors (community_id, anchor_date, total_entries, root_hash) VALUES (?, ?, ?, ?)',
      [row.id, today, verify.totalEntries, verify.rootHash],
    );
  }

  console.log(`[cron] anchor harian dibuat untuk ${communities.length} komunitas`);
}

export function startReminderJob() {
  if (!config.ENABLE_CRON) {
    console.log('[cron] nonaktif (ENABLE_CRON=false)');
    return null;
  }

  const reminder = cron.schedule(
    '0 8 * * *',
    () => reminderSweep().catch((error) => console.error('[cron] gagal sweep pengingat:', error)),
    { timezone: 'Asia/Jakarta' },
  );

  const anchor = cron.schedule(
    '59 23 * * *',
    () => dailyAnchor().catch((error) => console.error('[cron] gagal anchor harian:', error)),
    { timezone: 'Asia/Jakarta' },
  );

  console.log('[cron] aktif: pengingat 08:00, anchor 23:59 (Asia/Jakarta)');
  return { reminder, anchor };
}
