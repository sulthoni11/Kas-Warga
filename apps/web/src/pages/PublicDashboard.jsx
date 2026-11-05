import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, rupiah, formatDateTime } from '../lib/api.js';

export default function PublicDashboard() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState(null);
  const sourceRef = useRef(null);

  const load = useCallback(async () => {
    const result = await api(`/api/public/${token}`);
    setData(result);
    return result;
  }, [token]);

  useEffect(() => {
    load().catch((err) => setError(err));
  }, [load]);

  // SSE + fallback polling bila koneksi gagal (FR-07 AC).
  useEffect(() => {
    if (!token) return undefined;

    let pollTimer = null;
    const source = new EventSource(`/api/public/${token}/stream`);
    sourceRef.current = source;

    source.addEventListener('ready', () => setLive(true));
    source.addEventListener('update', (event) => {
      const payload = JSON.parse(event.data);
      setFlash(
        payload.type === 'deposit.created'
          ? `Setoran baru masuk: ${rupiah(payload.amount)}`
          : 'Data komunitas diperbarui',
      );
      load().catch(() => {});
    });
    source.onerror = () => {
      setLive(false);
      if (!pollTimer) {
        pollTimer = setInterval(() => load().catch(() => {}), 15_000);
      }
    };

    return () => {
      source.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [token, load]);

  if (!token) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12 text-center sm:px-6 sm:py-20">
        <h1 className="text-xl font-semibold text-sage-900">Tautan tidak lengkap</h1>
        <p className="mt-2 text-sm text-sage-700">
          Alamat ini memerlukan token dari pengurus, bentuknya seperti{' '}
          <code className="rounded bg-sage-50 px-1">/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>.
        </p>
        <p className="mt-4 text-xs text-sage-500">
          Minta pengurus membuat tautan lewat panel <strong>Buat link publik</strong>, lalu buka
          tautan itu apa adanya.
        </p>
      </main>
    );
  }

  if (error) {
    const code = error?.data?.error;
    const message =
      code === 'TOKEN_INVALID_OR_REVOKED'
        ? 'Token tidak dikenali, sudah dicabut, atau kedaluwarsa.'
        : error?.message === 'Failed to fetch'
          ? 'Tidak dapat menghubungi server (API belum jalan).'
          : (error?.message ?? 'Terjadi kesalahan.');

    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12 text-center sm:px-6 sm:py-20">
        <h1 className="text-xl font-semibold text-sage-900">Tautan tidak dapat dibuka</h1>
        <p className="mt-2 text-sm text-sage-700">{message}</p>
        <p className="mt-4 break-all rounded-xl bg-sage-50 px-3 py-2 text-left text-[11px] text-sage-500">
          Token diterima: {token.length > 16 ? `${token.slice(0, 16)}… (${token.length} karakter)` : token || '—'}
        </p>
        <p className="mt-3 text-xs text-sage-500">
          Token lengkap 43 karakter. Kalau terpotong saat disalin, minta tautan baru ke pengurus.
          Database yang di-reset (<code>docker compose down -v</code>) juga membuat token lama tidak
          berlaku.
        </p>
      </main>
    );
  }

  if (!data) {
    return <main className="p-10 text-sage-700">Memuat data komunitas…</main>;
  }

  const { community, totals, packages, recentEntries, memberView } = data;
  const percent = totals.target > 0 ? Math.min(100, Math.round((totals.collected / totals.target) * 100)) : 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-500">
        Portal transparansi warga
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-sage-900">{community.name}</h1>
      <p className="mt-1 text-sm text-sage-700">
        Periode {community.periodStart} – {community.periodEnd} ·{' '}
        <span className={live ? 'text-sage-700' : 'text-sage-500'}>
          {live ? 'terhubung langsung' : 'mode pembaruan berkala'}
        </span>
      </p>

      {flash && (
        <p className="mt-4 rounded-xl bg-sage-100 px-3 py-2 text-sm text-sage-900">{flash}</p>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <p className="text-xs uppercase tracking-wide text-sage-500">Terkumpul</p>
          <p className="mt-2 text-2xl font-semibold text-sage-900">{rupiah(totals.collected)}</p>
          <p className="mt-1 text-xs text-sage-500">{percent}% dari target</p>
        </div>
        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <p className="text-xs uppercase tracking-wide text-sage-500">Target</p>
          <p className="mt-2 text-2xl font-semibold text-sage-900">{rupiah(totals.target)}</p>
          <p className="mt-1 text-xs text-sage-500">{packages.length} paket</p>
        </div>
        <div className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <p className="text-xs uppercase tracking-wide text-sage-500">Anggota aktif</p>
          <p className="mt-2 text-2xl font-semibold text-sage-900">{totals.members}</p>
          <p className="mt-1 text-xs text-sage-500">{totals.entries} entri tercatat</p>
        </div>
      </section>

      {memberView && (
        <section className="mt-4 rounded-2xl border border-gold/40 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-wide text-sage-500">Posisi Anda</p>
          <p className="mt-1 text-lg font-semibold text-sage-900">
            {memberView.name} · {rupiah(memberView.total)}
          </p>
          {memberView.arrears > 0 && (
            <div className="mt-1 text-xs text-red-600">
              <p>{memberView.arrears} cicilan tertunggak</p>
              {(memberView.arrearsDetail?.length ?? 0) > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {memberView.arrearsDetail.map((item) => (
                    <li key={item.packageId}>
                      {item.packageName}: {item.installments} cicilan · {rupiah(item.amount)} · jatuh
                      tempo {formatDateTime(item.firstDueDate)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-sage-100 bg-white/70 p-5">
        <h2 className="text-sm font-semibold text-sage-900">Progres per paket</h2>
        <ul className="mt-3 space-y-3">
          {packages.map((pkg) => {
            const pct = pkg.targetAmount > 0
              ? Math.min(100, Math.round((pkg.collected / pkg.targetAmount) * 100))
              : 0;
            return (
              <li key={pkg.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-sage-900">{pkg.name}</span>
                  <span className="text-sage-500">{pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-sage-50">
                  <div className="h-2 rounded-full bg-sage-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-sage-500">
                  {rupiah(pkg.collected)} dari {rupiah(pkg.targetAmount)} · jatuh tempo {pkg.dueDate}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-sage-100 bg-white/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sage-900">Mutasi kas masuk terbaru</h2>
          <button
            type="button"
            onClick={async () => setVerify(await api(`/api/public/${token}/verify`))}
            className="rounded-xl border border-sage-300 px-3 py-1.5 text-xs font-medium text-sage-700"
          >
            Verifikasi keaslian catatan
          </button>
        </div>

        {verify && (
          <p
            className={`mt-3 rounded-xl px-3 py-2 text-xs ${
              verify.ok ? 'bg-sage-100 text-sage-900' : 'bg-red-50 text-red-700'
            }`}
          >
            {verify.ok
              ? `Rantai catatan SAH — ${verify.totalEntries} entri. Kode verifikasi ${verify.rootHash.slice(0, 24)}…`
              : `Rantai catatan TIDAK SAH (${verify.reason}) mulai entri #${verify.firstBrokenSeq}`}
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="text-sage-500">
            <tr>
              <th className="py-1">#</th>
              <th className="py-1">Anggota</th>
              <th className="py-1">RT</th>
              <th className="py-1">Nominal</th>
              <th className="py-1">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.map((entry) => (
              <tr key={entry.seq} className="border-t border-sage-50">
                <td className="py-1.5 text-sage-500">{entry.seq}</td>
                <td className="py-1.5">{entry.memberName ?? '—'}</td>
                <td className="py-1.5 tabular-nums text-sage-600">{entry.memberRt ?? '—'}</td>
                <td className={`py-1.5 ${entry.amount < 0 ? 'text-red-600' : 'text-sage-900'}`}>
                  {rupiah(entry.amount)}
                </td>
                <td className="py-1.5 text-sage-500">{formatDateTime(entry.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <footer className="mt-10 text-xs text-sage-500">
        Setiap setoran dicatat sebagai entri berantai hash dan tidak dapat diubah atau dihapus.
        Halaman ini hanya menampilkan data; tidak ada data pribadi selain nama, RT, dan nominal.
      </footer>
    </main>
  );
}
