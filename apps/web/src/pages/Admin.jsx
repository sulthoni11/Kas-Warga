import { useCallback, useEffect, useState } from 'react';
import { api, rupiah, formatDateTime } from '../lib/api.js';
import SearchSelect from '../components/SearchSelect.jsx';

const DEMO_EMAIL = 'bendahara@gmail.com';
const DEMO_PASSWORD = '12345678';

// Satu komunitas saja: tidak ada dropdown pemilihan komunitas.
const COMMUNITY_SLUG = 'r2-09-dukuh-tlobong';
const FREQUENCY_LABEL = {
  DAILY: 'harian',
  WEEKLY: 'mingguan',
  MONTHLY: 'bulanan',
};
const COMMUNITY_NAME = 'R2 09 Dukuh Tlobong';
const PACKAGES = [
  { name: 'Tabungan Qurban', targetAmount: 2_400_000, frequency: 'WEEKLY', daysAhead: 210 },
  { name: 'Sembako Harian', targetAmount: 500_000, frequency: 'DAILY', daysAhead: 30 },
  { name: 'Kas RT', targetAmount: 0, frequency: 'DAILY', daysAhead: 30 },
];

/** Penjelasan peran yang ditampilkan di header, supaya bedanya terlihat. */
const ROLE_INFO = {
  BENDAHARA: {
    label: 'Bendahara — pencatat',
    desc: 'boleh mencatat setoran, koreksi, anggota, paket, dan menjalankan pengingat',
  },
  KETUA: {
    label: 'Ketua — pengawas (baca-saja)',
    desc: 'hanya melihat, memverifikasi rantai, dan mengunduh laporan',
  },
  SUPER_ADMIN: {
    label: 'Super Admin — pengelola',
    desc: 'sama seperti bendahara, ditambah kelola akun pengurus',
  },
};

/** Menerjemahkan error API menjadi kalimat yang bisa dimengerti pengguna. */
function describeError(err) {
  const issue = err?.data?.issues?.[0];
  const field = issue?.path?.[0];

  if (err?.data?.error === 'PHONE_INVALID') {
    return 'Nomor telepon tidak valid. Contoh: 0812-3456-7890 atau +62 812 3456 7890.';
  }
  if (field === 'name') return 'Nama minimal 2 karakter.';
  if (field === 'phone') {
    return 'Nomor telepon tidak valid. Contoh: 0812-3456-7890 atau +62 812 3456 7890.';
  }
  if (err?.data?.error === 'RT_INVALID' || field === 'rt') {
    return 'Nomor RT tidak valid. Isi 1–3 angka, contoh: 03.';
  }
  if (field === 'targetAmount') return 'Target dana minimal Rp10.000.';
  if (field === 'dueDate') return 'Tanggal jatuh tempo wajib diisi (format YYYY-MM-DD).';
  if (err?.data?.error === 'DUE_DATE_IN_PAST') {
    return 'Tanggal jatuh tempo harus di masa depan.';
  }
  if (err?.data?.error === 'ACCOUNT_LOCKED') {
    return 'Akun terkunci sementara karena percobaan login gagal berulang.';
  }
  if (err?.data?.error === 'INVALID_CREDENTIALS') {
    return 'Email atau password salah.';
  }
  if (err?.status === 403) return 'Peran Anda tidak punya izin untuk tindakan ini.';
  if (err?.message === 'Failed to fetch') {
    return 'Tidak dapat menghubungi server. Pastikan API berjalan di port 4000.';
  }
  return err?.message ?? 'Terjadi kesalahan.';
}

/** Ringkasan tunggakan per paket untuk tooltip dan daftar rinci. */
function arrearsSummary(row) {
  const detail = row.arrearsDetail ?? [];
  if (detail.length === 0) {
    return row.arrears > 0 ? `${row.arrears} cicilan belum dibayar.` : 'Tidak ada tunggakan.';
  }
  return detail
    .map(
      (item) =>
        `${item.packageName}: ${item.installments} cicilan (${rupiah(item.amount)}), jatuh tempo ${formatDateTime(item.firstDueDate)}`,
    )
    .join('; ');
}

function Card({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
      <p className="text-xs uppercase tracking-wide text-sage-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-sage-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-sage-500">{hint}</p>}
    </div>
  );
}

