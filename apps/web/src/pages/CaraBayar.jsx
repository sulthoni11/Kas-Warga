import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { Badge, Card, Tick } from '../components/ui.jsx';

const COMMUNITY_NAME = 'R2 09 Dukuh Tlobong';
const COMMUNITY_PHONE = '0812-7777-0009';

const BANKS = [
  {
    id: 'bca',
    label: 'Bank BCA',
    number: '5111-0298-771-12',
    nameOnAccount: 'Nyai Retno Wati',
    short: 'BCA',
    tone: '#0060AF',
  },
  {
    id: 'mandiri',
    label: 'Bank Mandiri',
    number: '144-0009-877-3311',
    nameOnAccount: 'Nyai Retno Wati',
    short: 'MDR',
    tone: '#003D79',
  },
  {
    id: 'qris',
    label: 'QRIS',
    number: '0812-7777-0009',
    nameOnAccount: 'Kas Warga R2 09 Tlobong',
    short: 'QR',
    tone: '#E4002B',
  },
];

const PACKAGES = [
  { label: 'Sembako Harian', hint: 'Beras, minyak, telur', options: [25000, 50000, 100000] },
  { label: 'Tabungan Qurban', hint: 'Cicilan menuju hari raya', options: [250000, 500000, 1000000] },
];

