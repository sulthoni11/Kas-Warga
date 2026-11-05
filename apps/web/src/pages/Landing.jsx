import { Link } from 'react-router-dom';

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
    body: 'Satu setoran dicatat sekali: anggota, paket, nominal, metode, dan waktunya. Data lain seperti jadwal cicilan dihitung otomatis.',
  },
  {
    title: 'Sistem mengunci catatan',
    body: 'Setiap catatan menjadi satu entri berantai hash SHA-256. Entri baru selalu membawa sidik entri sebelumnya, sehingga rantainya tidak bisa diputus.',
  },
  {
    title: 'Warga menerima satu tautan',
    body: 'Pengurus membuat tautan portal. Warga membukanya tanpa perlu membuat akun atau mengingat kata sandi.',
  },
  {
    title: 'Siapa pun bisa memeriksa',
    body: 'Tombol verifikasi menghitung ulang seluruh rantai. Bila satu baris di database diubah langsung, hasilnya langsung berubah menjadi tidak sah.',
  },
];

const features = [
  {
    title: 'Buku besar hanya-tambah',
    body: 'Tidak ada tombol hapus untuk catatan keuangan. Salah input diperbaiki dengan entri pembatalan dan entri baru, sehingga riwayat tetap utuh.',
  },
  {
    title: 'Portal warga tanpa akun',
    body: 'Tautan bertoken menampilkan total terkumpul, progres tiap paket, dan mutasi terbaru. Halaman ikut diperbarui tanpa muat ulang.',
  },
  {
    title: 'Target & cicilan otomatis',
    body: 'Tentukan target dan tanggal jatuh tempo; sistem menyusun cicilan harian, mingguan, atau bulanan yang totalnya tepat sama dengan target.',
  },
  {
    title: 'Rekap per RT',
    body: 'Setiap anggota punya nomor RT. Pengurus bisa menyaring daftar anggota dan melihat terkumpul serta tunggakan tiap RT.',
  },
  {
    title: 'Pengingat terjadwal',
    body: 'Sistem mengumpulkan anggota yang cicilannya jatuh tempo atau sudah lewat, lalu menyiapkan pengingat satu kali per hari per anggota.',
  },
  {
    title: 'Laporan siap unduh',
    body: 'Daftar tunggakan dapat diunduh sebagai CSV berisi nama, RT, nomor telepon, total setoran, dan jumlah cicilan tertunggak.',
  },
];

const roles = [
  {
    name: 'Bendahara',
    body: 'Mencatat setoran, mengoreksi kesalahan, mengelola anggota dan paket, serta menjalankan pengingat.',
  },
  {
    name: 'Ketua',
    body: 'Mengawasi: melihat seluruh data, memverifikasi rantai catatan, dan mengunduh laporan tanpa bisa mengubah apa pun.',
  },
  {
    name: 'Super Admin',
    body: 'Mengelola akun pengurus dan perannya, di samping kewenangan pencatatan seperti bendahara.',
  },
  {
    name: 'Warga',
    body: 'Membuka tautan portal untuk melihat posisi kas komunitas dan memastikan setorannya tercatat.',
  },
];

const guarantees = [
  {
    title: 'Rantai hash SHA-256',
    body: 'Setiap entri menyimpan hash dirinya dan hash entri sebelumnya. Mengubah satu nilai akan membuat seluruh rantai setelahnya tidak cocok.',
  },
  {
    title: 'Hak akses database dibatasi',
    body: 'Akun aplikasi hanya boleh membaca dan menambah pada tabel ledger. Perintah ubah dan hapus ditolak oleh hak akses maupun trigger database.',
  },
  {
    title: 'Token portal acak 32 byte',
    body: 'Tautan warga memakai token acak yang hanya disimpan dalam bentuk hash, punya masa berlaku, dan bisa dicabut kapan saja.',
  },
  {
    title: 'Sesi pengurus terlindungi',
    body: 'Kata sandi disimpan sebagai hash scrypt, sesi memakai cookie httpOnly, dan percobaan masuk yang gagal berulang akan dikunci sementara.',
  },
];

