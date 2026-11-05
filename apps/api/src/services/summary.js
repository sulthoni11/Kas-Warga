import { getPool } from '../db.js';

/**
 * Ringkasan komunitas untuk dashboard admin maupun publik (FR-06, D7).
 * Sumber angka "terkumpul" adalah LEDGER (bukan tabel deposits), sehingga
 * entri pembalik otomatis mengurangi total.
 */
export async function buildCommunitySummary(communityId) {
  const pool = getPool();

  const [[community]] = await pool.query(
    `SELECT id, name, slug, period_start, period_end, status
       FROM communities WHERE id = ? LIMIT 1`,
    [communityId],
  );

  if (!community) return null;

  const [[totals]] = await pool.query(
    `SELECT
        COALESCE(SUM(le.amount), 0) AS collected,
        COUNT(le.id) AS entries
       FROM ledger_entries le
      WHERE le.community_id = ?`,
    [communityId],
  );

  const [[target]] = await pool.query(
    'SELECT COALESCE(SUM(target_amount), 0) AS target FROM packages WHERE community_id = ?',
    [communityId],
  );

  const [[memberCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM members WHERE community_id = ? AND status = 'ACTIVE'",
    [communityId],
  );

  const [[depositCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM deposits WHERE community_id = ? AND status = 'CONFIRMED'",
    [communityId],
  );

  const [packages] = await pool.query(
    `SELECT p.id, p.name, p.target_amount, p.due_date, p.frequency,
            COALESCE(SUM(CASE WHEN d.status = 'CONFIRMED' THEN d.amount ELSE 0 END), 0) AS collected
       FROM packages p
       LEFT JOIN deposits d ON d.package_id = p.id
      WHERE p.community_id = ?
      GROUP BY p.id, p.name, p.target_amount, p.due_date, p.frequency
      ORDER BY p.due_date ASC`,
    [communityId],
  );

  const [recentEntries] = await pool.query(
    `SELECT le.seq, le.entry_type, le.amount, le.occurred_at, le.note,
            le.ref_type, le.ref_id, m.name AS member_name, m.rt AS member_rt,
            d.status AS deposit_status
       FROM ledger_entries le
       LEFT JOIN members m ON m.id = le.member_id
       LEFT JOIN deposits d ON d.id = le.ref_id AND le.ref_type = 'deposit'
      WHERE le.community_id = ?
      ORDER BY le.seq DESC
      LIMIT 20`,
    [communityId],
  );

  const [arrearsRows] = await pool.query(
    `SELECT mp.member_id, p.id AS package_id, p.name AS package_name,
            COUNT(*) AS installments,
            COALESCE(SUM(i.amount - i.paid_amount), 0) AS amount,
            MIN(i.due_date) AS first_due
       FROM installments i
       JOIN member_packages mp ON mp.id = i.member_package_id
       JOIN packages p ON p.id = mp.package_id
       JOIN members m ON m.id = mp.member_id
      WHERE m.community_id = ?
        AND m.status = 'ACTIVE'
        AND i.status = 'DUE'
        AND i.due_date <= CURDATE()
        AND i.paid_amount < i.amount
      GROUP BY mp.member_id, p.id, p.name
      ORDER BY first_due ASC, p.name ASC`,
    [communityId],
  );

  const arrearsByMember = new Map();
  for (const row of arrearsRows) {
    const key = Number(row.member_id);
    const list = arrearsByMember.get(key) ?? [];
    list.push({
      packageId: Number(row.package_id),
      packageName: row.package_name,
      installments: Number(row.installments),
      amount: Number(row.amount),
      firstDueDate: row.first_due,
    });
    arrearsByMember.set(key, list);
  }

  const [members] = await pool.query(
    `SELECT m.id, m.name, m.phone_e164, m.rt, m.status,
            COALESCE((SELECT SUM(le.amount) FROM ledger_entries le
                       WHERE le.member_id = m.id AND le.community_id = m.community_id), 0) AS total
       FROM members m
      WHERE m.community_id = ?
        AND m.status = 'ACTIVE'
      ORDER BY m.name ASC`,
    [communityId],
  );

  const memberRows = members.map((row) => {
    const arrearsDetail = arrearsByMember.get(Number(row.id)) ?? [];
    return {
      id: Number(row.id),
      name: row.name,
      phone: row.phone_e164,
      rt: row.rt ?? null,
      status: row.status,
      total: Number(row.total),
      arrears: arrearsDetail.reduce((total, item) => total + item.installments, 0),
      arrearsDetail,
    };
  });

  return {
    rtSummary: buildRtSummary(memberRows),
    community: {
      id: Number(community.id),
      name: community.name,
      slug: community.slug,
      periodStart: community.period_start,
      periodEnd: community.period_end,
      status: community.status,
    },
    totals: {
      collected: Number(totals.collected),
      target: Number(target.target),
      entries: Number(totals.entries),
      members: Number(memberCount.total),
      confirmedDeposits: Number(depositCount.total),
    },
    packages: packages.map((row) => ({
      id: Number(row.id),
      name: row.name,
      targetAmount: Number(row.target_amount),
      collected: Number(row.collected),
      dueDate: row.due_date,
      frequency: row.frequency,
    })),
    members: memberRows,
    recentEntries: recentEntries.map((row) => ({
      seq: Number(row.seq),
      entryType: row.entry_type,
      amount: Number(row.amount),
      occurredAt: row.occurred_at,
      note: row.note,
      memberName: row.member_name,
      memberRt: row.member_rt ?? null,
      refType: row.ref_type,
      refId: row.ref_id === null ? null : Number(row.ref_id),
      depositStatus: row.deposit_status,
    })),
  };
}

/** Jadwal cicilan: pembulatan ke atas per 1.000, sisa dibebankan ke periode terakhir (FR-03). */
/** Rekap per RT dari daftar anggota aktif — tanpa query tambahan. */
function buildRtSummary(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = row.rt || 'NONE';
    const group = groups.get(key) ?? {
      rt: row.rt || null,
      members: 0,
      collected: 0,
      arrears: 0,
      arrearsByPackage: new Map(),
    };
    group.members += 1;
    group.collected += Number(row.total);
    group.arrears += Number(row.arrears);

    for (const item of row.arrearsDetail ?? []) {
      const existing = group.arrearsByPackage.get(item.packageId) ?? {
        packageId: item.packageId,
        packageName: item.packageName,
        installments: 0,
        amount: 0,
        firstDueDate: item.firstDueDate,
      };
      existing.installments += item.installments;
      existing.amount += item.amount;
      if (item.firstDueDate < existing.firstDueDate) {
        existing.firstDueDate = item.firstDueDate;
      }
      group.arrearsByPackage.set(item.packageId, existing);
    }

    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      rt: group.rt,
      members: group.members,
      collected: group.collected,
      arrears: group.arrears,
      arrearsDetail: [...group.arrearsByPackage.values()].sort(
        (a, b) =>
          a.firstDueDate.localeCompare(b.firstDueDate) ||
          a.packageName.localeCompare(b.packageName, 'id'),
      ),
    }))
    .sort((a, b) => String(a.rt ?? 'zz').localeCompare(String(b.rt ?? 'zz'), 'id'));
}