function LoginCard({ onDone }) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onDone(data.user);
    } catch (err) {
      setError(
        err.data?.error === 'ACCOUNT_LOCKED'
          ? 'Akun terkunci 15 menit setelah 5 percobaan gagal.'
          : err.data?.error === 'INVALID_CREDENTIALS'
            ? 'Email atau password salah.'
            : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 sm:px-6">
      <h1 className="text-2xl font-semibold text-sage-900">Masuk sebagai pengurus</h1>
      <p className="mt-2 text-sm text-sage-700">
        Akun pengurus: <code className="rounded bg-sage-50 px-1">{DEMO_EMAIL}</code> /{' '}
        <code className="rounded bg-sage-50 px-1">{DEMO_PASSWORD}</code>
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-sage-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-sage-100 bg-white px-3 py-2 text-sage-900"
            required
          />
        </label>
        <label className="block text-sm font-medium text-sage-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-sage-100 bg-white px-3 py-2 text-sage-900"
            required
          />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-sage-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [communityId, setCommunityId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [verify, setVerify] = useState(null);
  const [publicUrl, setPublicUrl] = useState(null);
  const [users, setUsers] = useState([]);
  const [entryQuery, setEntryQuery] = useState('');
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [memberRt, setMemberRt] = useState('ALL');
  const [expandedArrears, setExpandedArrears] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const canWrite = user?.role === 'BENDAHARA' || user?.role === 'SUPER_ADMIN';

  // Notifikasi sukses hilang sendiri setelah 5 detik; pesan error tetap
  // sampai ditutup supaya tidak ada kegagalan yang terlewat.
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const loadCommunity = useCallback(async (id) => {
    if (!id) return;
    const [summaryData, verifyData, reminderData] = await Promise.all([
      api(`/api/admin/communities/${id}/summary`),
      api(`/api/admin/communities/${id}/verify`),
      api(`/api/admin/communities/${id}/reminders`),
    ]);
    setSummary(summaryData);
    setVerify(verifyData);
    setReminders(reminderData.items);
    setEntries(summaryData.recentEntries);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await api('/api/auth/me');
        setUser(me.user);
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await api('/api/admin/bootstrap');
        const fixed =
          data.communities.find((community) => community.slug === COMMUNITY_SLUG) ??
          data.communities.find((community) => !String(community.slug).startsWith('test-'));
        if (!fixed) {
          setError('Komunitas belum ada. Jalankan: node apps/api/scripts/seed.js');
          return;
        }
        setCommunityId(fixed.id);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [user]);

  useEffect(() => {
    loadCommunity(communityId).catch((err) => setError(err.message));
  }, [communityId, loadCommunity]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    api('/api/admin/users')
      .then((data) => setUsers(data.items))
      .catch((err) => setError(err.message));
  }, [user]);

  async function runAction(label, action) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      setMessage(typeof result === 'string' ? result : `${label} berhasil.`);
      if (communityId) await loadCommunity(communityId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return <main className="p-10 text-sage-700">Memuat…</main>;
  }

  if (!user) {
    return <LoginCard onDone={setUser} />;
  }

  const collected = summary?.totals.collected ?? 0;
  const target = summary?.totals.target ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
  const memberNeedle = memberQuery.trim().toLowerCase();
  const allMembers = summary?.members ?? [];
  const rtOptions = [
    { value: 'ALL', label: 'Semua RT' },
    ...(summary?.rtSummary ?? []).map((group) => ({
      value: group.rt ?? 'NONE',
      label: group.rt ? `RT ${group.rt}` : 'Belum diisi RT',
      hint: `${group.members} anggota`,
    })),
  ];
  const visibleMembers = allMembers.filter((member) => {
    if (memberFilter === 'ARREARS' && !(member.arrears > 0)) return false;
    if (memberRt !== 'ALL' && (member.rt ?? 'NONE') !== memberRt) return false;
    return !memberNeedle || member.name.toLowerCase().includes(memberNeedle);
  });
  const entryNeedle = entryQuery.trim().toLowerCase();
  const filteredEntries = entryNeedle
    ? entries.filter((entry) => (entry.memberName ?? '').toLowerCase().includes(entryNeedle))
    : entries;
  const ENTRY_PREVIEW = 5;
  const visibleEntries = showAllEntries ? filteredEntries : filteredEntries.slice(0, ENTRY_PREVIEW);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-500">
            Panel pengurus
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-sage-900">
            {summary?.community.name ?? 'Memuat komunitas…'}
          </h1>
          <p className="mt-1 text-sm text-sage-700">
            {user.email} ·{' '}
            <span className="font-medium">{ROLE_INFO[user.role]?.label ?? user.role}</span>
          </p>
          <p className="mt-0.5 text-xs text-sage-500">{ROLE_INFO[user.role]?.desc}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="min-w-0 flex-1 truncate rounded-xl border border-sage-300 bg-white px-3 py-2 text-center text-sm font-medium text-sage-900 sm:flex-none sm:text-left">
            {COMMUNITY_NAME}
          </span>
          <button
            type="button"
            onClick={async () => {
              await api('/api/auth/logout', { method: 'POST' });
              setUser(null);
            }}
            className="rounded-xl border border-sage-300 px-3 py-2 text-sm text-sage-700"
          >
            Keluar
          </button>
        </div>
      </header>

      {user.role === 'KETUA' && (
        <p className="mt-4 rounded-xl border border-gold/40 bg-white/80 px-3 py-2 text-sm text-sage-700">
          Anda masuk sebagai <strong>pengawas</strong>: semua data bisa dilihat, verifikasi rantai dan
          ekspor CSV tersedia, tetapi pencatatan dan koreksi dinonaktifkan.
        </p>
      )}

      {(message || error) && (
        <div
          className={`sticky top-2 z-40 mt-4 flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm shadow-sm ${
            error ? 'bg-red-50 text-red-700' : 'bg-sage-100 text-sage-900'
          }`}
        >
          <span>{error ?? message}</span>
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={() => {
              setMessage(null);
              setError(null);
            }}
            className="shrink-0 rounded px-1 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Terkumpul" value={rupiah(collected)} hint={`${percent}% dari target`} />
        <Card title="Target" value={rupiah(target)} hint={`${summary?.packages.length ?? 0} paket aktif`} />
        <Card title="Anggota aktif" value={summary?.totals.members ?? 0} />
        <Card title="Entri ledger" value={summary?.totals.entries ?? 0} hint="hanya bisa ditambah" />
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sage-100 bg-white/70 p-4 text-sm">
        <span className="font-medium text-sage-900">Integritas rantai:</span>
        {verify ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              verify.ok ? 'bg-sage-100 text-sage-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {verify.ok
              ? `SAH · ${verify.totalEntries} entri`
              : `TIDAK SAH · ${verify.reason} pada entri #${verify.firstBrokenSeq}`}
          </span>
        ) : (
          <span className="text-sage-500">—</span>
        )}
        {verify?.rootHash && (
          <code className="truncate rounded bg-sage-50 px-2 py-0.5 text-[11px] text-sage-700">
            kode {verify.rootHash.slice(0, 24)}…
          </code>
        )}
        <button
          type="button"
          onClick={() =>
            runAction('Buat link publik', async () => {
              const data = await api(`/api/admin/communities/${communityId}/public-token`, {
                method: 'POST',
              });
              setPublicUrl(`${window.location.origin}${data.url}`);
              return 'Link publik dibuat (token hanya ditampilkan sekali di sini).';
            })
          }
          disabled={!canWrite || busy}
          className="ml-auto rounded-xl bg-sage-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Buat link publik
        </button>
      </section>

      {publicUrl && (
        <div className="mt-3 rounded-xl bg-sage-50 px-3 py-2 text-xs text-sage-700">
          <p className="break-all">{publicUrl}</p>
          <div className="mt-2 flex items-center gap-3">
            <a href={publicUrl} className="font-medium underline" target="_blank" rel="noreferrer">
              buka di tab baru
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicUrl);
                  setMessage('Tautan disalin. Tempel utuh ke WhatsApp/browser.');
                } catch {
                  setError('Browser memblokir clipboard — salin manual dari kotak di atas.');
                }
              }}
              className="rounded-lg border border-sage-300 px-2 py-0.5 font-medium"
            >
              salin tautan
            </button>
            <span className="text-sage-500">token hanya tampil sekali di sini</span>
          </div>
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <h2 className="text-sm font-semibold text-sage-900">Catat setoran</h2>
          <p className="mt-1 text-xs text-sage-500">
            Setiap setoran langsung menulis satu entri ke ledger, melunasi cicilan tertua, dan
            tampil di portal warga.
          </p>
          {canWrite && (
            <p className="mt-2 rounded-xl bg-sage-50 px-3 py-2 text-xs text-sage-700">
              Warga bisa membayar lewat transfer atau QRIS tanpa masuk aplikasi. Bacalah{' '}
              <a href="/bayar" className="underline">cara bayar</a>, lalu urus setoran di sini setelah uang
              masuk.
            </p>
          )}
          <DepositForm
            members={summary?.members ?? []}
            packages={summary?.packages ?? []}
            disabled={!canWrite || busy}
            onSubmit={(payload) =>
              runAction('Catat setoran', async () => {
                const data = await api('/api/admin/deposits', {
                  method: 'POST',
                  body: JSON.stringify({ ...payload, communityId }),
                });
                return `Setoran ${rupiah(data.deposit.amount)} tercatat pada entri #${data.deposit.ledgerSeq}; cicilan tertua ikut dilunasi.`;
              })
            }
          />
          {!canWrite && (
            <p className="mt-3 text-xs text-sage-500">
              Peran {user.role} bersifat baca-saja (pemisahan tugas).
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <h2 className="text-sm font-semibold text-sage-900">Pengingat WhatsApp</h2>
          <p className="mt-1 text-xs text-sage-500">
            Pengiriman otomatis lewat WhatsApp Business API sedang disiapkan. Saat ini setiap pesan
            dicatat di log server agar isinya bisa diperiksa.
          </p>
          <button
            type="button"
            onClick={() =>
              runAction('Jalankan pengingat', async () => {
                const data = await api(`/api/admin/communities/${communityId}/reminders/run`, {
                  method: 'POST',
                });
                return `Pengingat: ${data.sent} terkirim, ${data.candidates} kandidat jatuh tempo ≤ 3 hari.`;
              })
            }
            disabled={!canWrite || busy}
            className="mt-3 rounded-xl bg-sage-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Jalankan sekarang
          </button>
          <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-xs">
            {reminders.length === 0 && <li className="text-sage-500">Belum ada pengingat.</li>}
            {reminders.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sage-700">{item.memberName}</span>
                <span className={item.status === 'SENT' ? 'text-sage-500' : 'text-red-600'}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-sage-100 bg-white/70 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-sage-900">
            Mutasi terbaru{' '}
            <span className="font-normal text-sage-500">({filteredEntries.length})</span>
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={entryQuery}
              onChange={(event) => setEntryQuery(event.target.value)}
              placeholder="Cari nama anggota…"
              className="w-full rounded-xl border border-sage-300 bg-white px-3 py-1.5 text-xs sm:w-44"
            />
            <a
              href={`/api/admin/communities/${communityId}/arrears.csv`}
              className="whitespace-nowrap text-xs font-medium text-sage-700 underline"
            >
              unduh tunggakan CSV
            </a>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-sage-500">
              <tr>
                <th className="py-1">#</th>
                <th className="py-1">Anggota</th>
                <th className="py-1">RT</th>
                <th className="py-1">Jenis</th>
                <th className="py-1">Nominal</th>
                <th className="py-1">Waktu</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.seq} className="border-t border-sage-50">
                  <td className="py-1.5 text-sage-500">{entry.seq}</td>
                  <td className="py-1.5">{entry.memberName ?? '—'}</td>
                  <td className="py-1.5 tabular-nums text-sage-600">{entry.memberRt ?? '—'}</td>
                  <td className="py-1.5">
                    {entry.entryType === 'DEPOSIT'
                      ? 'Setoran'
                      : entry.entryType === 'VOID'
                        ? 'Pembatalan'
                        : 'Penyesuaian'}
                  </td>
                  <td className={`py-1.5 ${entry.amount < 0 ? 'text-red-600' : 'text-sage-900'}`}>
                    {rupiah(entry.amount)}
                  </td>
                  <td className="py-1.5 text-sage-500">{formatDateTime(entry.occurredAt)}</td>
                  <td className="py-1.5 text-right">
                    {canWrite &&
                      entry.entryType === 'DEPOSIT' &&
                      entry.refType === 'deposit' &&
                      entry.depositStatus === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => {
                            const corrected = window.prompt(
                              'Nominal yang benar (angka):',
                              String(entry.amount),
                            );
                            if (!corrected) return;
                            const reason = window.prompt(
                              'Alasan koreksi (min. 10 karakter):',
                              'Salah input nominal setoran',
                            );
                            if (!reason) return;
                            runAction('Koreksi', async () => {
                              const data = await api(`/api/admin/deposits/${entry.refId}/correct`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  correctedAmount: Number(corrected),
                                  reason,
                                }),
                              });
                              return `Koreksi tercatat: VOID #${data.voidEntry.seq}, entri baru #${data.newEntry.seq}.`;
                            });
                          }}
                          className="text-sage-700 underline"
                        >
                          koreksi
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sage-500">
          <span>
            Menampilkan {visibleEntries.length} dari {filteredEntries.length} mutasi terakhir.
          </span>
          {filteredEntries.length > ENTRY_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllEntries((current) => !current)}
              className="rounded-lg border border-sage-300 px-2 py-1 font-medium text-sage-700"
            >
              {showAllEntries
                ? `Ringkas ke ${ENTRY_PREVIEW} terakhir`
                : `Tampilkan semua (${filteredEntries.length})`}
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-sage-900">
              Anggota{' '}
              <span className="font-normal text-sage-500">({allMembers.length})</span>
            </h2>
            {canWrite && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction('Sinkronkan cicilan', async () => {
                      const data = await api(
                        `/api/admin/communities/${communityId}/installments/reconcile`,
                        { method: 'POST' },
                      );
                      const failed = data.failed > 0 ? `, ${data.failed} gagal` : '';
                      return `Cicilan disinkronkan: ${data.reconciled}/${data.members} anggota${failed}.`;
                    })
                  }
                  className="rounded-xl border border-sage-300 px-2 py-1 text-xs font-medium text-sage-700 disabled:opacity-50"
                  title="Hitung ulang alokasi setoran ke cicilan untuk semua anggota"
                >
                  Sinkronkan cicilan
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMember((current) => !current)}
                  className="rounded-xl border border-sage-300 px-2 py-1 text-xs font-medium text-sage-700"
                >
                  {showAddMember ? 'Tutup form' : '+ Tambah anggota'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="Cari nama anggota…"
              className="min-w-0 flex-1 rounded-xl border border-sage-300 bg-white px-3 py-1.5 text-xs"
            />
            <div className="-mt-1 w-36 shrink-0">
              <SearchSelect
                options={rtOptions}
                value={memberRt}
                onChange={setMemberRt}
                placeholder="Semua RT"
                searchPlaceholder="Cari RT…"
              />
            </div>
            <div className="flex items-center gap-1">
              {[
                ['ALL', 'Semua'],
                ['ARREARS', 'Ada tunggakan'],
              ].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMemberFilter(key)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    memberFilter === key
                      ? 'border-sage-700 bg-sage-700 text-white'
                      : 'border-sage-300 bg-white text-sage-700'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 max-h-64 divide-y divide-sage-100 overflow-auto pr-1 text-xs">
            {visibleMembers.length === 0 && (
              <li className="py-2 text-sage-500">
                {allMembers.length === 0
                  ? 'Belum ada anggota.'
                  : 'Tidak ada anggota yang cocok dengan pencarian/filter.'}
              </li>
            )}
            {visibleMembers.map((member) => (
              <li key={member.id} className="py-2">
                <div className="flex items-center gap-2">
                <span
                  title={member.rt ? `RT ${member.rt}` : 'RT belum diisi'}
                  className="w-11 shrink-0 rounded bg-sage-50 px-1 py-0.5 text-center text-[10px] font-medium text-sage-600"
                >
                  {member.rt ? `RT ${member.rt}` : 'RT —'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sage-800">{member.name}</span>
                {member.arrears > 0 && (
                  <button
                    type="button"
                    title={`${arrearsSummary(member)} — klik untuk rincian`}
                    aria-expanded={expandedArrears === member.id}
                    onClick={() =>
                      setExpandedArrears((current) => (current === member.id ? null : member.id))
                    }
                    className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 transition hover:bg-red-100 focus-visible:ring-1 focus-visible:ring-red-300"
                  >
                    {member.arrears} tunggakan
                  </button>
                )}
                <span className="w-20 shrink-0 text-right tabular-nums text-sage-600 sm:w-24">
                  {rupiah(member.total)}
                </span>
                {canWrite && (
                  <button
                    type="button"
                    title={`Edit ${member.name}`}
                    aria-label={`Edit ${member.name}`}
                    onClick={() => setEditingMember(member)}
                    className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sage-400 transition hover:bg-sage-100 hover:text-sage-700 focus-visible:bg-sage-100 focus-visible:text-sage-700"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M4 16h3l8.4-8.4a1.8 1.8 0 0 0-2.5-2.5L4.5 13.5 4 16Z" />
                    </svg>
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    title={`Hapus ${member.name}`}
                    aria-label={`Hapus ${member.name}`}
                    onClick={() => {
                      if (!window.confirm(`Hapus anggota "${member.name}"?`)) return;
                      runAction('Hapus anggota', async () => {
                        const data = await api(
                          `/api/admin/communities/${communityId}/members/${member.id}`,
                          { method: 'DELETE' },
                        );
                        return data.mode === 'deactivated'
                          ? `"${data.name}" dinonaktifkan — sudah punya riwayat setoran, jadi datanya dipertahankan.`
                          : `Anggota "${data.name}" dihapus.`;
                      });
                    }}
                    className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sage-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:bg-red-50 focus-visible:text-red-600"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M4.5 6h11M8 6V4.5h4V6m-6.4 0 .5 9a1 1 0 0 0 1 .9h5.8a1 1 0 0 0 1-.9l.5-9" />
                    </svg>
                  </button>
                )}
                </div>
                {expandedArrears === member.id && (member.arrearsDetail?.length ?? 0) > 0 && (
                  <ul className="mt-2 space-y-1 rounded-xl bg-red-50/70 px-3 py-2 text-[11px] text-red-700">
                    {member.arrearsDetail.map((item) => (
                      <li
                        key={item.packageId}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                      >
                        <span className="font-medium">{item.packageName}</span>
                        <span>
                          {item.installments} cicilan · {rupiah(item.amount)} · jatuh tempo{' '}
                          {formatDateTime(item.firstDueDate)}
                        </span>
                      </li>
                    ))}
                    <li className="pt-1 text-[10px] text-red-500">
                      Tunggakan = cicilan berstatus DUE dengan jatuh tempo ≤ hari ini.
                    </li>
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-sage-500">
            Menampilkan {visibleMembers.length} dari {allMembers.length} anggota.
          </p>
          {canWrite && showAddMember && (
            <form
              className="mt-4 grid gap-2 sm:grid-cols-[1fr_9rem_4.5rem_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const name = form.elements.namedItem('name').value.trim();
                const phone = form.elements.namedItem('phone').value.trim();
                const rt = form.elements.namedItem('rt').value.trim();
                runAction('Tambah anggota', async () => {
                  await api(`/api/admin/communities/${communityId}/members`, {
                    method: 'POST',
                    body: JSON.stringify({ name, phone: phone || undefined, rt: rt || undefined }),
                  });
                  form.reset();
                  return `Anggota "${name}" ditambahkan.`;
                });
              }}
            >
              <input
                name="name"
                placeholder="Nama anggota"
                required
                minLength={2}
                className="min-w-0 rounded-xl border border-sage-100 bg-white px-3 py-2 text-xs sm:py-1.5"
              />
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="0812-3456-7890"
                className="min-w-0 rounded-xl border border-sage-100 bg-white px-3 py-2 text-xs sm:py-1.5"
              />
              <input
                name="rt"
                inputMode="numeric"
                maxLength={3}
                placeholder="RT"
                title="Nomor RT, contoh: 03"
                className="min-w-0 rounded-xl border border-sage-100 bg-white px-3 py-2 text-xs sm:py-1.5"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-sage-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 sm:w-auto sm:py-1.5"
              >
                {busy ? 'Menyimpan…' : 'Tambah anggota'}
              </button>
              <p className="text-[11px] text-sage-500 sm:col-span-4">
                Nomor telepon dan RT opsional. Telepon contoh 0812-3456-7890, RT contoh 03.
              </p>
            </form>
          )}

          {editingMember && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-sage-900/40 p-4 sm:items-center">
              <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-sage-900">Edit anggota</h3>
                    <p className="mt-0.5 text-[11px] text-sage-500">
                      ID #{editingMember.id} · perubahan langsung tampil di portal warga
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Tutup"
                    onClick={() => setEditingMember(null)}
                    className="rounded px-1 text-xs text-sage-500"
                  >
                    ✕
                  </button>
                </div>

                <form
                  key={editingMember.id}
                  className="mt-3 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const payload = {
                      name: form.elements.namedItem('editName').value.trim(),
                      phone: form.elements.namedItem('editPhone').value.trim() || null,
                      rt: form.elements.namedItem('editRt').value.trim() || null,
                    };
                    runAction('Edit anggota', async () => {
                      const data = await api(
                        `/api/admin/communities/${communityId}/members/${editingMember.id}`,
                        { method: 'PATCH', body: JSON.stringify(payload) },
                      );
                      setEditingMember(null);
                      return `Anggota "${data.member.name}" diperbarui.`;
                    });
                  }}
                >
                  <label className="text-[11px] font-medium text-sage-500">
                    Nama anggota
                    <input
                      name="editName"
                      required
                      minLength={2}
                      defaultValue={editingMember.name}
                      className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
                    />
                  </label>

                  <div className="grid gap-2 sm:grid-cols-[1fr_5rem]">
                    <label className="text-[11px] font-medium text-sage-500">
                      Nomor telepon
                      <input
                        name="editPhone"
                        type="tel"
                        inputMode="tel"
                        placeholder="0812-3456-7890"
                        defaultValue={editingMember.phone ?? ''}
                        className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
                      />
                    </label>
                    <label className="text-[11px] font-medium text-sage-500">
                      RT
                      <input
                        name="editRt"
                        inputMode="numeric"
                        maxLength={3}
                        placeholder="03"
                        defaultValue={editingMember.rt ?? ''}
                        className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-sage-500">
                    Kosongkan telepon/RT bila tidak ada. Riwayat setoran ikut memakai nama baru.
                  </p>

                  <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="rounded-xl border border-sage-300 px-3 py-2 text-xs font-medium text-sage-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-xl bg-sage-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {busy ? 'Menyimpan…' : 'Simpan perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-sage-900">
              Paket & progres{' '}
              <span className="font-normal text-sage-500">({summary?.packages.length ?? 0})</span>
            </h2>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowAddPackage((current) => !current)}
                className="rounded-xl border border-sage-300 px-2 py-1 text-xs font-medium text-sage-700"
              >
                {showAddPackage ? 'Tutup form' : '+ Tambah paket'}
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {summary?.packages.map((pkg) => {
              const pct = pkg.targetAmount > 0
                ? Math.min(100, Math.round((pkg.collected / pkg.targetAmount) * 100))
                : 0;
              return (
                <li key={pkg.id}>
                  <div className="flex justify-between">
                    <span className="text-sage-700">{pkg.name}</span>
                    <span className="text-sage-500">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-sage-50">
                    <div className="h-1.5 rounded-full bg-sage-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-sage-500">
                    {rupiah(pkg.collected)} / {rupiah(pkg.targetAmount)} ·{' '}
                    {FREQUENCY_LABEL[pkg.frequency] ?? pkg.frequency} · jatuh tempo {pkg.dueDate}
                  </p>
                </li>
              );
            })}
          </ul>

          {canWrite && showAddPackage && (
            <PackageForm
              disabled={busy}
              onSubmit={async (payload) => {
                let success = false;
                await runAction('Buat paket', async () => {
                  const data = await api(`/api/admin/communities/${communityId}/packages`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  success = true;
                  return `Paket "${payload.name}" dibuat: ${data.plan.periods} cicilan @ ${rupiah(
                    data.plan.regular,
                  )} untuk ${data.enrolledMembers} anggota aktif.`;
                });
                return success;
              }}
            />
          )}

          {!canWrite && (
            <p className="mt-4 text-[11px] text-sage-500">
              Hanya bendahara/super admin yang bisa menambah paket.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-sage-100 bg-white/70 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-sage-900">Rekap per RT</h2>
          <span className="text-[11px] text-sage-500">
            {(summary?.rtSummary ?? []).length} kelompok ·{' '}
            {summary?.rtSummary?.reduce((total, row) => total + row.members, 0) ?? 0} anggota aktif
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="text-sage-500">
              <tr>
                <th className="pb-1 font-medium">RT</th>
                <th className="pb-1 text-right font-medium">Anggota</th>
                <th className="pb-1 text-right font-medium">Terkumpul</th>
                <th className="pb-1 text-right font-medium">Tunggakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-100">
              {(summary?.rtSummary ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-sage-500">
                    Belum ada data anggota.
                  </td>
                </tr>
              )}
              {(summary?.rtSummary ?? []).map((row) => (
                <tr key={row.rt ?? 'NONE'}>
                  <td className="py-1.5 text-sage-800">
                    {row.rt ? `RT ${row.rt}` : 'Belum diisi'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-sage-600">{row.members}</td>
                  <td className="py-1.5 text-right tabular-nums text-sage-900">
                    {rupiah(row.collected)}
                  </td>
                  <td
                    title={row.arrears > 0 ? arrearsSummary(row) : 'Tidak ada tunggakan'}
                    className={`py-1.5 text-right tabular-nums ${
                      row.arrears > 0 ? 'cursor-help text-red-600' : 'text-sage-500'
                    }`}
                  >
                    {row.arrears}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-sage-500">
          Terkumpul dihitung dari ledger; tunggakan = cicilan berstatus DUE yang sudah lewat jatuh
          tempo. Arahkan kursor ke angka untuk melihat rincian per paket. Isi RT lewat form tambah
          anggota atau lengkapi lewat seed.
        </p>
      </section>

      {user.role === 'SUPER_ADMIN' && (
        <section className="mt-6 rounded-2xl border border-gold/40 bg-white/80 p-5">
          <h2 className="text-sm font-semibold text-sage-900">
            Kelola pengurus{' '}
            <span className="text-xs font-normal text-sage-500">
              (fitur khusus SUPER_ADMIN — pembeda dari Bendahara)
            </span>
          </h2>

          <ul className="mt-3 space-y-1 text-xs">
            {users.length === 0 && <li className="text-sage-500">Belum ada data akun.</li>}
            {users.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="truncate text-sage-700">{item.email}</span>
                <span className="text-sage-500">
                  {item.role}
                  {item.active ? '' : ' · nonaktif'}
                </span>
              </li>
            ))}
          </ul>

          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const payload = {
                email: form.elements.namedItem('newEmail').value,
                password: form.elements.namedItem('newPassword').value,
                role: form.elements.namedItem('newRole').value,
              };
              runAction('Tambah pengurus', async () => {
                await api('/api/admin/users', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                form.reset();
                const data = await api('/api/admin/users');
                setUsers(data.items);
                return `Akun ${payload.email} (${payload.role}) dibuat.`;
              });
            }}
          >
            <input
              name="newEmail"
              type="email"
              placeholder="email pengurus"
              required
              className="min-w-0 flex-1 rounded-xl border border-sage-100 bg-white px-3 py-1.5 text-xs"
            />
            <input
              name="newPassword"
              type="password"
              placeholder="password (min. 8)"
              required
              minLength={8}
              className="w-40 rounded-xl border border-sage-100 bg-white px-3 py-1.5 text-xs"
            />
            <div className="flex items-center gap-2 text-[11px] text-sage-700">
              {['BENDAHARA', 'KETUA', 'SUPER_ADMIN'].map((role) => (
                <label key={role} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="newRole"
                    value={role}
                    defaultChecked={role === 'BENDAHARA'}
                  />
                  {role}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sage-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Tambah akun
            </button>
          </form>
        </section>
      )}

      <footer className="mt-10 text-xs text-sage-500">
        Pembayaran dan WhatsApp berjalan pada mode kotak pasir. Jaminan anti-fraud mencakup
        integritas catatan keuangan, bukan kebenaran uang yang diserahkan di luar sistem.
      </footer>
    </main>
  );
}

function PackageForm({ disabled, onSubmit }) {
  const [frequency, setFrequency] = useState('WEEKLY');
  const defaultDueDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  return (
    <form
      className="mt-4 grid gap-2 rounded-xl border border-sage-100 bg-sage-50/60 p-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const payload = {
          name: form.elements.namedItem('pkgName').value.trim(),
          targetAmount: Number(form.elements.namedItem('targetAmount').value),
          dueDate: form.elements.namedItem('dueDate').value,
          frequency,
        };
        const success = await onSubmit(payload);
        if (success) form.reset();
      }}
    >
      <label className="text-[11px] font-medium text-sage-500">
        Nama paket
        <input
          name="pkgName"
          required
          minLength={2}
          placeholder="Kas RT"
          className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
        />
      </label>

      <label className="text-[11px] font-medium text-sage-500">
        Target dana (Rp)
        <input
          name="targetAmount"
          type="number"
          min="0"
          step="1000"
          required
          placeholder="1200000"
          className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
        />
      </label>

      <label className="text-[11px] font-medium text-sage-500">
        Jatuh tempo
        <input
          name="dueDate"
          type="date"
          required
          defaultValue={defaultDueDate}
          className="mt-1 w-full rounded-xl border border-sage-300 bg-white px-3 py-2 text-xs font-normal text-sage-900"
        />
      </label>

      <div>
        <p className="text-[11px] font-medium text-sage-500">Frekuensi cicilan</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {[
            ['WEEKLY', 'Mingguan'],
            ['DAILY', 'Harian'],
            ['MONTHLY', 'Bulanan'],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequency(value)}
              className={`rounded-full border px-2 py-1 text-[11px] ${
                frequency === value
                  ? 'border-sage-700 bg-sage-700 text-white'
                  : 'border-sage-300 bg-white text-sage-700'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-sage-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 sm:col-span-2 sm:w-auto sm:justify-self-start"
      >
        Buat paket & jadwal cicilan
      </button>

      <p className="text-[11px] text-sage-500 sm:col-span-2">
        Semua anggota aktif otomatis diikutkan, dan jadwal cicilan dibuat sesuai frekuensi yang
        dipilih — pembulatan ke atas per Rp1.000, sisa ke periode terakhir.
      </p>
    </form>
  );
}

function DepositForm({ members, packages, onSubmit, disabled }) {
  const [memberId, setMemberId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');

  useEffect(() => {
    if (!memberId && members[0]) setMemberId(String(members[0].id));
  }, [members, memberId]);

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          memberId: Number(memberId),
          packageId: packageId ? Number(packageId) : null,
          amount: Number(amount),
          method,
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <SearchSelect
          label="Anggota"
          placeholder="Pilih anggota"
          searchPlaceholder="Cari nama anggota…"
          options={members.map((member) => ({
            value: member.id,
            label: member.name,
            hint: member.arrears > 0 ? `${member.arrears} tunggakan` : '',
          }))}
          value={memberId}
          onChange={setMemberId}
          disabled={disabled}
        />            <SearchSelect
              label="Paket (opsional)"
              placeholder="Semua paket"
              searchPlaceholder="Cari paket…"
              emptyLabel="Belum ada paket"
              options={[
                { value: '', label: 'Semua paket' },
                ...packages.map((pkg) => ({
                  value: pkg.id,
                  label: pkg.name,
                  hint: rupiah(pkg.targetAmount),
                })),
              ]}
              value={packageId}
              onChange={setPackageId}
              disabled={disabled}
            />
            <div className="col-span-2 mt-1 text-[11px] text-sage-500">
              Pilih paket agar hanya cicilan paket itu yang dilunasi; "Semua paket" memakai urutan
              jatuh tempo. Tersedia: {packages.map((p) => p.name).join(', ') || 'belum ada paket'}.
            </div>
      </div>        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="number"
          min="1000"
          step="1000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={disabled}
          placeholder="Nominal (min. Rp1.000)"
          className="min-w-0 flex-1 rounded-xl border border-sage-100 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
          required
        />
        <div className="flex flex-wrap items-center gap-1">
          {[
            ['CASH', 'Tunai'],
            ['TRANSFER', 'Transfer'],
            ['GATEWAY', 'Gateway'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => setMethod(value)}
              className={`rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-50 ${
                method === value
                  ? 'border-sage-700 bg-sage-700 text-white'
                  : 'border-sage-300 bg-white text-sage-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-sage-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 sm:w-auto sm:py-1.5"
        >
          Simpan setoran
        </button>
      </div>
    </form>
  );
}
