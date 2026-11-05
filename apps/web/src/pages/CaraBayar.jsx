import { useState } from 'react';
import { Link } from 'react-router-dom';

const COMMUNITY_NAME = 'R2 09 Dukuh Tlobong';
const COMMUNITY_PHONE = '0812-7777-0009';

const BANKS = [
  {
    id: 'bca',
    label: 'Bank BCA',
    number: '5111-0298-771-12',
    nameOnAccount: 'Nyai Retno Wati',
    tag: 'BCA',
    color: 'rose',
  },
  {
    id: 'mandiri',
    label: 'Bank Mandiri',
    number: '144-0009-877-3311',
    nameOnAccount: 'Nyai Retno Wati',
    tag: 'MANDIRI',
    color: 'emerald',
  },
  {
    id: 'qris',
    label: 'QRIS',
    number: '0812-7777-0009',
    nameOnAccount: 'Kas Warga R2 09 Tlobong',
    tag: 'QRIS',
    color: 'sky',
  },
];

const PACKAGES = [
  { label: 'Sembako Harian', options: [25000, 50000, 100000] },
  { label: 'Tabungan Qurban', options: [250000, 500000, 1000000] },
];

const COLORS = {
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    tagBg: 'bg-rose-600',
    tagText: 'text-white',
    accent: 'rose',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    tagBg: 'bg-emerald-600',
    tagText: 'text-white',
    accent: 'emerald',
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    tagBg: 'bg-sky-600',
    tagText: 'text-white',
    accent: 'sky',
  },
};

