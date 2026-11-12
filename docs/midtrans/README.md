# Paket Dokumen Pendukung Usaha — Midtrans

Dipakai untuk menjawab email Midtrans yang meminta **Business Supporting Document** untuk
GoPay QRIS Aggregator, Bank Transfer Aggregator, GoPay eMoney Aggregator, dan BSI Virtual
Account Aggregator.

Isi folder ini:

| File | Isi |
|---|---|
| `README.md` | langkah, checklist dokumen, isian form |
| `email-midtrans.md` | draf email siap kirim ke Midtrans |
| `surat-pernyataan-usaha.md` | surat pernyataan + surat keterangan komunitas untuk ditandatangani |
| `deskripsi-usaha.md` | teks isian form, alur dana, dan daftar tangkapan layar |

---

## 0. Putuskan jalur sebelum mengunggah

**Jalur A — disarankan.** KasWarga adalah kas komunitas RT/RW, dana masuk ke rekening
komunitas, bukan platform yang menampung dana pihak lain. Maka **tidak perlu** metode
Aggregator. Cukup QRIS, GoPay, dan Bank Transfer reguler — syaratnya KTP + rekening
(kondisi saat ini sudah terpenuhi). Kirim draf di `email-midtrans.md` bagian **A**.

**Jalur B.** Tetap ingin mengaktifkan metode Aggregator. Perlu dokumen usaha lengkap dan
biasanya badan usaha (PT/CV) dengan NPWP badan. Sebagai perorangan/komunitas peluang
disetujui kecil, dan bila dana komunitas ditampung dulu oleh pengelola aplikasi, itu masuk
ranah izin PJP. Kirim bagian **B**, dan siapkan dokumen tambahan di bagian 4.

---

## 1. Dokumen yang disiapkan

Isi kolom Status dengan `ada` / `belum` sebelum mengirim.

| # | Dokumen | Sifat | Status |
|---|---|---|---|
| 1 | KTP pengurus yang namanya sama dengan rekening penerima | wajib | |
| 2 | NPWP — NIK 16 digit, atau tangkapan layar profil Coretax | wajib untuk metode selain QRIS/GoPay/transfer | |
| 3 | Halaman depan buku tabungan atau tangkapan layar mutasi 1–3 bulan terakhir | wajib | |
| 4 | NIB dari OSS **atau** Surat Keterangan Usaha/Domisili Usaha dari kelurahan | pendukung utama | |
| 5 | SK Pengurus RT/RW atau surat keterangan dari Dukuh/Kelurahan | pendukung komunitas | |
| 6 | Surat Pernyataan Usaha — `surat-pernyataan-usaha.md` | wajib | |
| 7 | Surat Penunjukan Bendahara — `surat-pernyataan-usaha.md` | pendukung | |
| 8 | Foto sekretariat/lokasi kegiatan dan papan nama (bila ada) | pendukung | |
| 9 | Tangkapan layar portal warga dan dashboard aplikasi pengurus | wajib (bukti produk) | |
| 10 | Alur dana satu halaman — `deskripsi-usaha.md` | wajib | |
| 11 | Syarat & Ketentuan serta Kebijakan Privasi di website | **belum ada** — lihat bagian 5 | |
| 12 | Perjanjian kerja sama dengan komunitas (hanya Jalur B) | khusus aggregator | |

Catatan NPWP: sejak 2024 NIK orang pribadi berfungsi sebagai NPWP 16 digit. Cek di
`coretaxdjp.pajak.go.id`; bila belum terdaftar, pendaftaran gratis dan online di
`pajak.go.id` (e-Registration) dengan KTP, KK, email, nomor HP. Jangan memakai NPWP orang
lain — Midtrans mencocokkan nama KTP, rekening, dan dokumen.

---

## 2. Gabung jadi satu PDF

Urutan halaman:

1. **Halaman sampul** — judul "Dokumen Pendukung Usaha — KasWarga", tanggal, nama pengurus, email, nomor HP.
2. Identitas (KTP, NPWP).
3. Legalitas (NIB/SKU, SK pengurus).
4. Operasional (rekening, foto lokasi, foto kegiatan).
5. Produk (alur dana, tangkapan layar portal dan dashboard).
6. Surat pernyataan dan surat penunjukan yang sudah ditandatangani.

- Nama file: `KasWarga-Dokumen-Pendukung-Usaha-2026-11.pdf`
- Ukuran di bawah 5 MB. Bila form menolak, kompres gambar atau unggah per bagian.
- Semua halaman terbaca tegak, tidak terpotong, tidak buram.
- Jangan menutupi NIK, nomor rekening, atau stempel. Bila perlu sensor, sensor hanya
  bagian yang tidak diminta (mis. saldo), dan konsisten.

---

## 3. Isi form pengajuan

Semua teks siap tempel ada di `deskripsi-usaha.md`:

- Nama usaha: **KasWarga**
- Kategori: teknologi / perangkat lunak (bukan Investment)
- Situs: `https://kas-warga-sulthoni11s-projects.vercel.app/s`
- Deskripsi singkat dan alur dana: salin dari file tersebut.

---

## 4. Kirim dan tindak lanjut

1. Unggah lampiran lewat tautan di email Midtrans, **atau** balas email dengan lampiran.
2. Kirim juga lewat menu **Hubungi Kami** di dashboard Midtrans agar tiket tercatat.
3. Simpan nomor tiket dan tanggal kirim.
4. Balasan biasanya 3–7 hari kerja. Bila lewat 10 hari kerja, kirim susulan singkat dengan
   nomor tiket.
5. Bila diminta dokumen tambahan, unggah hanya yang diminta dan sebut nomor tiket.

Hal yang membuat pengajuan ditolak: nama rekening berbeda dengan KTP, dokumen hasil edit,
klaim sebagai PT/CV padahal perorangan, dan website tanpa halaman syarat/privasi.

---

## 5. Kekurangan yang perlu ditutup dulu

Website KasWarga saat ini belum punya halaman **Syarat & Ketentuan** dan **Kebijakan
Privasi**. Midtrans memeriksa keduanya pada pengajuan, terutama untuk metode tambahan.
Minimal halaman itu memuat: siapa pengelola, data apa yang disimpan (nama, RT, nominal,
waktu setoran), untuk apa, siapa yang bisa melihat, dasar pemakaian, dan kontak pengelola.

Halaman itu bisa dibuat sebagai rute `/syarat` dan `/privasi` di aplikasi web sebelum
dokumen dikirim.
