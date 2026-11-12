import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rupiah } from '../lib/api.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/* Sama dengan formatDateTimeSimple() di aplikasi mobile. */
function formatWhen(raw) {
  if (!raw) return '—';
  const text = String(raw);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text;
  const date = `${Number(match[3])} ${MONTHS[Math.max(0, Number(match[2]) - 1)]} ${match[1]}`;
  const time = text.match(/[T ](\d{2}:\d{2})/);
  return time ? `${date}, ${time[1]}` : date;
}

/* Palet mengikuti aplikasi mobile (theme.dart "Bright Orange Clean"). */
const C = {
  orange: '#FF8A00',
  orangeLight: '#FFA840',
  orangeDeep: '#F4760A',
  orangePastel: '#FFE3C2',
  cream: '#FFF8F2',
  ink: '#2A2621',
  soft: '#6F665D',
  border: '#F3E7DC',
  coralPastel: '#FFECEC',
  coralDeep: '#D94848',
  mintPastel: '#DFF6EA',
  mintDeep: '#2E9E67',
  tealPastel: '#D9F6F2',
  tealDeep: '#0F9D8F',
  purplePastel: '#F1EAFE',
  purple: '#A78BFA',
};

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]).join('').toUpperCase() || 'KW';
}

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  );
}

const icons = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  savings: (
    <>
      <path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
      <path d="M6 10 8 5h8l2 5M12 13v3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 15.2c2 .6 3.5 2 3.5 4.8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  trend: <path d="M4 16.5 9.5 11l3 3L20 7M20 7h-4.5M20 7v4.5" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.8 7.3 7 9 4.2-1.7 7-4.8 7-9V6z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </>
  ),
};

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-[26px] border bg-white p-4 shadow-[0_14px_34px_rgba(255,138,0,0.10)] ${className}`}
      style={{ borderColor: C.border }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
      <h2 className="text-[15px] font-extrabold" style={{ color: C.ink }}>
        {title}
      </h2>
      {subtitle && (
        <span className="text-[11.5px] font-medium" style={{ color: C.soft }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

function Progress({ value }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.border }}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#FF8A00] to-[#FFC24B] transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function LiveBadge({ live }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
      style={{
        borderColor: live ? C.orangeLight : C.border,
        backgroundColor: live ? C.orangePastel : '#FFFFFF',
        color: live ? C.orangeDeep : C.soft,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: live ? C.orange : C.orangeLight }}
      />
      {live ? 'live' : '15 dtk'}
    </span>
  );
}

function PortalBadge({ className = 'h-14 w-14 rounded-[19px]' }) {
  return (
    <span
      className={`flex items-center justify-center text-white shadow-[0_14px_26px_rgba(255,138,0,0.28)] ${className}`}
      style={{ background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeLight} 100%)` }}
    >
      <Icon path={icons.globe} className="h-7 w-7" />
    </span>
  );
}

