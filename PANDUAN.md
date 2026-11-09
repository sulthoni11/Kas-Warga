# Panduan Pemakaian SCFF

Dokumen ini menjelaskan **apa yang bisa dilakukan aplikasi** dan **bagaimana cara memakainya**,
ditulis untuk orang yang baru pertama kali membukanya.

Acuan kebutuhan: [`PRD.md`](./PRD.md). Ringkasan teknis: [`README.md`](./README.md).

---

## 1. Gambaran besar: siapa memakai apa

SCFF punya dua pintu masuk.

| Pintu | Alamat | Siapa | Perlu login? |
|---|---|---|---|
| Panel pengurus | `/admin` | Bendahara, Ketua, Super Admin | **Ya** |
| Portal warga | `/s/<token>` | Warga / siapa pun yang punya tautan | **Tidak** |

Bedanya:
- **Panel pengurus** = tempat *mencatat* (input setoran, kelola anggota, buat paket, kirim pengingat).
- **Portal warga** = tempat *melihat* (saldo, progres, riwayat, bukti keaslian catatan).

---

## 2. Menyalakan aplikasi

Buka **Git Bash** (bukan PowerShell) di folder proyek:

```bash
docker compose up -d         # MySQL
node apps/api/scripts/seed.js   # isi data demo (sekali saja, aman diulang)
npm run dev                  # API :4000 + web :5173
```

Lalu buka <http://localhost:5173>.

Kalau MySQL belum pernah dimigrasi (mis. setelah `docker compose down -v`), jalankan dulu:

```bash
bash scripts/verify-ledger.sh
```

---

## 3. Login

Klik **Masuk panel pengurus**, atau langsung buka <http://localhost:5173/admin>.
Form sudah terisi otomatis:

| Email | Password | Peran | Bisa apa |
|---|---|---|---|
| `bendahara@gmail.com` | `12345678` | Bendahara | **Menulis**: setoran, koreksi, anggota, paket, pengingat, link publik |
| `ketua@gmail.com` | `12345678` | Ketua | **Hanya membaca** + verifikasi + unduh CSV |
| `admin@gmail.com` | `12345678` | Super Admin | Sama seperti bendahara **+ panel Kelola pengurus** |

> Mencoba login sebagai **Ketua** adalah cara tercepat memahami pemisahan tugas: semua tombol
> tulis hilang, dan muncul keterangan "Peran KETUA bersifat baca-saja".

---

## 4. Tur 8 langkah (ikuti berurutan)

### Langkah 1 — Buka panel komunitas
Tidak ada dropdown. Komunitas sudah tetap: **R2 09 Dukuh Tlobong**, namanya tampil di kanan atas.

**Yang muncul:** 4 kartu ringkasan (Terkumpul, Target, Anggota aktif, Entri ledger), badge
**Integritas rantai: SAH**, dan tabel mutasi.

### Langkah 2 — Catat setoran
Panel **Catat setoran**: buka dropdown **Anggota** → ketik namanya untuk menyaring (mis. `budi`)
→ klik nama yang benar → dropdown **Paket (opsional)** bila perlu → isi nominal (mis. `50000`)
→ metode Tunai → **Simpan setoran**.

> Dropdown anggota dan paket punya kotak pencarian di dalamnya, jadi tetap enak dipakai
> walaupun anggotanya ratusan. Untuk melihat nama saja tanpa mencari, cukup buka dropdown-nya.

**Yang terjadi:**
1. Baris baru masuk tabel `deposits` (status CONFIRMED).
2. Sistem menulis **1 entri ledger** baru: `seq`, `prev_hash` = hash entri sebelumnya,
   `hash` = SHA-256 dari isi entri.
3. Setoran langsung **melunasi cicilan tertua** anggota. Kalau **Paket** dipilih, hanya cicilan
   paket itu yang disentuh; kalau kosong, cicilan semua paket diproses urut jatuh tempo.
   Pembayaran sebagian dicatat sebagai `paid_amount`, cicilan baru berstatus `PAID` saat lunas.
4. Total "Terkumpul" di panel dan di portal warga ikut naik.
5. Pesan sukses menyebut nomor entrinya, mis. "tercatat pada entri #25".