export default function Landing({ note }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-500">
        Smart Community Festive Fund
      </p>

      <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-sage-900 sm:text-4xl">
        Dana warga yang tercatat rapi,{' '}
        <span className="text-gold">tidak bisa diubah diam-diam.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sage-700 sm:text-base">
        SCFF adalah platform pengelolaan dana komunitas — tabungan qurban, paket sembako, kas RT,
        hingga iuran musiman. Setiap rupiah yang masuk dicatat ke buku besar berantai hash, sehingga
        pengurus bekerja lebih cepat, warga dapat memeriksa kapan saja lewat satu tautan, dan tidak
        ada pihak yang bisa menghapus atau menyunting riwayat keuangan.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          to="/admin"
          className="rounded-xl bg-sage-700 px-4 py-2 text-sm font-medium text-white"
        >
          Masuk panel pengurus
        </Link>
        <span className="rounded-xl border border-sage-300 bg-white/60 px-4 py-2 text-sm text-sage-700">
          Akun pengurus: bendahara@gmail.com / 12345678
        </span>
      </div>

      <p className="mt-2 text-xs text-sage-500">
        Warga tidak perlu membuat akun. Tautan portal dibuat dan dibagikan oleh pengurus komunitas.
      </p>

      {note && (
        <p className="mt-6 rounded-xl border border-sage-100 bg-white/70 px-4 py-3 text-sm text-sage-700">
          {note}
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-sage-900">Masalah yang diselesaikan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {problems.map((item) => (
            <article key={item.title} className="rounded-2xl border border-sage-100 bg-white/70 p-5">
              <h3 className="text-sm font-semibold text-sage-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sage-700">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-sage-900">Cara kerja</h2>
        <p className="mt-1 text-sm text-sage-700">
          Empat langkah, dari setoran tunai di tangan bendahara sampai warga bisa memeriksanya
          sendiri.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {steps.map((item, index) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-2xl border border-sage-100 bg-white/70 p-5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-700 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-sage-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sage-700">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-sage-900">Fitur utama</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <article key={item.title} className="rounded-2xl border border-sage-100 bg-white/70 p-5">
              <h3 className="text-sm font-semibold text-sage-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sage-700">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-sage-900">Peran pengguna</h2>
        <p className="mt-1 text-sm text-sage-700">
          Pencatat dan pengawas dipisahkan agar kontrol internal tetap berjalan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {roles.map((item) => (
            <article key={item.name} className="rounded-2xl border border-sage-100 bg-white/70 p-5">
              <h3 className="text-sm font-semibold text-sage-900">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sage-700">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gold/40 bg-white/80 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-sage-900">Integritas &amp; keamanan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {guarantees.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold text-sage-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-sage-700">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-sage-100 bg-sage-50/60 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-sage-900">Cara Bayar</h2>
        <p className="mt-2 text-sm leading-relaxed text-sage-700">
          Pembayaran warga dilakukan lewat transfer bank atau QRIS ke rekening kas komunitas.
          Setiap setoran yang diterima akan dicatat langsung ke buku besar berantai hash oleh
          bendahara, dan otomatis muncul di portal warga tanpa perlu login. Berikut langkah mudah
          untuk menyetor:
        </p>
        <ol className="mt-3 space-y-2 text-sm text-sage-700 list-decimal list-inside">
          <li>Pilih metode pembayaran: transfer bank (BCA / Mandiri) atau QRIS.</li>
          <li>Isi nominal sesuai paket yang akan dibayar.</li>
          <li>Lakukan pembayaran melalui rekening atau scan QRIS.</li>
          <li>Kirim bukti pembayaran ke pengurus kas untuk verifikasi.</li>
          <li>Bendahara mencatat setoran, dan saldo Anda langsung terlihat di portal warga.</li>
        </ol>
        <p className="mt-3 text-xs text-sage-500">
          Pembayaran bisa juga lewat cara konvensional: tunai langsung ke bendahara atau transfer
          ke rekening kas. Setiap metode terintegrasi dengan sistem pencatatan otomatis.
        </p>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-sage-100 pt-5 text-xs text-sage-500">
        <span>© 2026 Smart Community Festive Fund · R2 09 Dukuh Tlobong</span>
        <Link to="/admin" className="font-medium text-sage-700 underline">
          Panel pengurus
        </Link>
      </footer>
    </main>
  );
}