function Shell({ children }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: C.cream }}>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function TokenEntry() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState(null);

  function submit(event) {
    event.preventDefault();
    const fromUrl = value.match(/\/s\/([A-Za-z0-9_-]{20,})/);
    const token = (fromUrl ? fromUrl[1] : value.trim()).replace(/\/+$/, '');

    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) {
      setProblem('Tautan belum dikenali. Tempel seluruh tautan yang dikirim pengurus.');
      return;
    }

    navigate(`/s/${token}`);
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between">
        <Link to="/" className="text-[12px] font-bold" style={{ color: C.soft }}>
          ← KasWarga
        </Link>
        <Link to="/bayar" className="text-[12px] font-bold underline" style={{ color: C.orangeDeep }}>
          Cara bayar
        </Link>
      </div>
      <PortalBadge />
      <h1 className="mt-4 text-[26px] font-black leading-tight" style={{ color: C.ink }}>
        Lihat kas tanpa login
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: C.soft }}>
        Tempel tautan yang dikirim pengurus. Tautan pribadi menampilkan saldo dan tunggakan Anda;
        tautan komunitas menampilkan kas bersama.
      </p>

      <Card className="mt-5">
        <div
          className="flex items-center gap-2 rounded-2xl border px-3.5 py-3"
          style={{ borderColor: C.border, backgroundColor: C.cream }}
        >
          <span style={{ color: C.orangeDeep }}>
            <Icon path={icons.link} />
          </span>
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setProblem(null);
            }}
            placeholder="http://192.168.1.9:5173/s/xxxxxxxx…"
            aria-label="Tautan portal warga"
            className="min-w-0 w-full bg-transparent text-sm outline-none"
            style={{ color: C.ink }}
          />
        </div>

        {problem && (
          <p className="mt-2 text-xs font-semibold" style={{ color: C.coralDeep }}>
            {problem}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(255,138,0,0.28)] transition active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeLight} 100%)` }}
        >
          <Icon path={icons.globe} className="h-4 w-4" />
          Buka portal
        </button>
      </Card>

      <div
        className="mt-4 space-y-2 rounded-[22px] border p-4 text-[12px] leading-relaxed"
        style={{ borderColor: C.border, backgroundColor: C.orangePastel, color: '#7A5730' }}
      >
        <p className="text-[12.5px] font-extrabold" style={{ color: C.ink }}>
          Belum punya tautan?
        </p>
        <p>
          Pengurus membuatnya dari <strong>aplikasi Android KasWarga</strong> — buka menu{' '}
          <strong>Alat → Portal Warga</strong>, lalu pilih <strong>Buat tautan komunitas</strong>{' '}
          untuk kas bersama atau <strong>Pilih anggota</strong> untuk tautan pribadi.
        </p>
        <Link to="/bayar" className="inline-block font-bold underline" style={{ color: C.orangeDeep }}>
          Lihat cara membayar
        </Link>
      </div>
    </Shell>
  );
}

export default function PublicDashboard() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState(null);
  const [integrity, setIntegrity] = useState(null);

  const load = useCallback(async () => {
    const result = await api(`/api/public/${token}`);
    setData(result);
    return result;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load().catch((err) => setError(err));
  }, [load, token]);

  useEffect(() => {
    if (!token) return;
    api(`/api/public/${token}/verify`)
      .then((result) => setIntegrity(result))
      .catch(() => setIntegrity(null));
  }, [token]);

  // SSE + fallback polling bila koneksi gagal (FR-07 AC).
  useEffect(() => {
    if (!token) return undefined;

    // Mode tangkapan layar: lewati SSE agar halaman bisa di-screenshot tanpa koneksi menggantung.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('snapshot')) {
      return undefined;
    }

    let pollTimer = null;
    const source = new EventSource(`/api/public/${token}/stream`);

    source.addEventListener('ready', () => setLive(true));
    source.addEventListener('update', (event) => {
      let payload = {};
      try {
        payload = JSON.parse(event.data);
      } catch {
        payload = {};
      }
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

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!token) return <TokenEntry />;

  if (error) {
    const code = error?.data?.error;
    const message =
      code === 'TOKEN_INVALID_OR_REVOKED'
        ? 'Tautan tidak dikenali, sudah dicabut, atau kedaluwarsa.'
        : /ECONNREFUSED|Failed to fetch|NetworkError/i.test(error?.message ?? '')
          ? 'Tidak dapat menghubungi server. Pastikan API sudah berjalan, lalu muat ulang halaman.'
          : (error?.message ?? 'Terjadi kesalahan.');

    return (
      <Shell>
        <PortalBadge />
        <h1 className="mt-4 text-[24px] font-black" style={{ color: C.ink }}>
          Tautan tidak dapat dibuka
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: C.soft }}>
          {message}
        </p>
        <Card className="mt-4">
          <p className="break-all font-mono text-[11px]" style={{ color: C.soft }}>
            {token.length > 16 ? `${token.slice(0, 16)}… (${token.length} karakter)` : token || '—'}
          </p>
        </Card>
        <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: C.soft }}>
          Token lengkap 43 karakter. Kalau terpotong saat disalin, minta tautan baru ke pengurus.
          Database yang di-reset juga membuat token lama tidak berlaku.
        </p>
        <Link
          to="/s"
          className="mt-3 inline-block text-xs font-bold underline"
          style={{ color: C.orangeDeep }}
        >
          Tempel tautan lain
        </Link>
      </Shell>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: C.cream }}>
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-2xl" style={{ backgroundColor: C.border }} />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-24 animate-pulse rounded-full" style={{ backgroundColor: C.border }} />
              <div className="h-4 w-44 animate-pulse rounded-full" style={{ backgroundColor: C.border }} />
              <div className="h-2.5 w-32 animate-pulse rounded-full" style={{ backgroundColor: C.border }} />
            </div>
          </div>
          <div className="mt-4 h-40 animate-pulse rounded-[28px]" style={{ backgroundColor: C.orangePastel }} />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="h-[68px] animate-pulse rounded-[22px]" style={{ backgroundColor: C.border }} />
            <div className="h-[68px] animate-pulse rounded-[22px]" style={{ backgroundColor: C.border }} />
          </div>
          <div className="mt-5 space-y-2">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-[52px] animate-pulse rounded-2xl"
                style={{ backgroundColor: C.border }}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-[12px]" style={{ color: C.soft }}>
            Memuat data komunitas…
          </p>
        </div>
      </main>
    );
  }

  const { community, totals, packages, recentEntries, memberView } = data;
  const isPersonal = data.scope === 'MEMBER' && memberView;
  const percent =
    totals.target > 0 ? Math.min(100, Math.round((totals.collected / totals.target) * 100)) : 0;
  const firstName = (memberView?.name ?? '').split(' ')[0];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: C.cream }}>
      <div className="mx-auto w-full max-w-md">
        <div className="sticky top-0 z-20 -mx-4 border-b border-[#F3E7DC]/70 bg-[#FFF8F2]/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">            <PortalBadge className="h-11 w-11 shrink-0 rounded-2xl" />
            <div className="min-w-0">
              <p
                className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{ color: C.soft }}
              >
                Portal transparansi
              </p>
              <p
                className="truncate text-[15px] font-extrabold leading-tight"
                style={{ color: C.ink }}
              >
                {community.name}
              </p>
              <p className="truncate text-[11px]" style={{ color: C.soft }}>
                {formatWhen(community.periodStart)} – {formatWhen(community.periodEnd)}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <LiveBadge live={live} />
          </div>
          </div>
          {integrity && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                style={{
                  backgroundColor: integrity.ok ? C.mintPastel : C.coralPastel,
                  color: integrity.ok ? C.mintDeep : C.coralDeep,
                }}
              >
                <Icon path={icons.shield} className="h-3 w-3" />
                {integrity.ok ? 'Rantai sah' : 'Rantai tidak sah'}
              </span>
              <span className="text-[10px] font-medium" style={{ color: C.soft }}>
                {integrity.totalEntries ?? 0} entri diperiksa
              </span>
            </div>
          )}
        </div>

        {isPersonal && (
          <p
            className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold text-white"
            style={{ backgroundColor: C.orangeDeep }}
          >
            Halo, {firstName}
            <span className="font-medium text-white/80">· ini halaman pribadi Anda</span>
          </p>
        )}

        {flash && (
          <p
            className="mt-3 rounded-2xl border px-3 py-2 text-[12px] font-semibold"
            style={{ borderColor: C.orangeLight, backgroundColor: C.orangePastel, color: C.orangeDeep }}
          >
            {flash}
          </p>
        )}

        {/* Kartu kas: gradien oranye, sama seperti di mobile. */}
        <div
          className="mt-4 rounded-[28px] p-5 text-white shadow-[0_16px_34px_rgba(255,138,0,0.28)]"
          style={{ background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeLight} 100%)` }}
        >
          <div className="flex items-center gap-2">
            <Icon path={icons.savings} className="h-[18px] w-[18px]" />
            <span className="text-[13.5px] font-bold">Kas terkumpul</span>
            <span className="ml-auto rounded-full bg-white/25 px-2.5 py-1 text-[11.5px] font-extrabold">
              {percent}%
            </span>
          </div>
          <p className="mt-2 text-[30px] font-black leading-tight tabular-nums">
            {rupiah(totals.collected)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] font-bold text-white/95">
            Target {rupiah(totals.target)}
          </p>
          {totals.target > totals.collected && (
            <p className="mt-0.5 text-[11.5px] font-semibold text-white/85">
              Sisa {rupiah(totals.target - totals.collected)}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div
            className="flex items-center gap-2.5 rounded-[22px] border bg-white p-3.5"
            style={{ borderColor: C.border }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: C.tealPastel, color: C.tealDeep }}
            >
              <Icon path={icons.users} className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[15px] font-extrabold" style={{ color: C.ink }}>
                {totals.members}
              </p>
              <p className="text-[11px]" style={{ color: C.soft }}>
                Anggota aktif
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2.5 rounded-[22px] border bg-white p-3.5"
            style={{ borderColor: C.border }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: C.purplePastel, color: C.purple }}
            >
              <Icon path={icons.receipt} className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[15px] font-extrabold" style={{ color: C.ink }}>
                {totals.entries}
              </p>
              <p className="text-[11px]" style={{ color: C.soft }}>
                Entri ledger
              </p>
            </div>
          </div>
        </div>

        {isPersonal && (
          <section className="mt-5">
            <SectionTitle
              title="Posisi Anda"
              subtitle={
                memberView.rt ? `${memberView.name} · RT ${memberView.rt}` : memberView.name
              }
            />
            <div
              className="rounded-[24px] border p-4"
              style={{ borderColor: C.orangeLight, backgroundColor: 'rgba(255,227,194,0.45)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                  style={{ backgroundColor: C.orangeDeep }}
                >
                  {initials(memberView.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold" style={{ color: C.ink }}>
                    {memberView.name}
                  </p>
                  <p className="text-[11.5px]" style={{ color: C.soft }}>
                    {memberView.rt ? `RT ${memberView.rt}` : 'RT belum diisi'}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[11px]" style={{ color: C.soft }}>
                    Total setoran
                  </p>
                  <p className="text-[17px] font-black tabular-nums" style={{ color: C.ink }}>
                    {rupiah(memberView.total)}
                  </p>
                </div>
              </div>

              <div className="mt-3.5">
                {memberView.arrears > 0 ? (
                  <>
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                      style={{ backgroundColor: C.coralPastel, color: C.coralDeep }}
                    >
                      {memberView.arrears} cicilan tertunggak ·{' '}
                      {rupiah(memberView.arrearsAmount ?? 0)}
                    </span>
                    <ul className="mt-2.5 space-y-2">
                      {(memberView.arrearsDetail ?? []).map((item) => (
                        <li
                          key={item.packageId}
                          className="rounded-2xl bg-white/70 px-3 py-2 text-[12px]"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="font-bold" style={{ color: C.ink }}>
                              {item.packageName}
                            </span>
                            <span className="tabular-nums" style={{ color: C.soft }}>
                              {item.installments} cicilan
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11.5px]" style={{ color: C.soft }}>
                            {rupiah(item.amount)} · jatuh tempo {formatWhen(item.firstDueDate)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p
                    className="rounded-2xl px-3 py-2.5 text-[12px] font-bold"
                    style={{ backgroundColor: C.mintPastel, color: C.mintDeep }}
                  >
                    Tidak ada cicilan tertunggak.
                  </p>
                )}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: C.soft }}>
                Tautan ini hanya memuat mutasi atas nama Anda; angka komunitas di atas tetap
                agregat.
              </p>
            </div>
          </section>
        )}

        <section className="mt-5">
          <SectionTitle title="Paket" subtitle={`${packages.length} program kas`} />
          {packages.length === 0 ? (
            <Card>
              <p className="text-[12px]" style={{ color: C.soft }}>
                Belum ada paket.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {packages.map((pkg) => {
                const pct =
                  pkg.targetAmount > 0
                    ? Math.min(100, Math.round((pkg.collected / pkg.targetAmount) * 100))
                    : 0;
                return (
                  <Card key={pkg.id} className="!rounded-[22px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13.5px] font-extrabold" style={{ color: C.ink }}>
                        {pkg.name}
                      </p>
                      <span className="text-[12px] font-extrabold" style={{ color: C.orangeDeep }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={pct} />
                    </div>
                    <p className="mt-2 text-[11.5px] tabular-nums" style={{ color: C.soft }}>
                      {rupiah(pkg.collected)}{' '}
                      <span style={{ color: '#C9BCAE' }}>dari {rupiah(pkg.targetAmount)}</span>
                    </p>
                    {pkg.dueDate && (
                      <p className="mt-0.5 text-[11px]" style={{ color: C.soft }}>
                        jatuh tempo {formatWhen(pkg.dueDate)}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5">
          <SectionTitle
            title={isPersonal ? 'Riwayat setoran Anda' : 'Mutasi terbaru'}
            subtitle="20 entri terakhir"
          />
          {recentEntries.length === 0 ? (
            <Card>
              <p className="text-[12px]" style={{ color: C.soft }}>
                {isPersonal ? 'Belum ada setoran atas nama Anda.' : 'Belum ada mutasi kas.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {recentEntries.map((entry) => {
                const negative = entry.amount < 0;
                const voided = entry.entryType === 'VOID';
                const title = isPersonal
                  ? voided
                    ? 'Pembatalan'
                    : 'Setoran'
                  : (entry.memberName ?? '(tanpa anggota)');
                return (
                  <div
                    key={entry.seq}
                    className="flex items-center gap-3 rounded-[18px] border bg-white px-4 py-3"
                    style={{ borderColor: C.border }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: negative ? C.coralPastel : C.mintPastel,
                        color: negative ? C.coralDeep : C.mintDeep,
                      }}
                    >
                      <Icon
                        path={negative ? icons.replay : icons.trend}
                        className="h-[17px] w-[17px]"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold" style={{ color: C.ink }}>
                        {title}
                      </p>
                      <p className="truncate text-[11px]" style={{ color: C.soft }}>
                        {[
                          formatWhen(entry.occurredAt),
                          entry.memberRt ? `RT ${entry.memberRt}` : null,
                          !isPersonal && voided ? 'pembatalan' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <p
                      className="text-[13px] font-extrabold tabular-nums"
                      style={{ color: negative ? C.coralDeep : C.mintDeep }}
                    >
                      {rupiah(entry.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={async () => setVerify(await api(`/api/public/${token}/verify`))}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[12.5px] font-extrabold transition active:scale-[0.99]"
            style={{ borderColor: C.orangeLight, color: C.orangeDeep, backgroundColor: '#FFFFFF' }}
          >
            <Icon path={icons.shield} className="h-[17px] w-[17px]" />
            Verifikasi keaslian catatan
          </button>

          {verify && (
            <p
              className="mt-2 rounded-2xl px-3 py-2.5 text-[11.5px] font-semibold"
              style={{
                backgroundColor: verify.ok ? C.mintPastel : C.coralPastel,
                color: verify.ok ? C.mintDeep : C.coralDeep,
              }}
            >
              {verify.ok ? (
                <>
                  Rantai catatan <strong>SAH</strong> · {verify.totalEntries} entri · kode{' '}
                  <code className="rounded bg-white/80 px-1 font-mono text-[10.5px]">
                    {verify.rootHash.slice(0, 24)}…
                  </code>
                </>
              ) : (
                <>
                  Rantai catatan <strong>TIDAK SAH</strong> ({verify.reason}) mulai entri #
                  {verify.firstBrokenSeq}
                </>
              )}
            </p>
          )}
        </section>

        <p
          className="mt-5 text-center text-[11px] leading-relaxed"
          style={{ color: C.soft }}
        >
          Setiap setoran dicatat sebagai entri berantai hash dan tidak dapat diubah atau dihapus.
          Halaman ini hanya menampilkan nama, RT, dan nominal — tanpa data pribadi lain. Diperbarui{' '}
          {formatWhen(data.generatedAt)}.
        </p>
      </div>
    </main>
  );
}