### Langkah 2b — Tambah anggota
Panel **Anggota** (kiri bawah) → klik **+ Tambah anggota** untuk membuka form → isi
**Nama anggota** → isi nomor telepon bila perlu → **Tambah anggota**. Setelah selesai klik
**Tutup form** supaya daftar anggota lega kembali.

Daftar anggota punya kotak **Cari nama anggota…**, tombol filter **Semua** / **Ada tunggakan**,
area gulir setinggi ±8 baris, dan keterangan "Menampilkan X dari Y anggota". Jadi kalau
anggotanya ratusan, panel tetap ringkas dan nama tetap cepat ditemukan.

Badge **N tunggakan** pada baris anggota bisa diklik untuk membuka rincian per paket
(nama paket, jumlah cicilan, total nominal, dan jatuh tempo terawal). Angka **Tunggakan**
di tabel **Rekap per RT** juga menampilkan rincian yang sama saat kursor diarahkan ke angka.
Tunggakan dihitung dari **sisa** cicilan (`amount - paid_amount`) yang sudah lewat jatuh tempo,
jadi cicilan yang sudah dibayar penuh otomatis hilang dari daftar.

Kalau angka terasa tidak sinkron (mis. setelah impor/ubah data langsung di database), klik
**Sinkronkan cicilan** di kanan judul **Anggota**. Tombol itu menghitung ulang alokasi setoran
untuk semua anggota. Cron harian 00:15 juga melakukannya otomatis saat `ENABLE_CRON=true`.

Nomor telepon boleh ditulis seperti kebiasaan sehari-hari: `0812-3456-7890`, `0812 3456 7890`,
`+62 812 3456 7890`, atau `6281234567890`. Semua bentuk itu disimpan sebagai `+6281234567890`.
Nomor telepon dan **RT** opsional — boleh dikosongkan. Kalau nomornya tidak masuk akal (mis.
`0812-abc`), muncul pesan merah berbahasa Indonesia di bagian atas panel dan data tidak disimpan.

**Kolom RT** diisi 1–3 angka dan disimpan sebagai 2 digit: `3` → `03`, `003` → `03`. Anggota tanpa
RT tetap bisa dipakai, hanya masuk kelompok **Belum diisi RT**. Di daftar anggota ada dropdown
**Semua RT** untuk menyaring, dan panel **Rekap per RT** di bawah menampilkan jumlah anggota,
terkumpul, serta tunggakan tiap RT. Data demo memakai RT 01–03; `ahmad` sengaja dibiarkan kosong
sebagai contoh anggota tanpa RT.

Anggota baru langsung masuk ke dropdown **Anggota** pada form setoran.

**Mengubah anggota:** klik ikon **pensil** di baris anggota → ubah nama, telepon, dan/atau RT →
**Simpan perubahan**. Perubahan langsung tampil di daftar, di portal warga, dan pada riwayat
mutasi (karena nama diambil dari data anggota saat ini).

**Menghapus anggota:** di setiap baris anggota ada ikon **tong sampah**. Setelah dikonfirmasi,
sistem memilih cara yang aman:

| Kondisi anggota | Yang terjadi |
|---|---|
| Belum pernah menyetor | Baris anggota dihapus, termasuk jadwal cicilan dan pengingatnya |
| Sudah punya riwayat setoran | Anggota **dinonaktifkan** (`INACTIVE`) dan hilang dari daftar, tetapi data setorannya tetap tersimpan agar ledger tidak bolong |

Pesan hasilnya selalu menyebut mode mana yang dipakai, jadi tidak ada penghapusan diam-diam.

### Langkah 3 — Lihat ke portal warga
Klik **Buat link publik** → muncul URL `http://localhost:5173/s/<token>` → klik **buka**.

**Yang muncul:** halaman tanpa login berisi total terkumpul, target, progres tiap paket,
20 mutasi terakhir, dan tombol **Verifikasi keaslian catatan**.

> Token hanya ditampilkan sekali di panel. Simpan URL-nya seperti Anda membagikan tautan grup.

### Langkah 4 — Buktikan data real-time
Buka portal warga di jendela/jendela samping, lalu **catat setoran baru** di panel admin.