function rupiah(value) {
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

export default function CaraBayar() {
  const [method, setMethod] = useState('bca');
  const [packageName, setPackageName] = useState('Sembako Harian');
  const [amount, setAmount] = useState(50000);
  const [copied, setCopied] = useState(false);

  const chosen = BANKS.find((b) => b.id === method) ?? BANKS[0];
  const selectedPackage = PACKAGES.find((p) => p.label === packageName) ?? PACKAGES[0];

  function copyNumber() {
    if (!chosen.number) return;
    navigator.clipboard.writeText(chosen.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function selectPackage(label) {
    setPackageName(label);
    const pkg = PACKAGES.find((p) => p.label === label);
    if (pkg?.options.length) setAmount(pkg.options[0]);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-10 pb-28 sm:px-6 sm:py-14 sm:pb-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand">
          Cara membayar
        </p>
        <h1 className="mt-3 max-w-2xl text-[28px] font-extrabold leading-tight text-ink sm:text-[36px]">
          Transfer atau QRIS ke kas <span className="text-brand">{COMMUNITY_NAME}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          Pilih paket dan nominal, lakukan pembayaran, lalu kirim bukti ke pengurus. Setoran akan
          dicatat ke buku besar dan langsung tampil di portal warga.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Langkah 1 */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">
                1
              </span>
              <h2 className="text-[14.5px] font-extrabold text-ink">Pilih paket &amp; nominal</h2>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {PACKAGES.map((pkg) => {
                const active = packageName === pkg.label;
                return (
                  <button
                    key={pkg.label}
                    type="button"
                    onClick={() => selectPackage(pkg.label)}
                    className={`rounded-2xl border p-3.5 text-left transition-base ${
                      active
                        ? 'border-brand bg-[#FFF4EA] ring-2 ring-brand/15'
                        : 'border-line bg-white hover:border-brand/30'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-extrabold text-ink">{pkg.label}</span>
                      {active && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                          <Tick className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-muted">{pkg.hint}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">
              Nominal
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPackage.options.map((value) => {
                const active = amount === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`rounded-full border px-4 py-2 text-[13px] font-bold tabular-nums transition-base ${
                      active
                        ? 'border-brand bg-brand text-white shadow-lift'
                        : 'border-line bg-white text-ink hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {rupiah(value)}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
              <span className="text-[12.5px] font-semibold text-muted">Nominal pilihan</span>
              <span className="text-[17px] font-extrabold tabular-nums text-ink">
                {rupiah(amount)}
              </span>
            </div>
          </Card>

          {/* Langkah 2 */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">
                2
              </span>
              <h2 className="text-[14.5px] font-extrabold text-ink">Pilih metode</h2>
            </div>

            <div className="mt-4 space-y-2.5">
              {BANKS.map((bank) => {
                const active = method === bank.id;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setMethod(bank.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-base ${
                      active
                        ? 'border-brand bg-[#FFF4EA] ring-2 ring-brand/15'
                        : 'border-line bg-white hover:border-brand/30'
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-[10px] font-extrabold"
                      style={{ color: bank.tone }}
                    >
                      {bank.short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-extrabold text-ink">
                        {bank.label}
                      </span>
                      <span className="block truncate text-[11.5px] tabular-nums text-muted">
                        {bank.number}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        active ? 'border-brand' : 'border-line'
                      }`}
                      aria-hidden
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
              Atas nama <span className="font-bold text-muted">{chosen.nameOnAccount}</span>. Kirim
              bukti ke WhatsApp pengurus setelah membayar.
            </p>
          </Card>
        </div>

        {/* Rekening / QRIS */}
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[14.5px] font-extrabold text-ink">Rekening tujuan</h2>
              <p className="mt-1 text-[12.5px] text-muted">
                {chosen.label} · {chosen.nameOnAccount}
              </p>
            </div>
            <button
              type="button"
              onClick={copyNumber}
              className="rounded-full border border-line bg-white px-4 py-2 text-[12px] font-bold text-ink transition-base hover:border-brand/40 hover:text-brand"
            >
              {copied ? 'Tersalin' : 'Salin nomor'}
            </button>
          </div>

          {chosen.id === 'qris' ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-cream p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
                  <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
                  <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
                  <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h2.5M20.5 14v2.5" />
                </svg>
              </span>
              <p className="mt-3 text-[13.5px] font-extrabold text-ink">
                QRIS belum ditampilkan di demo ini
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">
                Minta kode QRIS resmi ke pengurus lewat WhatsApp, lalu bayar sesuai nominal pilihan.
              </p>
              <a
                href={`https://wa.me/${COMMUNITY_PHONE.replace(/-/g, '')}`}
                className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-[12.5px] font-bold text-white shadow-lift transition-base hover:bg-[#E96A00]"
              >
                Hubungi pengurus
              </a>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-line bg-cream/70 p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">
                Nomor rekening
              </p>
              <p className="mt-1 text-[22px] font-extrabold tracking-tight tabular-nums text-ink sm:text-[26px]">
                {chosen.number}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                a.n. <span className="font-semibold text-ink">{chosen.nameOnAccount}</span>
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
                <Tick className="h-3.5 w-3.5 text-brand" /> Periksa kembali nominal sebelum transfer
              </p>
            </div>
          )}
        </Card>

        {/* Langkah melengkapi */}
        <Card className="mt-4 p-5 sm:p-6">
          <h2 className="text-[14.5px] font-extrabold text-ink">Setelah membayar</h2>
          <ol className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted">
            {[
              'Simpan bukti transfer atau tangkapan layar QRIS.',
              `Kirim bukti ke WhatsApp pengurus: ${COMMUNITY_PHONE}.`,
              'Bendahara mencatat setoran ke buku besar berantai hash.',
              'Buka portal warga untuk memastikan setoran Anda sudah masuk.',
            ].map((text, index) => (
              <li key={text} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brandPastel text-[10.5px] font-extrabold text-brand">
                  {index + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-cream px-3.5 py-2.5 text-[11.5px] leading-relaxed text-faint">
            Tidak ada fitur self-input. Pencatatan tetap dilakukan bendahara agar tercatat resmi.
          </p>
        </Card>

        {/* CTA portal */}
        <div className="mt-6 flex flex-col items-start gap-4 rounded-card border border-line bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">
              Portal warga
            </p>
            <h2 className="mt-1 text-[18px] font-extrabold text-ink">Cek posisi setoran Anda</h2>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
              Tempel tautan dari pengurus untuk melihat saldo, progres paket, dan riwayat mutasi.
            </p>
          </div>
          <Link
            to="/s"
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[13px] font-bold text-white shadow-lift transition-base hover:bg-[#E96A00]"
          >
            Buka portal warga
          </Link>
        </div>
      </main>

      {/* Ringkasan lengket untuk layar kecil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-faint">
              Ringkasan
            </p>
            <p className="truncate text-[13px] font-extrabold text-ink">
              {chosen.label} · <span className="tabular-nums">{rupiah(amount)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={copyNumber}
            className="ml-auto shrink-0 rounded-full bg-brand px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lift"
          >
            {copied ? 'Tersalin' : 'Salin nomor'}
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
