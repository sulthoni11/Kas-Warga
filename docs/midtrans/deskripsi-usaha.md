# Isian Form dan Lampiran Produk

Semua teks di bawah siap ditempel ke form Midtrans. Ganti `[...]` bila perlu.

---

## 1. Data usaha

| Kolom | Isian |
|---|---|
| Nama usaha | KasWarga |
| Nama badan/perorangan | [Nama Lengkap sesuai KTP] |
| Jenis usaha | Penyedia aplikasi pencatatan kas dan pembayaran iuran warga |
| Kategori bisnis | Teknologi / Perangkat Lunak (bukan Investment) |
| Situs web | https://kas-warga-sulthoni11s-projects.vercel.app/s |
| Alamat usaha | [Alamat komunitas/sekretariat] |
| PIC | [Nama], [Jabatan], [No. HP], [Email] |

## 2. Deskripsi singkat (maks. 300 karakter)

> KasWarga adalah aplikasi pencatatan kas dan iuran untuk komunitas RT/RW. Pengurus mencatat
> setoran, pengeluaran, dan tagihan; warga memantau lewat portal transparansi berbasis
> tautan. Dana iuran masuk ke rekening komunitas, bukan ditampung platform.

## 3. Deskripsi lengkap

> KasWarga membantu pengurus RT/RW mengelola kas warga secara transparan. Pengurus mencatat
> setoran iuran, pengeluaran, dan paket tabungan dari aplikasi Android. Setiap catatan masuk
> ke buku besar berantai hash sehingga perubahan atau penghapusan diam-diam dapat dideteksi.
>
> Warga tidak perlu membuat akun. Pengurus membuat tautan portal untuk komunitas atau untuk
> satu anggota, lalu membagikannya lewat WhatsApp. Portal menampilkan saldo, target, progres
> paket, riwayat mutasi, dan tombol verifikasi keaslian catatan.
>
> KasWarga bukan dompet digital dan tidak menampung dana. Uang iuran dibayar warga langsung
> ke rekening komunitas atau tunai ke bendahara, lalu dicatat di aplikasi.

## 4. Alur dana (tempel juga sebagai halaman lampiran)

1. Pengurus menerbitkan tagihan iuran atau paket tabungan untuk anggota.
2. Warga membayar melalui transfer ke rekening komunitas **[Bank] [No. Rekening]** atas nama
   **[Nama Rekening]**, atau tunai ke bendahara.
3. Bendahara mencatat setoran di aplikasi; entri diberi hash dan masuk rantai ledger.
4. Warga membuka tautan portal dan memeriksa saldo serta riwayatnya.
5. Dana tidak pernah disimpan atau dialihkan oleh pengelola aplikasi. Tidak ada pencairan,
   penarikan otomatis, maupun penerusan dana ke pihak ketiga.

## 5. Data yang disimpan (untuk Kebijakan Privasi)

- Nama anggota, nomor RT, dan Nomor HP bila diisi pengurus
- Nominal, tanggal, jenis mutasi, dan catatan setoran
- Tidak ada data kartu, PIN, atau kredensial perbankan
- Portal hanya menampilkan nama, RT, nominal, dan waktu; tidak menampilkan kontak atau
  alamat lengkap
- Tautan portal dapat dicabut pengurus kapan saja

## 6. Lampiran tangkapan layar

Ambil dengan mode terang, ukuran penuh, tanpa data pribadi berlebih.

| # | Halaman | Cara |
|---|---|---|
| 1 | Portal warga komunitas | buka `https://kas-warga-sulthoni11s-projects.vercel.app/s` lalu tempel tautan komunitas |
| 2 | Portal warga pribadi | tautan anggota; tunjukkan bagian "Posisi Anda" |
| 3 | Layar login aplikasi pengurus | ambil dari emulator/HP |
| 4 | Dashboard pengurus | tunjukkan saldo dan ringkasan |
| 5 | Form catat setoran | tunjukkan pilihan anggota, paket, nominal |
| 6 | Layar buat tautan portal | tunjukkan tombol bagikan |
| 7 | Verifikasi keaslian catatan | tekan tombol verifikasi di portal, tangkap hasilnya |

Beri nama file `01-portal-komunitas.png` sampai `07-verifikasi.png` agar mudah dirujuk di
email.

## 7. Bila diminta dokumen aggregator

Tambahan yang perlu disiapkan:

- Perjanjian kerja sama dengan tiap komunitas: hak dan kewajiban, siapa pemilik dana,
  kapan dana diteruskan, dan biaya layanan (bila ada).
- Bukti rekonsiliasi: daftar transaksi masuk dan penerusan ke rekening komunitas.
- Struktur organisasi dan penanggung jawab kepatuhan.
- Pernyataan bahwa dana tidak dipakai untuk kegiatan lain (tidak ada float).