/** Tambah satu bulan dengan pengaman akhir bulan (31 Jan -> 28/29 Feb). */
function addMonthUtc(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const firstOfNext = new Date(Date.UTC(year, month + 1, 1));
  const lastDay = new Date(
    Date.UTC(firstOfNext.getUTCFullYear(), firstOfNext.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(firstOfNext.getUTCFullYear(), firstOfNext.getUTCMonth(), Math.min(day, lastDay)),
  );
}

export function buildInstallmentPlan({ targetAmount, dueDate, frequency }) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  const end = new Date(`${dueDate}T00:00:00Z`);
  const startUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const dates = [];
  if (frequency === 'MONTHLY') {
    let cursor = new Date(startUtc);
    while (dates.length < 600) {
      cursor = addMonthUtc(cursor);
      if (cursor.getTime() > endUtc) break;
      dates.push(new Date(cursor));
    }
  } else {
    const stepDays = frequency === 'DAILY' ? 1 : 7;
    for (let time = startUtc + stepDays * MS_PER_DAY; time <= endUtc; time += stepDays * MS_PER_DAY) {
      dates.push(new Date(time));
    }
  }

  // Jatuh tempo terlalu dekat untuk frekuensi yang dipilih: minimal satu cicilan.
  if (dates.length === 0) dates.push(new Date(endUtc));

  const periods = dates.length;
  let regular = Math.ceil(targetAmount / periods / 1000) * 1000;
  if (regular * (periods - 1) >= targetAmount) regular = Math.ceil(targetAmount / periods);
  const last = targetAmount - regular * (periods - 1);

  const schedule = dates.map((date, index) => ({
    seq: index + 1,
    amount: index === periods - 1 ? last : regular,
    dueDate: date.toISOString().slice(0, 10),
  }));

  return { periods, regular, last, schedule };
}