export default function CaraBayar() {
  const [method, setMethod] = useState('bca');
  const [packageName, setPackageName] = useState('Sembako Harian');
  const [amount, setAmount] = useState(50000);
  const [copied, setCopied] = useState(null);

  const banks = BANKS;
  const chosen = banks.find((b) => b.id === method) ?? banks[0];
  const color = COLORS[chosen.color] ?? COLORS.rose;

  const selectedPackage = PACKAGES.find((p) => p.label === packageName) ?? PACKAGES[0];
  const validAmounts = selectedPackage.options;

  function copyNumber() {
    if (chosen.number) {
      navigator.clipboard.writeText(chosen.number);
      setCopied(chosen.id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function selectPackage(label) {
    setPackageName(label);
    const pkg = PACKAGES.find((p) => p.label === label);
    if (pkg && pkg.options.length) setAmount(pkg.options[0]);
  }

  function selectAmount(val) {
    if (validAmounts.includes(val)) setAmount(val);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-500">
        Cara membayar
      </p>

      <h1 className="mt-3 text-2xl font-semibold text-sage-900 sm:text-3xl">
        Transfer / QRIS ke kas{' '}
        <span className="text-gold">{COMMUNITY_NAME}</span>
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-sage-700">
        Pilih metode, masukkan nominal, lalu lakukan pembayaran. Jika sudah, kirim bukti ke
        pengurus kas agar setoran tercatat.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <h2 className="text-sm font-semibold text-sage-900">1. Pilih paket &amp; nominal</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectPackage('Sembako Harian')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                packageName === 'Sembako Harian'
                  ? 'border-sage-700 bg-sage-700 text-white'
                  : 'border-sage-300 bg-white text-sage-700'
              }`}
            >
              Sembako Harian
            </button>
            <button
              type="button"
              onClick={() => selectPackage('Tabungan Qurban')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                packageName === 'Tabungan Qurban'
                  ? 'border-sage-700 bg-sage-700 text-white'
                  : 'border-sage-300 bg-white text-sage-700'
              }`}
            >
              Tabungan Qurban
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {validAmounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => selectAmount(val)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium tabular-nums ${
                  amount === val
                    ? 'border-sage-700 bg-sage-700 text-white'
                    : 'border-sage-300 bg-white text-sage-700'
                }`}
              >
                Rp {val.toLocaleString('id-ID')}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-sage-50 p-3 text-sm text-sage-700">
            Nominal pilihan:{' '}
            <span className="font-semibold text-sage-900">
              Rp {amount.toLocaleString('id-ID')}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-white/70 p-5">
          <h2 className="text-sm font-semibold text-sage-900">2. Pilih metode</h2>
          <div className="mt-3 grid gap-2">
            {banks.map((bank) => {
              const isSelected = method === bank.id;
              const bankColor = COLORS[bank.color] ?? COLORS.rose;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setMethod(bank.id)}
                  className={`flex w-full items-center justify-between rounded-xl border ${
                    isSelected ? `${bankColor.border} border-current` : 'border-sage-300'
                  } ${isSelected ? bankColor.bg : 'bg-white'} px-3 py-2 text-sm ${
                    isSelected ? bankColor.text : 'text-sage-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full ${bankColor.tagBg} px-2 py-0.5 text-[10px] font-semibold ${bankColor.tagText}`}
                    >
                      {bank.tag}
                    </span>
                    <span className="font-medium">{bank.label}</span>
                  </span>
                  <span className="text-[11px] text-sage-500">{bank.number}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {method && chosen && (
        <section className="mt-6 rounded-2xl border border-sage-100 bg-white/80 p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-sage-900">Metode &amp; rekening</h2>
              <p className="mt-1 text-sm text-sage-700">
                {chosen.label} - {chosen.number}
              </p>
              <p className="mt-1 text-xs text-sage-500">Atas nama {chosen.nameOnAccount}</p>
            </div>
            <button
              type="button"
              onClick={copyNumber}
              className={`rounded-xl border ${color.border} ${color.bg} px-3 py-1.5 text-xs font-medium ${color.text} ${
                copied === chosen.id ? 'ring-2 ring-offset-2 ring-sage-400' : ''
              }`}
            >
              {copied === chosen.id ? 'Tersalin' : 'Salin rekening'}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-sage-200 bg-white p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-sage-500">QRIS (jika memilih QRIS)</p>
            <div className="mt-2 flex justify-center">
              <div className="h-32 w-32 overflow-hidden rounded-xl border border-sage-300 bg-sage-100 p-3">
                <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
                  <rect x="5" y="5" width="90" height="90" rx="4" className="fill-sage-100 stroke-sage-300" />
                  <rect x="15" y="15" width="10" height="10" className="fill-sage-900" />
                  <rect x="30" y="15" width="10" height="10" className="fill-sage-900" />
                  <rect x="45" y="15" width="10" height="10" className="fill-sage-900" />
                  <rect x="60" y="15" width="10" height="10" className="fill-sage-900" />
                  <rect x="75" y="15" width="10" height="10" className="fill-sage-900" />
                  <rect x="15" y="35" width="10" height="10" className="fill-sage-900" />
                  <rect x="30" y="35" width="10" height="10" className="fill-sage-900" />
                  <rect x="45" y="35" width="10" height="10" className="fill-sage-900" />
                  <rect x="60" y="35" width="10" height="10" className="fill-sage-900" />
                  <rect x="75" y="35" width="10" height="10" className="fill-sage-900" />
                  <rect x="15" y="55" width="10" height="10" className="fill-sage-900" />
                  <rect x="30" y="55" width="10" height="10" className="fill-sage-900" />
                  <rect x="45" y="55" width="10" height="10" className="fill-sage-900" />
                  <rect x="60" y="55" width="10" height="10" className="fill-sage-900" />
                  <rect x="75" y="55" width="10" height="10" className="fill-sage-900" />
                  <rect x="15" y="75" width="10" height="10" className="fill-sage-900" />
                  <rect x="30" y="75" width="10" height="10" className="fill-sage-900" />
                  <rect x="45" y="75" width="10" height="10" className="fill-sage-900" />
                  <rect x="60" y="75" width="10" height="10" className="fill-sage-900" />
                  <rect x="75" y="75" width="10" height="10" className="fill-sage-900" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-xs text-sage-500">
              QRIS ini hanya contoh. Scan QR dari aplikasi bank dan bayar sesuai nominal.
            </p>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-gold/40 bg-white/80 p-5">
        <h2 className="text-sm font-semibold text-sage-900">Cara melengkapi</h2>
        <ol className="mt-3 space-y-2 text-sm text-sage-700 list-decimal list-inside">
          <li>Pilih metode dan nominal di atas.</li>
          <li>Lakukan pembayaran lewat bank / QRIS sesuai rekening / QR di atas.</li>
          <li>Kirim bukti transfer / QR ke <a href={`https://wa.me/${COMMUNITY_PHONE}`} className="font-medium underline">{COMMUNITY_PHONE}</a>.</li>
          <li>Bendahara akan mencatat setoran ke sistem; saldo Anda akan tampil di portal warga.</li>
        </ol>
        <p className="mt-3 text-xs text-sage-500">
          Tidak ada fitur self-input. Pencatatan tetap dilakukan oleh bendahara agar transparan.
        </p>
      </section>

      <div className="mt-8 rounded-xl border border-sage-300 bg-white/90 p-6 text-center sm:p-8">
        <p className="text-xs uppercase tracking-wide text-sage-500">Portal warga</p>
        <h2 className="mt-2 text-xl font-semibold text-sage-900">Buka portal warga</h2>
        <p className="mt-2 text-sm text-sage-700">
          Cek posisi dan riwayat setoran Anda setelah tercatat.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            to="/s"
            className="inline-flex rounded-xl bg-sage-700 px-5 py-2 text-sm font-medium text-white"
          >
            Buka portal warga
          </Link>
        </div>
        <p className="mt-2 text-xs text-sage-500">
          Token portal akan diberikan oleh pengurus setelah setoran masuk.
        </p>
      </div>

      <footer className="mt-10 text-xs text-sage-500">
        Smart Community Festive Fund · Rekening &amp; QRIS dalam mode dummy.
      </footer>
    </main>
  );
}
