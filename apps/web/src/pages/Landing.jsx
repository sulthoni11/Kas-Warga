import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { Badge, Card, SectionHeading, Tick } from '../components/ui.jsx';

const problems = [
  {
    title: 'Catatan mudah disunting',
    body: 'Buku kas manual dan spreadsheet bisa diubah atau dihapus tanpa jejak. Saat angka tidak cocok, tidak ada bukti siapa mengubah apa.',
  },
  {
    title: 'Warga menunggu rapat',
    body: 'Saldo terbaru hanya diketahui saat rapat bulanan. Warga yang ingin memastikan setorannya masuk harus bertanya ke pengurus.',
  },
  {
    title: 'Administrasi menyita waktu',
    body: 'Mencatat puluhan setoran, menghitung cicilan, dan menagih satu per satu lewat pesan pribadi menghabiskan waktu pengurus.',
  },
];

const steps = [
  {
    title: 'Pengurus mencatat setoran',
    body: 'Satu setoran dicatat sekali: anggota, paket, nominal, metode, dan waktunya. Jadwal cicilan dihitung otomatis.',
  },
  {
    title: 'Sistem mengunci catatan',
    body: 'Setiap entri berantai hash SHA-256. Entri baru membawa sidik entri sebelumnya, sehingga rantainya tidak bisa diputus.',
  },
  {
    title: 'Warga menerima satu tautan',
    body: 'Pengurus membuat tautan portal. Warga membukanya tanpa membuat akun atau mengingat kata sandi.',
  },
  {
    title: 'Siapa pun bisa memeriksa',
    body: 'Tombol verifikasi menghitung ulang seluruh rantai. Bila satu baris di database diubah langsung, hasilnya tidak sah.',
  },
];

const features = [
  {
    icon: 'ledger',
    title: 'Buku besar hanya-tambah',
    body: 'Tidak ada tombol hapus. Salah input diperbaiki dengan entri pembatalan dan entri baru, riwayat tetap utuh.',
  },
  {
    icon: 'globe',
    title: 'Portal warga tanpa akun',
    body: 'Tautan bertoken menampilkan total terkumpul, progres paket, dan mutasi terbaru — diperbarui tanpa muat ulang.',
  },
  {
    icon: 'target',
    title: 'Target & cicilan otomatis',
    body: 'Tentukan target dan jatuh tempo; sistem menyusun cicilan harian, mingguan, atau bulanan yang totalnya tepat.',
  },
  {
    icon: 'users',
    title: 'Rekap per RT',
    body: 'Setiap anggota punya nomor RT. Pengurus menyaring anggota dan melihat terkumpul serta tunggakan tiap RT.',
  },
  {
    icon: 'bell',
    title: 'Pengingat terjadwal',
    body: 'Sistem mengumpulkan anggota yang cicilannya jatuh tempo dan menyiapkan satu pengingat per hari per anggota.',
  },
  {
    icon: 'download',
    title: 'Laporan siap unduh',
    body: 'Daftar tunggakan diunduh sebagai CSV berisi nama, RT, telepon, total setoran, dan jumlah cicilan tertunggak.',
  },
];

const roles = [
  {
    name: 'Bendahara',
    tone: 'brand',
    body: 'Mencatat setoran, mengoreksi kesalahan, mengelola anggota dan paket, serta menjalankan pengingat.',
  },
  {
    name: 'Ketua',
    tone: 'cream',
    body: 'Mengawasi: melihat seluruh data, memverifikasi rantai catatan, dan membagikan tautan portal.',
  },
  {
    name: 'Super Admin',
    tone: 'cream',
    body: 'Mengelola akun pengurus dan perannya, di samping kewenangan pencatatan seperti bendahara.',
  },
  {
    name: 'Warga',
    tone: 'mint',
    body: 'Membuka tautan portal untuk melihat posisi kas komunitas dan memastikan setorannya tercatat.',
  },
];