**Yang terjadi:** halaman warga berubah **tanpa reload** (ada notifikasi "Setoran baru masuk:
Rp50.000"). Itu SSE (Server-Sent Events). Kalau koneksi putus, halaman otomatis beralih ke
pembaruan tiap 15 detik dan statusnya berubah jadi "mode pembaruan berkala".

### Langkah 5 — Uji anti-fraud: koreksi, bukan hapus
Di tabel **Mutasi terbaru**, pada baris bertipe **Setoran** ada tautan **koreksi**. Klik.
(Saring daftar lebih dulu lewat kotak **Cari nama anggota…** kalau mutasinya sudah panjang.)

1. Muncul kotak isian: masukkan nominal yang benar, mis. `40000`.
2. Muncul kotak kedua: alasan (minimal 10 karakter), mis. `Salah input nominal setoran`.
3. **Yang terjadi:** dibuat entri **Pembatalan (VOID) −Rp50.000** lalu entri **Setoran (DEPOSIT) +Rp40.000**.

Perhatikan: **entri lama tetap ada** dan tidak bisa dihapus. Total ikut turun Rp10.000.
Itu inti klaim produk — riwayat tidak bisa dihapus, hanya bisa dinetralkan.

### Langkah 6 — Verifikasi keaslian catatan
Klik **Verifikasi keaslian catatan** di portal warga (atau lihat badge di panel admin).

**Yang muncul:** "Rantai catatan SAH — N entri. Kode verifikasi abc123…".

Sistem menghitung ulang SHA-256 dari entri pertama sampai terakhir. Kalau satu baris di database
diubah langsung (mis. lewat SQL), verifikasi akan berubah menjadi **TIDAK SAH** dan menyebut nomor
entri pertama yang rusak.

### Langkah 7 — Lihat & tambah paket
Data demo menyiapkan dua paket: **Tabungan Qurban** (mingguan) dan **Sembako Harian** (harian).
Keduanya hanya contoh — Anda bisa menambah paket lain, misalnya **Kas RT**, lewat tombol
**+ Tambah paket** di panel Paket & progres (khusus bendahara/super admin).

Form paket berisi nama, target dana, tanggal jatuh tempo, dan frekuensi cicilan
(**harian / mingguan / bulanan**). Frekuensi bulanan memakai tanggal yang sama tiap bulan, dengan
pengaman akhir bulan (31 Jan → 28/29 Feb).
Setelah disimpan, paket langsung ikut terhitung di target & progres, dan muncul di dropdown
**Paket (opsional)** saat mencatat setoran.

**Yang terjadi saat seed dijalankan:** semua anggota aktif otomatis diikutkan ke kedua paket, dan
tiap anggota mendapat jadwal cicilan. Aturan pembulatan: cicilan dibulatkan ke atas per Rp1.000,
sisa pembulatan dibebankan ke periode terakhir supaya totalnya tepat sama dengan target.

### Langkah 8 — Pengingat WhatsApp (mode dummy)
Panel **Pengingat WhatsApp (dummy)** → **Jalankan sekarang**.

**Yang terjadi:** sistem mencari anggota yang punya cicilan **sudah lewat jatuh tempo** atau
**jatuh tempo dalam 3 hari ke depan** dan belum dibayar, mencatatnya ke outbox, lalu "mengirim"
pesan. Satu anggota hanya menerima **satu pengingat per hari** (dijaga unique key di database),
karena itu menekan tombol dua kali akan menghasilkan `queued: 0`.

Pengingat sendiri **tidak** mengubah status cicilan dan tidak menghitung denda — status berubah
saat setoran dicatat. Karena mode dummy:
- tidak ada pesan yang benar-benar dikirim,
- isi pesan muncul di log server sebagai `[WA:DUMMY] to=+62812… template=installment_due`,
- daftar outbox di panel berubah menjadi `SENT`.

Satu anggota hanya bisa menerima satu pengingat per hari (dijaga unique key di database).

---

## 5. Daftar fitur dan apa yang terjadi di baliknya

| Fitur | Di mana | Apa yang sebenarnya terjadi |
|---|---|---|
| Login + sesi | `/admin` | Password di-hash **scrypt**, sesi disimpan sebagai hash token di tabel `sessions`, cookie httpOnly. 5× salah → akun terkunci 15 menit |
| RBAC 3 peran | semua endpoint admin | Ketua ditolak `403` saat mencoba menulis. Tidak ada peran yang bisa mengubah ledger |
| Catat setoran | panel kiri atas | 1 setoran = 1 baris `deposits` + 1 entri `ledger_entries`. Klik ganda tidak menggandakan (idempotency key) |
| Alokasi setoran → cicilan | otomatis | Setoran CONFIRMED melunasi cicilan tertua. Paket dipilih → hanya paket itu; tanpa paket → semua paket. Sisa pembayaran sebagian disimpan di `paid_amount` |
| Rekonsiliasi cicilan | tombol **Sinkronkan cicilan** + cron 00:15 | Hitung ulang alokasi semua anggota dari setoran CONFIRMED. Satu anggota gagal tidak menghentikan yang lain |
| Koreksi setoran | tabel mutasi | Entri `VOID` negatif + entri baru. Entri asli tetap ada selamanya; alokasi cicilan dihitung ulang |
| Ledger hash-chain | otomatis | Tiap entri menyimpan `prev_hash`; perubahan satu baris merusak semua hash setelahnya |
| Tiga lapis penguncian | database | (1) akun aplikasi hanya `SELECT`+`INSERT` pada tabel ledger, (2) trigger menolak `UPDATE`/`DELETE` bahkan untuk root, (3) kode tidak pernah menulis `UPDATE` |
| Verifikasi rantai | panel & portal | Hitung ulang seluruh rantai, hasil VALID / INVALID + entri pertama yang rusak |
| Portal publik via token | `/s/<token>` | Token 32 byte disimpan sebagai hash, bisa dicabut, tanpa login, tanpa data pribadi selain nama |
| Real-time (SSE) | portal warga | Server mendorong event `update` tiap ada setoran; fallback polling 15 detik |
| Paket & cicilan | panel kanan bawah | Dua paket tetap; jadwal cicilan per anggota dibuat saat seed |
| Progres per paket | panel & portal | Dijumlahkan dari setoran berstatus CONFIRMED |
| Tunggakan | panel anggota + CSV | Cicilan berstatus DUE, tanggal ≤ hari ini, dan masih bersisa (`paid_amount < amount`). Klik badge untuk rincian per paket |
| Pengingat WhatsApp | tombol "Jalankan sekarang" | Adapter `console` (dummy). Di produksi cukup ganti adapter, UI tidak berubah |
| Payment gateway dummy | API (`/api/dev/payments/simulate`) | Membuat deposit PENDING + invoice QRIS/VA palsu. Webhook bertanda tangan HMAC yang valid menandai invoice `PAID`, mengubah deposit menjadi `CONFIRMED`, dan menulis **tepat satu** entri ledger (idempoten saat diulang) |
| Ekspor CSV | tautan "unduh tunggakan CSV" | File `nama;telepon;total_setoran;cicilan_tertunggul` |
| Anchor harian | cron 23:59 / `POST .../anchor` | Menyimpan root hash + jumlah entri per hari sebagai bukti pembanding |
| Rate limit | endpoint publik | > 20 permintaan/menit per IP+token → `429` |

---

## 6. Hal yang belum ada (supaya tidak bingung mencarinya)

| Belum ada | Keterangan |
|---|---|
| Tombol di UI untuk payment gateway | Payment dummy masih lewat API (`POST /api/dev/payments/simulate`), belum ada tombol checkout |
| Token scope `MEMBER` | Portal hanya membuat tautan tingkat komunitas; bagian "Posisi Anda" baru muncul untuk token per-anggota yang belum bisa dibuat lewat UI |
| Ubah paket | Paket bisa dibuat dan dihapus, tetapi nama/target belum bisa diedit dari UI |
| Kolom RT per anggota | Satu komunitas diperlakukan sebagai satu RT. Untuk banyak RT: pisahkan per komunitas, atau tambahkan kolom `rt` di tabel `members` (belum dibuat) |
| Enkripsi nomor HP | Masih tersimpan apa adanya (rencana: crypto-shredding) |
| Kirim WhatsApp sungguhan | Butuh adapter resmi (WABA) dan keputusan bisnis |
| Reset password | Belum ada alur lupa password |

---

## 7. Kalau ada yang tidak jalan

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Memuat…" terus | API mati | Jalankan `npm run dev`, cek <http://localhost:4000/health> |
| Login gagal padahal password benar | Akun terkunci | Tunggu 15 menit, atau jalankan ulang `node apps/api/scripts/seed.js` (mereset kunci & password) |
| Ringkasan kosong, anggota 0 | Data demo belum di-seed | Jalankan `node apps/api/scripts/seed.js` |
| Tambah anggota gagal / pesan merah | Nomor telepon tidak dikenali, atau server masih versi lama | Tulis telepon 8–15 digit (boleh `0812-3456-7890`), atau kosongkan; pastikan API sudah di-restart lalu `Ctrl+Shift+R` |
| Anggota baru tidak ada di dropdown | Halaman belum memuat ulang data | Muat ulang halaman (`F5`) |
| Notifikasi sukses hilang sendiri | Memang disengaja, 5 detik | Klik **✕** untuk menutup lebih cepat; pesan error **tidak** hilang sendiri |
| **hapus** anggota tapi masih ada di database | Anggota itu sudah punya setoran | Normal — statusnya jadi `INACTIVE` (riwayat keuangan tidak boleh hilang) |
| RT ditolak saat tambah anggota | Isian RT bukan angka / lebih dari 3 digit | Isi 1–3 angka saja, contoh `03`; server menjawab `RT_INVALID` |
| Kolom `rt`/`paid_amount` belum ada di database | Migrasi belum dijalankan | `bash scripts/migrate.sh`, lalu `node apps/api/scripts/seed.js` untuk mengisi data demo |
| Angka "Terkumpul" aneh setelah koreksi | VOID bernilai negatif | Normal — total dihitung dari ledger, bukan dari jumlah setoran kotor |
| Sudah bayar tetapi badge tunggakan masih ada | Nominal belum menutup satu cicilan penuh, atau setoran untuk paket lain | Buka rincian badge: sisa nominal ditampilkan. Catat kekurangannya, atau pilih paket yang benar saat menyetor |
| Tunggakan lama tidak berubah setelah pembayaran | Data lama dibuat sebelum alokasi cicilan | `bash scripts/migrate.sh` lalu klik **Sinkronkan cicilan** (atau `node apps/api/scripts/reconcile-installments.js`) |
| Pengingat selalu 0 terkirim | Semua anggota sudah menerima pengingat hari ini (anti-duplikat) atau tidak ada cicilan jatuh tempo | Buat paket harian dengan jatuh tempo 3 hari lagi, atau tunggu besok — daftar kandidat tetap bisa dilihat di respons `candidates` |
| Portal warga bilang "Tautan tidak valid atau sudah dicabut" | Token terpotong saat disalin, atau database di-reset | Buat tautan baru (**Buat link publik**) dan pakai tombol **salin tautan**; jangan ketik manual |
| Portal warga bilang "Tautan tidak lengkap" | Alamat `/s` dibuka tanpa token | Buka tautan utuh dari panel, bukan `/s` saja |
| Portal warga bilang "Tidak dapat menghubungi server" | API di port 4000 mati | Jalankan `npm run dev`, cek `/health` |
| Tautan terbuka tapi alamatnya bukan `localhost:5173` | Vite pindah port karena 5173 terpakai | Buka alamat yang tertulis di log Vite, atau tutup proses lain di 5173 |
| `bash: command not found` | Di PowerShell | Jalankan `bash`-script dari Git Bash |

## 8. Aplikasi mobile (Flutter) - opsional

Selain web, tersedia aplikasi Android untuk bendahara di `apps/mobile` (tema putih-oranye
soft ala iPhone, dark mode, animasi, dan grafik analisis keuangan).

```bash
cd apps/mobile
flutter pub get
flutter run                # jalankan di emulator Android (API default http://10.0.2.2:4000)
flutter build apk --release
```

- Semua fitur sama dengan panel web: dashboard kas, anggota + tunggakan, detail cicilan per
  paket + tombol **Sinkronkan Cicilan**, catat setoran, koreksi, paket, pengingat, verifikasi
  ledger, dan tab **Analisis** berisi grafik kas bulanan, sisa cicilan jatuh tempo, komposisi
  paket, dan tunggakan per RT.
- Ponsel fisik: isi kolom **Alamat API server** saat login dengan alamat PC, mis.
  `http://192.168.1.9:4000` (IP LAN komputer tempat API berjalan). Uji coba tetap memakai
  akun demo `bendahara@gmail.com` / `12345678`.
- Hasil APK: `apps/mobile/build/app/outputs/flutter-apk/app-release.apk` (±51 MB) dan
  `app-debug.apk` — salin ke HP lalu pasang (izinkan "instal dari sumber tak dikenal").