const guarantees = [
  {
    title: 'Rantai hash SHA-256',
    body: 'Setiap entri menyimpan hash dirinya dan hash entri sebelumnya. Mengubah satu nilai membuat seluruh rantai setelahnya tidak cocok.',
  },
  {
    title: 'Hak akses database dibatasi',
    body: 'Akun aplikasi hanya boleh membaca dan menambah pada tabel ledger. Perintah ubah dan hapus ditolak hak akses maupun trigger database.',
  },
  {
    title: 'Token portal acak 32 byte',
    body: 'Tautan warga memakai token acak yang disimpan sebagai hash, punya masa berlaku, dan bisa dicabut kapan saja.',
  },
  {
    title: 'Sesi pengurus terlindungi',
    body: 'Kata sandi disimpan sebagai hash scrypt, sesi memakai cookie httpOnly, dan percobaan masuk gagal berulang dikunci sementara.',
  },
];

const iconPaths = {
  ledger: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M4 8h12M8 12h8M8 16h5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M16 14.2c2.6.2 4.5 2 4.5 4.8" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2.8 5 1.5 6H5c.7-1 1.5-2.8 1.5-6z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5" />
      <path d="M4.5 17.5v1A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-1" />
    </>
  ),
};

function FeatureIcon({ name }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brandPastel text-brand">
      <svg
        viewBox="0 0 24 24"
        className="h-[20px] w-[20px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {iconPaths[name]}
      </svg>
    </span>
  );
}

export default function Landing({ note }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-brandPastel/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 top-44 h-64 w-64 rounded-full bg-[#FFE9D6] blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand">
                Smart Community Festive Fund
              </p>
              <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[46px]">
                Dana warga yang tercatat rapi,{' '}
                <span className="text-brand">tidak bisa diubah diam-diam.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-muted sm:text-[16px]">
                KasWarga mengelola tabungan qurban, paket sembako, kas RT, hingga iuran musiman.
                Setiap rupiah masuk ke buku besar berantai hash — pengurus bekerja lebih cepat,
                warga memeriksa kapan saja lewat satu tautan.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/s"
                  className="rounded-full bg-brand px-6 py-3 text-[14px] font-bold text-white shadow-lift transition-base hover:bg-[#E96A00] active:scale-[0.99]"
                >
                  Buka portal warga
                </Link>
                <Link
                  to="/bayar"
                  className="rounded-full border border-line bg-white px-6 py-3 text-[14px] font-bold text-ink transition-base hover:border-brand/40 hover:text-brand"
                >
                  Cara membayar
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-semibold text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Tick className="h-3.5 w-3.5 text-brand" /> Tanpa akun
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Tick className="h-3.5 w-3.5 text-brand" /> Bukti hash SHA-256
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Tick className="h-3.5 w-3.5 text-brand" /> Pembaruan langsung
                </span>
              </div>

              <p className="mt-4 text-[12px] text-faint">
                Pengurus mencatat lewat aplikasi Android. Warga cukup membuka tautan yang dibagikan.
              </p>

              {note && (
                <p className="mt-5 rounded-2xl border border-line bg-white/80 px-4 py-3 text-[13px] text-muted">
                  {note}
                </p>
              )}
            </div>

            {/* Visual bukti: ringkasan kas seperti di portal */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-x-8 -bottom-5 h-28 rounded-[32px] bg-brandPastel/70 blur-xl" />
              <Card soft className="relative p-5">
                <div className="flex items-center justify-between">
                  <Badge tone="mint">
                    <Tick className="h-3 w-3" /> Rantai sah
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-faint">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2E9E67]" />
                    Live
                  </span>
                </div>

                <div className="mt-4 rounded-[22px] bg-gradient-to-br from-brand to-brandLight p-5 text-white shadow-lift">
                  <p className="text-[12.5px] font-bold text-white/90">Kas terkumpul</p>
                  <p className="mt-1 text-[30px] font-extrabold leading-tight tabular-nums">
                    Rp 4.700.000
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full w-full rounded-full bg-white" />
                  </div>
                  <p className="mt-2 text-[11.5px] font-semibold text-white/90">
                    100% dari target Rp 4.700.000
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-line bg-cream/70 p-3">
                    <p className="text-[16px] font-extrabold tabular-nums text-ink">6</p>
                    <p className="text-[10.5px] font-semibold text-muted">Anggota aktif</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-cream/70 p-3">
                    <p className="text-[16px] font-extrabold tabular-nums text-ink">127</p>
                    <p className="text-[10.5px] font-semibold text-muted">Entri ledger</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    ['ahmad', 'Rp 100.000'],
                    ['Agus Riyanto', 'Rp 12.000'],
                  ].map(([name, amount]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-2xl border border-line/80 bg-white px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brandPastel text-[10px] font-extrabold text-brand">
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink">{name}</span>
                      </span>
                      <span className="text-[12.5px] font-extrabold tabular-nums text-ink">
                        {amount}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Masalah */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="01 · Masalah"
            title="Buku kas manual bikin rawan salah paham"
            lead="Bukan soal kejujuran pengurus, tapi soal alat yang tidak menyimpan bukti."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {problems.map((item, index) => (
              <Card key={item.title} className="p-6 hover:-translate-y-0.5 hover:shadow-soft">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brandPastel text-[12px] font-extrabold text-brand">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-[15px] font-extrabold text-ink">{item.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Cara kerja */}
        <section className="border-y border-line/70 bg-white/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <SectionHeading
              eyebrow="02 · Cara kerja"
              title="Empat langkah, dari setoran tunai sampai warga bisa memeriksa"
              lead="Satu alur pendek yang bisa diajarkan ke pengurus baru dalam beberapa menit."
            />
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {steps.map((item, index) => (
                <li key={item.title} className="flex gap-4 rounded-card border border-line bg-cream/50 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Fitur */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="03 · Fitur"
            title="Yang membuat administrasi kas lebih ringan"
            lead="Dirancang untuk kebutuhan RT/RW: sederhana untuk pengurus, jelas untuk warga."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="p-6">
                <FeatureIcon name={item.icon} />
                <h3 className="mt-4 text-[15px] font-extrabold text-ink">{item.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Peran */}
        <section className="border-y border-line/70 bg-white/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <SectionHeading
              eyebrow="04 · Peran"
              title="Pencatat dan pengawas dipisahkan"
              lead="Kontrol internal tetap berjalan tanpa menambah pekerjaan administratif."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {roles.map((item) => (
                <Card key={item.name} className="flex flex-col gap-3 p-6">
                  <Badge tone={item.tone} className="w-fit">
                    {item.name}
                  </Badge>
                  <p className="text-[13.5px] leading-relaxed text-muted">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Integritas */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-[28px] bg-ink px-6 py-10 text-white sm:px-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brandLight">
              05 · Integritas &amp; keamanan
            </p>
            <h2 className="mt-3 max-w-xl text-[24px] font-extrabold leading-tight sm:text-[30px]">
              Bukti yang bisa diperiksa siapa pun, bukan janji di grup WhatsApp.
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {guarantees.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brandLight">
                    <Tick className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
          <div className="flex flex-col items-start gap-5 rounded-[28px] border border-line bg-white p-7 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div>
              <h2 className="text-[20px] font-extrabold text-ink sm:text-[24px]">
                Sudah punya tautan dari pengurus?
              </h2>
              <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted">
                Tempel tautannya dan lihat posisi kas komunitas Anda sekarang. Tidak perlu membuat
                akun atau mengingat kata sandi.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Link
                to="/s"
                className="rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white shadow-lift transition-base hover:bg-[#E96A00]"
              >
                Buka portal warga
              </Link>
              <Link
                to="/bayar"
                className="rounded-full border border-line px-5 py-2.5 text-[13.5px] font-bold text-ink transition-base hover:border-brand/40 hover:text-brand"
              >
                Cara membayar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
