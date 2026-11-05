# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Smart Community Festive Fund (SCFF)

| Field | Nilai |
|---|---|
| Versi | 1.1.4 |
| Status | Draft / Proposed |
| Tanggal | 4 November 2026 |
| Pemilik Dokumen | Penulis / Pengusul Proyek |
| Perubahan v1.1 | Stack dikunci (React.js + Node.js + MySQL), integrasi pihak ketiga memakai **dummy adapter**, ditambahkan RBAC, model data, acceptance criteria, spesifikasi ledger, kepatuhan UU PDP, dan rencana rilis |
| Perubahan v1.1.1 | Payment gateway **dikunci dummy** untuk arsitektur awal; aliran dana tidak melewati platform pada rilis ini (menutup Q1, lihat §16.1) |
| Perubahan v1.1.2 | Target rilis ditetapkan **demo akademik** (D4, §5.3); penanganan tanggal jatuh tempo ditetapkan Gregorian + konversi Hijriah sekali saat setup (D5, FR-03) |
| Perubahan v1.1.3 | Denda keterlambatan dikecualikan dari MVP (D6); satu komunitas boleh memiliki beberapa program aktif bersamaan (D7) |
| Perubahan v1.1.4 | Penyesuaian hasil implementasi M2: `seq` ledger menjadi nomor urut per komunitas dengan `id` sebagai PK, ditambah constraint anti-fork; strategi hak akses dijelaskan sesuai semantik MySQL |

---

## 1. Executive Summary

**Smart Community Festive Fund (SCFF)** adalah platform web untuk mengelola dana sosial musiman di tingkat komunitas lokal — Tabungan Qurban, Sembako Lebaran, dan Kas RT/RW.

SCFF menyelesaikan tiga masalah utama pengelolaan dana konvensional:

1. **Risiko manipulasi data (fraud).** Pencatatan manual di buku atau spreadsheet rentan diubah atau dihapus tanpa jejak.
2. **Transparansi rendah.** Warga harus menunggu rapat bulanan untuk mengetahui posisi saldo.
3. **Beban administratif.** Pengurus mencatat mutasi satu per satu dan mengingatkan iuran secara manual.

Pendekatan SCFF: **append-only ledger berantai hash (hash-chained)** + **portal publik berbasis token** + **penagihan otomatis**.

> **Catatan kejujuran klaim (penting untuk pembahasan skripsi):** SCFF adalah sistem **pencatatan dan transparansi**, bukan kustodian dana. Uang tetap ditransfer ke rekening panitia/komunitas. Yang dijamin sistem adalah **integritas catatan** dan **keterbukaan informasi**, bukan penguasaan dana.

**Keputusan arsitektur awal (v1.1.1):** payment gateway berjalan dalam **mode dummy** sepenuhnya — tidak ada SDK provider, tidak ada panggilan jaringan, dan tidak ada uang yang bergerak melalui platform. Rinciannya di §13.5.

---

## 2. Problem Statement

| # | Masalah | Dampak |
|---|---|---|
| P1 | Pencatatan manual (buku fisik / spreadsheet) mudah diubah atau dihapus tanpa jejak | Sengketa antarwarga, kecurigaan terhadap pengurus, potensi fraud |
| P2 | Saldo terkini hanya diketahui saat rapat bulanan | Warga tidak bisa memantau, kepercayaan rendah, iuran menunggak tanpa disadari |
| P3 | Rekap dan pengingat iuran dilakukan manual | Puluhan–ratusan pesan per bulan, rawan salah kirim dan salah hitung |
| P4 | Tidak ada bukti bahwa catatan tidak pernah diubah | Audit internal tidak mungkin dilakukan tanpa data historis |

---

## 3. Tujuan Produk & Metrik Keberhasilan

| ID | Tujuan | Metrik | Target |
|---|---|---|---|
| G1 | Catatan keuangan tidak dapat diubah/dihapus | Percobaan `UPDATE`/`DELETE` pada tabel ledger via akun aplikasi | 100% ditolak (error), terverifikasi oleh automated test |
| G2 | Warga dapat memantau saldo kapan saja | Waktu dari setoran dikonfirmasi → tampil di dashboard publik | ≤ 2 detik (p95) |
| G3 | Mengurangi beban pengurus | Pengingat yang terkirim otomatis vs. manual | ≥ 90% pengingat terjadwal terkirim tanpa intervensi |
| G4 | Transparansi dapat diverifikasi mandiri | Ketersediaan halaman verifikasi rantai hash untuk publik | Tersedia, hasil "VALID/INVALID" per komunitas |
| G5 | Biaya operasional minimal | Biaya layanan pihak ketiga pada mode dummy | Rp 0 (semua integrasi dummy) |

---

## 4. Persona & Peran (RBAC)

| Peran | Deskripsi | Hak Akses |
|---|---|---|
| **Warga / Anggota** | Peserta program tabungan | Lihat dashboard publik, lihat posisi tabungan sendiri (via token), tanpa login |
| **Pengurus / Bendahara** | Mencatat setoran, mengelola anggota | CRUD anggota & target, input setoran, kirim pengingat, lihat laporan |
| **Ketua / Auditor** | Mengawasi, tidak boleh mengubah catatan | Read-only seluruh data + akses halaman verifikasi rantai + ekspor laporan |
| **Super Admin** | Pengelola sistem | Kelola komunitas, akun pengurus, konfigurasi provider integrasi |

**Aturan kritis:** tidak ada peran — termasuk Super Admin — yang boleh mengubah atau menghapus entri ledger. Koreksi hanya melalui **entri pembalik (compensating entry)**.

---

## 5. Ruang Lingkup

### 5.1 In Scope (MVP)

- Autentikasi & RBAC pengurus (email + password, sesi cookie httpOnly).
- Manajemen komunitas, anggota, dan paket/target tabungan.
- Kalkulator cicilan otomatis (harian/mingguan).
- Pencatatan setoran dengan ledger append-only berantai hash.
- Koreksi setoran via compensating entry.
- Dashboard publik via token link + grafik progres kelompok.
- Pembaruan real-time via SSE.
- Halaman verifikasi rantai hash (publik).
- Pengingat WhatsApp melalui **dummy provider** (outbox + log).
- Payment gateway **dummy** (simulasi QRIS/VA + webhook palsu bertanda tangan) — **dikunci untuk arsitektur awal**; provider nyata tidak diimplementasikan (lihat §13.5).
- Laporan & ekspor CSV.

### 5.2 Out of Scope (MVP)

- Uang mengalir melalui platform (escrow/disbursement). Dana ke rekening panitia.
- WhatsApp Cloud API resmi / WABA terverifikasi (disediakan sebagai adapter stub, tidak diaktifkan).
- Payment gateway produksi beserta settlement & refund nyata.
- Aplikasi mobile native.
- Mode offline / PWA penuh.
- Blockchain publik atau smart contract (hash chain internal saja).
- Multi-tenant SaaS dengan penagihan langganan.
- Notifikasi push/email ke warga.
- Denda/penalti keterlambatan iuran (keputusan D6); tunggakan tetap terlihat di laporan, tetapi tidak dikenakan sanksi finansial.

### 5.3 Konteks Deploy (Keputusan D4)

Target rilis ditetapkan sebagai **demo akademik**, bukan operasi RT/RW nyata. Konsekuensi yang harus dinyatakan di bagian batasan penelitian:

- Deploy berupa `docker compose` pada **satu mesin/VM tunggal**; tanpa klaster, load balancer, atau pipeline CI/CD produksi.
- Data yang dipakai adalah **data sintetis** hasil seed; tidak ada data warga nyata yang diproses.
- NFR-05 (ketersediaan) dan NFR-06 (RPO/RTO) bersifat **target desain**, bukan SLA yang dijanjikan kepada siapa pun.
- Kepatuhan UU PDP (§11) diimplementasikan secara teknis (consent, crypto-shredding, minimisasi PII) tetapi **tanpa** audit kepatuhan formal maupun perjanjian pengolahan data.
- Validasi kegunaan bersifat terbatas: demo terarah dan kuesioner kecil bila memungkinkan, bukan uji lapangan berskala.

---

## 6. Alur Pengguna Utama

**U1 — Pengurus mencatat setoran**
Login → pilih komunitas → cari anggota → input nominal & metode → simpan → sistem menulis entri ledger (hash baru dihitung dari hash entri terakhir) → dashboard publik & halaman anggota ter-update via SSE.

**U2 — Warga memeriksa tabungan**
Buka link token (dari WhatsApp) → lihat progres kelompok, posisi sendiri, riwayat mutasi masuk, dan tombol "Verifikasi Keaslian Catatan".

**U3 — Koreksi salah input**
Pengurus menemukan nominal salah → buka entri → klik "Koreksi" → isi alasan → sistem membuat entri pembalik (VOID) + entri baru yang benar → kedua entri tetap terlihat di riwayat.

**U4 — Pengingat otomatis**
Cron harian 08.00 → ambil anggota dengan cicilan jatuh tempo ≤ 3 hari dan belum bayar → masukkan ke outbox → provider WhatsApp (dummy) "mengirim" → status outbox berubah menjadi SENT, isi pesan tampil di panel admin.

**U5 — Audit**
Ketua membuka halaman verifikasi → sistem menghitung ulang seluruh rantai hash → menampilkan VALID beserta jumlah entri dan root hash terakhir.

---

## 7. Kebutuhan Fungsional

Format acceptance criteria menggunakan Gherkin ringkas. Semua ID bersifat wajib kecuali ditandai *(nice-to-have)*.

### FR-01 Autentikasi & RBAC Pengurus
- Login email + password (Argon2id), sesi via cookie `httpOnly`, `Secure`, `SameSite=Lax`, TTL 7 hari.
- Peran: `BENDAHARA`, `KETUA`, `SUPER_ADMIN` (lihat §4).
- Semua endpoint mutasi wajib lolos otorisasi peran di middleware.

**AC:**
- Given pengguna belum login, When mengakses `/admin/*`, Then diarahkan ke `/login`.
- Given pengguna berperan `KETUA`, When memanggil `POST /api/deposits`, Then respons `403`.
- Given 5 kali login gagal berurutan, Then akun terkunci 15 menit.

### FR-02 Manajemen Komunitas, Anggota, dan Paket
- Komunitas: nama, deskripsi, periode program (tanggal mulai–selesai), status.
- Anggota: nama, nomor HP (E.164), alamat *(opsional)*, status aktif/nonaktif.
- Paket target: nama (mis. "Sembako Lebaran"), nominal, tanggal jatuh tempo.
- Anggota dapat memilih ≥1 paket; tiap paket menghasilkan jadwal cicilan.

**AC:**
- Given bendahara membuat paket Rp500.000 periode 20 minggu, Then sistem membuat 20 jadwal cicilan @ Rp25.000.
- Given anggota dengan nomor HP duplikat dalam satu komunitas, When disimpan, Then `409 Conflict`.
- Given anggota dinonaktifkan, Then tidak muncul pada daftar pengingat, tetapi entri ledger historisnya tetap utuh.

### FR-03 Kalkulator Target & Milestone
- Input: nominal target, tanggal mulai, tanggal akhir, frekuensi (`HARIAN` | `MINGGUAN`).
- **Penanganan tanggal (keputusan D5):** semua tanggal dihitung dan disimpan sebagai `DATE` **Gregorian** — format yang dipakai cron, index, dan query. Jika pengurus menginput tanggal Hijriah (mis. "10 Ramadan 1447"), konversi ke Gregorian dilakukan **sekali saat setup**, hasilnya ditampilkan untuk dikonfirmasi sebelum disimpan. **Tidak ada konversi Hijriah saat runtime.**
- Alasan: awal bulan Hijriah bergantung pada hilal dan otoritas yang berbeda-beda (bisa selisih 1 hari), sehingga konversi otomatis di runtime berisiko menggeser jatuh tempo dan pengingat tanpa sepengetahuan pengurus. Konversi sekali + konfirmasi manusia jauh lebih dapat dipertanggungjawabkan.
- Tanggal jatuh tempo tidak digeser otomatis karena akhir pekan/libur; pengurus dapat menimpa tanggal individual.
- Konversi memakai pustaka pihak ketiga (kandidat: `hijri-converter` untuk JavaScript) — pustaka diverifikasi saat implementasi, dan hasil konversi selalu dapat diubah manual.
- Rumus: `jumlah_periode = ceil((tanggal_akhir - tanggal_mulai) / interval)`; `cicilan = ceil(nominal / jumlah_periode)` dibulatkan ke kelipatan Rp1.000; sisa pembulatan dibebankan ke periode terakhir.
- Tampilkan pratinjau jadwal sebelum disimpan; bendahara dapat menyesuaikan manual.

**AC:**
- Given target Rp500.000 dan 20 periode, Then cicilan Rp25.000 × 19 + periode terakhir menutup sisa sehingga total tepat Rp500.000.
- Given tanggal akhir ≤ tanggal mulai, Then validasi menolak dengan pesan yang jelas.

### FR-04 Pencatatan Setoran & Ledger Append-Only
- Setoran menyimpan: komunitas, anggota, paket *(opsional)*, nominal (integer rupiah), metode (`CASH` | `TRANSFER` | `GATEWAY`), waktu kejadian, referensi eksternal *(opsional)*, idempotency key.
- Setiap setoran **wajib** menghasilkan tepat satu entri ledger bertipe `DEPOSIT` dalam transaksi database yang sama.
- Status setoran: `PENDING` → `CONFIRMED`, atau `VOIDED` (via FR-05).

**AC:**
- Given setoran baru disimpan, Then `ledger_entries` bertambah 1 baris dengan `prev_hash` = `hash` entri terakhir komunitas tersebut.
- Given request dikirim dua kali dengan idempotency key sama, Then hanya 1 entri ledger yang dibuat.
- Given dua setoran bersamaan pada komunitas yang sama, Then rantai tetap linier tanpa `seq` duplikat (uji konkurensi 2 paralel).

### FR-05 Koreksi (Compensating Entry)
- Endpoint koreksi membuat entri `VOID` senilai **negatif** dari entri asli, ditambah entri `DEPOSIT` baru bila nilai benar berbeda.
- Alasan koreksi wajib diisi (min. 10 karakter) dan tersimpan pada entri.
- Entri asli **tidak diubah**; UI menandainya sebagai "dikoreksi oleh #seq".

**AC:**
- Given entri #12 senilai Rp100.000 dikoreksi menjadi Rp80.000, Then tercipta entri #13 `VOID` −Rp100.000 dan #14 `DEPOSIT` +Rp80.000, saldo berubah −Rp20.000, dan #12 tetap ada.
- Given alasan koreksi kosong, Then `400 Bad Request`.

### FR-06 Dashboard Transparansi Publik (Token Link)
- URL: `/s/{token}`. Token 32 byte acak (base64url), **disimpan sebagai hash SHA-256** di DB.
- Scope token: `COMMUNITY` (seluruh rekap kelompok) atau `MEMBER` (rekap kelompok + posisi anggota tersebut).
- Halaman menampilkan: total terkumpul vs target, jumlah anggota aktif, grafik progres per paket, 20 mutasi terakhir (nominal agregat), dan tombol verifikasi.
- Header `Referrer-Policy: no-referrer` dan `X-Robots-Tag: noindex`. Nominal pribadi tidak ditampilkan pada scope `COMMUNITY`.
- Token dapat dicabut (`revoked_at`) dan memiliki masa berlaku opsional.

**AC:**
- Given token valid, Then dashboard tampil tanpa perlu login.
- Given token dicabut, Then respons `410 Gone` dengan halaman informatif.
- Given >20 permintaan/menit dari satu IP pada satu token, Then `429 Too Many Requests`.

### FR-07 Pembaruan Real-Time (SSE)
- Endpoint `GET /api/stream/community/:id` mengirim event `deposit.created` dan `summary.updated`.
- Klien React berlangganan via `EventSource`, menampilkan toast dan memperbarui grafik tanpa reload.
- Fallback: polling 15 detik bila koneksi SSE gagal 2× berturut-turut.

**AC:**
- Given dashboard warga terbuka, When bendahara menyimpan setoran, Then kartu total ter-update ≤ 2 detik tanpa reload.
- Given koneksi SSE terputus, Then klien mencoba reconnect dengan backoff dan beralih ke polling setelah 2 kegagalan.

### FR-08 Pengingat WhatsApp (Dummy Provider)
- Adapter `waProvider` dengan implementasi `console` (default via `WA_PROVIDER=console`) dan stub `fonnte`/`waba` yang melempar `NotImplementedError`.
- Antarmuka adapter: `sendMessage({ to, templateKey, params })` → `{ providerRef, status }`.
- Cron harian 08.00 WIB (node-cron) membuat baris `reminder_outbox` untuk anggota yang jatuh tempo ≤ 3 hari dan belum membayar.
- Panel admin "Outbox WhatsApp (Mode Dummy)" menampilkan pesan terkirim beserta status, dan tombol "Kirim Ulang" *(nice-to-have)*.
- Log server menandai setiap pesan dengan prefiks `[WA:DUMMY]`.

**AC:**
- Given mode dummy aktif, When cron berjalan, Then outbox berisi N pesan dan log menampilkan `[WA:DUMMY]` tanpa panggilan jaringan keluar.
- Given `WA_PROVIDER=fonnte` dan kredensial kosong, Then aplikasi gagal start dengan pesan konfigurasi yang jelas (bukan diam-diam mengirim).
- Given pengingat untuk anggota yang sama sudah terkirim hari ini, Then tidak dikirim ulang (unique constraint per anggota+template+tanggal).

### FR-09 Payment Gateway (Dummy Provider)
- Adapter `paymentProvider` dengan implementasi `dummy`: membuat "invoice" lokal berisi QR string palsu, VA palsu, dan waktu kedaluwarsa.
- Endpoint dev: `POST /api/dev/payments/simulate` — mensimulasikan pembayaran sukses/gagal.
- Webhook dummy: `POST /api/webhooks/payment/dummy` dengan header `X-Dummy-Signature: HMAC-SHA256(body, DUMMY_WEBHOOK_SECRET)`.
- Webhook wajib **idempoten**: unique index `(provider, provider_ref)`; percobaan ulang tidak membuat entri ledger ganda.
- Status invoice: `PENDING` → `PAID` | `EXPIRED` | `FAILED`.

**AC:**
- Given webhook dengan signature salah, Then `401` dan tidak ada entri ledger.
- Given webhook sukses dikirim 3×, Then hanya 1 entri ledger dan invoice tetap `PAID`.
- Given `PAYMENT_PROVIDER=dummy`, Then tidak ada SDK pihak ketiga yang dimuat saat runtime.

### FR-10 Laporan & Ekspor
- Rekap per komunitas, per paket, per anggota; filter rentang tanggal.
- Ekspor CSV untuk: daftar setoran, tunggakan, rekap per anggota.
- Laporan tunggakan menampilkan jumlah cicilan terbayar vs. terjadwal.

**AC:**
- Given komunitas 50 anggota × 20 minggu, When ekspor CSV, Then file terunduh < 5 detik dan angka total cocok dengan ringkasan dashboard.

### FR-11 Halaman Verifikasi Rantai Hash
- `GET /api/ledger/:communityId/verify` menghitung ulang seluruh rantai dan mengembalikan `{ ok, totalEntries, rootHash, firstBrokenSeq }`.
- Halaman publik menampilkan hasil VALID/INVALID, jumlah entri, root hash, dan waktu verifikasi.
- *(nice-to-have)* Ancor harian: setiap pukul 23.59 menyimpan `ledger_anchors(tanggal, total_entries, root_hash)` dan menampilkannya publik, sehingga perubahan massal oleh pihak dengan akses DB dapat dideteksi.

**AC:**
- Given rantai utuh, Then `ok: true` dan `firstBrokenSeq: null`.
- Given satu baris dimodifikasi langsung di DB (simulasi), Then `ok: false` dan `firstBrokenSeq` menunjuk baris pertama yang rusak.

---

## 8. Model Data (MySQL 8.0, InnoDB, utf8mb4)

Ringkasan tabel inti. Semua nominal berupa `BIGINT` rupiah (tanpa desimal). Semua tanggal disimpan sebagai `DATE` **Gregorian** (keputusan D5, lihat FR-03); label Hijriah hanya kolom tampilan opsional.

### 8.1 Operasional (DML penuh)

| Tabel | Kolom kunci |
|---|---|
| `users` | id, email (unik), password_hash, role, is_active, locked_until |
| `sessions` | id, user_id, token_hash, expires_at |
| `communities` | id, name, slug, period_start, period_end, status |
| `members` | id, community_id, name, phone_e164, address_enc, status |
| `packages` | id, community_id, name, target_amount, due_date, frequency |
| `member_packages` | id, member_id, package_id, status |
| `installments` | id, member_package_id, seq, amount, due_date, status |
| `deposits` | id, community_id, member_id, package_id, amount, method, occurred_at, status, external_ref, idempotency_key, ledger_seq |
| `invoices` | id, deposit_id, provider, provider_ref (unik), amount, status, expires_at |
| `reminder_outbox` | id, member_id, template_key, payload_json, status, scheduled_at, sent_at, provider_ref |
| `public_tokens` | id, community_id, member_id (nullable), token_hash (unik), scope, expires_at, revoked_at |

### 8.2 Append-Only (hanya `SELECT` + `INSERT`)

| Tabel | Kolom |
|---|---|
| `ledger_entries` | `id` (PK, BIGINT AUTO_INCREMENT), `seq` (nomor urut **per komunitas**, unik bersama `community_id`), `community_id`, `entry_type` (`DEPOSIT`/`VOID`/`ADJUSTMENT`), `member_id`, `amount` (boleh negatif untuk VOID), `occurred_at`, `ref_type`, `ref_id`, `note`, `prev_hash` (CHAR(64)), `hash` (CHAR(64)), `created_at` |
| `ledger_anchors` | `id`, `community_id`, `anchor_date` (unik per komunitas), `total_entries`, `root_hash`, `created_at` |

Index wajib: `UNIQUE (community_id, seq)`, `UNIQUE (community_id, prev_hash)` sebagai anti-fork, dan `ledger_entries (hash)`.

### 8.3 Aturan Append-Only (tiga lapis)

1. **Hak akses DB.** MySQL tidak memiliki *negative privilege*, sehingga urutannya dibalik: `REVOKE UPDATE, DELETE` di level database `scff.*`, lalu `GRANT UPDATE, DELETE` **hanya** pada 11 tabel operasional. Hasilnya `ledger_entries` dan `ledger_anchors` tinggal `SELECT` + `INSERT`. `CREATE`/`ALTER`/`DROP` tidak pernah diberikan ke akun runtime — DDL dijalankan migration sebagai root.
2. **Trigger penjaga.** `BEFORE UPDATE` dan `BEFORE DELETE` pada kedua tabel ledger memanggil `SIGNAL SQLSTATE '45000'`, sehingga percobaan oleh akun lain (termasuk owner) tetap gagal.
3. **Lapis aplikasi.** Tidak ada endpoint, ORM, atau migration yang memanggil `UPDATE`/`DELETE` pada tabel ledger; ditegakkan oleh lint/CI check dan integration test.

> Catatan desain: klaim "seluruh database hanya SELECT + INSERT" **tidak realistis** karena tabel seperti `sessions` dan `reminder_outbox` butuh `UPDATE`. Pembatasan diterapkan tepat pada tabel ledger — bagian yang memang harus immutable.

---

## 9. Spesifikasi Ledger Hash-Chain

**Algoritma hash** (SHA-256, input UTF-8, output hex 64 karakter):

```
payload = seq + "|" + community_id + "|" + entry_type + "|" + member_id
        + "|" + amount + "|" + occurred_at + "|" + prev_hash
hash    = sha256(payload)
```

**Genesis:** entri pertama sebuah komunitas memakai `prev_hash = "0" × 64`.

**Penulisan (serialisasi):** karena `UPDATE` tidak diperbolehkan, rantai diserialisasi dengan **named lock** MySQL, bukan dengan mengunci baris head:

```sql
SELECT GET_LOCK(CONCAT('scff.ledger.', ?community_id), 5);   -- tunggu maks 5 detik
-- SELECT hash FROM ledger_entries WHERE community_id = ? ORDER BY seq DESC LIMIT 1;
-- INSERT INTO ledger_entries (...) VALUES (...);
SELECT RELEASE_LOCK(CONCAT('scff.ledger.', ?community_id));
```

Seluruh blok dijalankan di dalam satu transaksi `REPEATABLE READ`; `GET_LOCK` dipilih karena hanya butuh privilege `SELECT` dan tidak menuntut tabel head yang harus di-`UPDATE`.

> **Catatan implementasi (v1.1.4):** `seq` yang masuk ke hash adalah nomor urut **per komunitas**, bukan PK. PK memakai kolom `id` auto-increment. Alasannya: hash memuat `seq`, sedangkan nilai auto-increment baru diketahui setelah `INSERT`, sementara tabel ini tidak boleh di-`UPDATE`. Dengan `seq` yang dihitung di dalam lock, hash sudah final sebelum baris ditulis.

**Performa:** hash dihitung di aplikasi (Node `crypto`), bukan di DB. Verifikasi 1.000 entri ditargetkan < 2 detik.

**Keterbatasan yang diakui:** hash chain membuktikan **konsistensi internal**. Pihak yang memiliki akses tulis ke DB *dan* kode aplikasi dapat menghitung ulang seluruh rantai. Karena itu disediakan `ledger_anchors` (FR-11) sebagai jangkar harian, dan disebutkan sebagai batasan di laporan/skripsi.

---

## 10. Kebutuhan Non-Fungsional

| ID | Aspek | Target |
|---|---|---|
| NFR-01 | Performa API | p95 < 500 ms untuk 100 concurrent user (Lighthouse/autocannon) |
| NFR-02 | Dashboard publik | LCP < 2 detik pada emulasi Fast 3G |
| NFR-03 | Latensi real-time | Update terlihat ≤ 2 detik setelah commit |
| NFR-04 | Skalabilitas | 500 setoran/hari dan lonjakan 5× H-7 hari raya tanpa error |
| NFR-05 | Ketersediaan | 99% pada **demo akademik** single node — target desain, bukan SLA (§5.3) |
| NFR-06 | Backup | Dump harian + binlog; **RPO 24 jam**, **RTO 4 jam** |
| NFR-07 | Keamanan | Argon2id, cookie httpOnly, rate limit, validasi input (zod/joi), escaping output |
| NFR-08 | Observabilitas | Structured logging (pino), request ID, halaman health check |
| NFR-09 | Aksesibilitas | Kontras WCAG AA, navigasi keyboard, label form eksplisit (banyak pengguna usia lanjut) |
| NFR-10 | Kompatibilitas | Chrome/Edge/Firefox 2 versi terakhir, Android Chrome; layout responsif 360 px |
| NFR-11 | Kemudahan pasang | `docker compose up` menjalankan MySQL 8 + backend + frontend + seed data demo |

---

## 11. Keamanan & Privasi (UU PDP No. 27/2022)

| Risiko | Mitigasi |
|---|---|
| Data pribadi (nama, nomor HP, alamat) diproses tanpa dasar | Persetujuan tercatat (`consent_at`, `consent_version`) saat pendaftaran anggota |
| Konflik hak penghapusan vs. ledger append-only | **Crypto-shredding**: PII disimpan terenkripsi dengan kunci per anggota (`members.address_enc`, `members.phone_enc`); permintaan penghapusan = hapus kunci + anonimisasi baris `members`. Ledger tetap utuh (hash + nominal) karena tidak memuat PII langsung |
| Token publik bocor via referrer/pesan | Token acak 32 byte, disimpan sebagai hash, `Referrer-Policy: no-referrer`, `noindex`, rate limit, dapat dicabut |
| Kebocoran kredensial di repo | `.env` di-gitignore, `.env.example` disediakan, secret dummy jelas diberi prefiks `DUMMY_` |
| SQL injection | Query parameterized (Knex/Prisma), tidak ada string concat |
| Enumerasi ID | Endpoint publik memakai UUID/token, bukan auto-increment |
| Akses DB berlebih | Akun aplikasi terbatas (lihat §8.3) |

**Retensi:** data operasional disimpan selama program + 12 bulan; ledger dan anchor disimpan permanen (tanpa PII).

---

## 12. Arsitektur & Tech Stack (Keputusan)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Frontend | **React.js 18 + Vite**, Tailwind CSS, React Router, TanStack Query, Recharts, SSE native `EventSource` | Ringan, ekosistem luas, mudah dipahami untuk skripsi |
| Backend | **Node.js 20 LTS + Express 4 (JavaScript ESM)**, zod (validasi), Knex (query builder + migration) | Sepadan dengan frontend (satu bahasa), sesuai stack PRD |
| Database | **MySQL 8.0**, InnoDB, `utf8mb4` | Dukungan trigger `SIGNAL`, `GET_LOCK`, privilege granular |
| Payment gateway | **Dummy adapter lokal** (QR/VA palsu + webhook HMAC), tanpa SDK pihak ketiga | Arsitektur awal: mensimulasikan alur penuh tanpa uang nyata, biaya, atau kepatuhan merchant (§13.5) |
| Cache | *(opsional, di luar MVP)* Redis untuk ringkasan dashboard | Ditambahkan hanya bila NFR-02 tidak tercapai |
| Realtime | **SSE** (`text/event-stream`) dari backend Node | Satu arah, lebih sederhana dari WebSocket, reconnect otomatis |
| Cron | `node-cron` di proses backend (di balik flag `ENABLE_CRON`) | Tanpa infrastruktur tambahan |
| Auth | Cookie sesi + Argon2id (`argon2`), tanpa JWT di localStorage | Menghindari XSS token theft |
| Testing | Vitest/Jest + Supertest (API), Playwright (E2E terbatas) | Cukup untuk memverifikasi AC dan uji tamper |

**Struktur repositori yang direncanakan**

```
scff/
├─ apps/
│  ├─ web/                     # React + Vite
│  └─ api/                     # Node + Express
│     ├─ src/
│     │  ├─ routes/
│     │  ├─ services/ledger.js      # hash chain + GET_LOCK
│     │  ├─ integrations/
│     │  │  ├─ whatsapp/{index.js,providers/console.js,providers/fonnte.js}
│     │  │  └─ payments/{index.js,providers/dummy.js}
│     │  └─ jobs/reminders.js
│     └─ migrations/
├─ docker-compose.yml          # mysql:8 + api + web
├─ db/privileges.sql           # GRANT + trigger append-only
└─ .env.example
```

---

## 13. Rencana Integrasi Dummy

Prinsip: **semua integrasi berada di balik adapter**, dipilih lewat env, sehingga penggantian ke provider nyata hanya menyentuh satu file.

### 13.1 Environment

```bash
WA_PROVIDER=console              # console | fonnte | waba
PAYMENT_PROVIDER=dummy           # arsitektur awal: hanya 'dummy' yang diimplementasikan
DUMMY_WEBHOOK_SECRET=dev-only-secret
ENABLE_CRON=true
```

### 13.2 WhatsApp Adapter

```js
// kontrak
export interface WaProvider {
  name: string;
  sendMessage({ to, templateKey, params }): Promise<{ providerRef, status }>;
}
```

- `console`: menulis `[WA:DUMMY] to=+62812... template=installment_due params={...}` dan menyimpan `providerRef = "dummy-<uuid>"`.
- `fonnte`/`waba`: stub dengan `throw new Error('NotImplementedError')` + komentar berisi dokumentasi API resmi.
- UI admin membaca `reminder_outbox`, bukan API provider, sehingga tampilan identik di mode dummy maupun produksi.

### 13.3 Payment Adapter — Dummy (Arsitektur Awal)

- `createInvoice()` menghasilkan `providerRef = "DUMMY-INV-<n>"`, QR string palsu (`SCFF-DUMMY-QR-...`), dan VA palsu (`8808xxxxxxxx`).
- `POST /api/dev/payments/simulate` memungkinkan demo di depan penguji tanpa membuka dashboard provider.
- Webhook dummy menandatangani body dengan HMAC-SHA256 → memverifikasi jalur idempoten, verifikasi signature, dan pembentukan entri ledger **tanpa uang nyata**.
- Halaman dev (`/admin/dev/checkout`) menampilkan tombol "Simulasikan Pembayaran" agar alur end-to-end dapat didemokan.

### 13.4 Kriteria Siap-Ganti ke Produksi

1. Adapter nyata mengimplementasikan kontrak yang sama tanpa mengubah pemanggil.
2. Webhook nyata lolos uji signature & idempotensi memakai rekaman payload (fixture) dari provider.
3. Tidak ada `import` SDK provider di bundel ketika provider dummy aktif.

### 13.5 Keputusan Arsitektur Awal: Payment Gateway Dummy

| Aspek | Keputusan v1.1.1 |
|---|---|
| Provider aktif | `PAYMENT_PROVIDER=dummy` — satu-satunya implementasi yang dikerjakan pada rilis ini |
| Aliran dana | Tidak ada. Konfirmasi pembayaran disimulasikan, bukan divalidasi oleh penyedia |
| Yang dibangun | Kontrak adapter, tabel `invoices`, endpoint simulasi, webhook HMAC + idempotensi, halaman dev checkout |
| Yang tidak dibangun | SDK Midtrans/Xendit, settlement, refund, rekonsiliasi mutasi bank, KYC/akun merchant |
| Alasan | Integritas ledger dan transparansi harus stabil lebih dulu; uang nyata menambah beban kepatuhan, biaya, dan risiko yang tidak sepadan untuk fase arsitektur |
| Syarat naik ke produksi | §13.4 terpenuhi + keputusan bisnis dibuka kembali + review kepatuhan (UU PDP, syarat merchant) |

**Konsekuensi terhadap klaim produk:** selama provider dummy aktif, SCFF **tidak** menjamin bahwa uang benar-benar diterima. Sistem hanya mencatat apa yang dikonfirmasi pengurus atau yang disimulasikan. Karena itu klaim anti-fraud dibatasi pada **integritas catatan**, bukan pada kebenaran arus dana.

---

## 14. Risiko & Mitigasi

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Rantai hash gagal linier saat dua penulisan bersamaan | Tinggi | `GET_LOCK` per komunitas + uji konkurensi di CI |
| R2 | `GET_LOCK` menahan koneksi pool | Sedang | Timeout 5 detik, pool ≤ 10, alert pada log peringatan |
| R3 | Provider WhatsApp tidak resmi → akun diblokir | Tinggi (produksi) | Dummy di MVP; adapter resmi disiapkan, keputusan ditunda |
| R4 | Pengurus salah input lalu panik mengedit DB manual | Tinggi | Alur koreksi resmi (FR-05) + trigger penjaga (§8.3) |
| R5 | Token link disebar ke pihak luar | Sedang | Scope minimal, pencabutan, rate limit, tanpa data pribadi |
| R6 | Klaim "anti-fraud" berlebihan di laporan | Sedang (akademik) | Batasan hash chain dinyatakan eksplisit (§9, §1) |
| R7 | Data pribadi warga tersebar di CSV | Sedang | Kolom PII dapat disembunyikan, akses ekspor hanya BENDAHARA/KETUA |
| R8 | Jadwal Ramadan bergeser ~11 hari/tahun | Rendah | **Ditangani D5:** tanggal jatuh tempo eksplisit (Gregorian), input Hijriah dikonversi sekali saat setup dan dikonfirmasi pengurus, tanpa konversi runtime |

---

## 15. Rencana Rilis (Milestone)

| Milestone | Isi | Estimasi |
|---|---|---|
| M1 — Fondasi | Scaffold React+Node, docker-compose MySQL, auth + RBAC, `db/privileges.sql` | Minggu 1–2 |
| M2 — Ledger Inti | Model data, hash-chain service, endpoint setoran, koreksi, uji tamper & konkurensi | Minggu 3–5 |
| M3 — Transparansi | Dashboard token publik, grafik, SSE, halaman verifikasi rantai | Minggu 6–7 |
| M4 — Integrasi Dummy | Adapter WA console + outbox, cron pengingat, payment dummy + webhook idempoten | Minggu 8–9 |
| M5 — Pengerasan | Laporan/ekspor, rate limit, hardening, uji NFR, seed demo | Minggu 10–11 |
| M6 — Dokumentasi | README, panduan demo, bab pengujian, screenshot | Minggu 12 |

**Definition of Done per fitur:** AC terpenuhi + automated test hijau + tidak ada endpoint yang melanggar aturan append-only + dokumentasi singkat.

---

## 16. Pertanyaan Terbuka

| # | Pertanyaan | Pemilik | Dampak bila tidak dijawab |
|---|---|---|---|
| Q1 | ~~Apakah dana benar-benar mengalir melalui platform, atau murni pencatatan?~~ **Terjawab oleh D1:** tidak — payment gateway dummy, dana di luar sistem | — | Konsekuensi sudah dituangkan di §13.5 |
| Q2 | ~~Target deploy: RT/RW nyata atau demo akademik?~~ **Terjawab oleh D4:** demo akademik | — | Batasan ditulis di §5.3 |
| Q3 | ~~Tanggal jatuh tempo memakai kalender Hijriah atau Gregorian?~~ **Terjawab oleh D5:** simpan Gregorian, konversi Hijriah sekali saat setup | — | Aturan rinci di FR-03 |
| Q4 | ~~Perlukah denda keterlambatan?~~ **Terjawab oleh D6:** tidak ada denda di MVP | — | Tunggakan cukup ditampilkan di laporan |
| Q5 | ~~Satu komunitas bisa punya beberapa program aktif bersamaan?~~ **Terjawab oleh D7:** boleh, dashboard diagregasi per paket | — | Model data sudah mendukung (`packages` 1..N) |
| Q6 | Apakah warga perlu membayar via QRIS nyata di MVP? | Pengusul | **Terjawab oleh D1:** belum — QRIS hanya simulasi di arsitektur awal |

### 16.1 Keputusan yang Sudah Ditetapkan

| ID | Keputusan | Tanggal | Dampak |
|---|---|---|---|
| D1 | Payment gateway memakai **dummy adapter** untuk arsitektur awal | 4 Nov 2026 | FR-09 dikerjakan mode dummy; dana tidak lewat platform; klaim dibatasi pada integritas catatan |
| D2 | Stack dikunci: React.js + Node.js + MySQL 8 | 4 Nov 2026 | Opsi Next.js/Go/PostgreSQL dari PRD v1.0.0 dibatalkan |
| D3 | Integrasi WhatsApp memakai provider `console` (dummy) | 4 Nov 2026 | Tidak ada panggilan jaringan keluar; adapter resmi ditunda |
| D4 | Target rilis: **demo akademik**, bukan operasi RT/RW nyata | 4 Nov 2026 | Deploy single-node, data sintetis, NFR sebagai target desain, batasan ditulis di §5.3 |
| D5 | Tanggal disimpan **Gregorian**; input Hijriah dikonversi sekali saat setup lalu dikonfirmasi pengurus | 4 Nov 2026 | Tidak ada dependensi kalender Hijriah di runtime; cron & index tetap sederhana |
| D6 | **Tidak ada denda keterlambatan** di MVP | 4 Nov 2026 | Menghindari entitas `penalties`; tunggakan hanya informatif di laporan (FR-10) |
| D7 | Satu komunitas **boleh** memiliki beberapa program/paket aktif bersamaan | 4 Nov 2026 | Dashboard publik mengagregasi per paket (FR-06); tidak ada perubahan model data |

---

## 17. Glosarium

| Istilah | Arti |
|---|---|
| **Append-only** | Data hanya boleh ditambah, tidak boleh diubah atau dihapus |
| **Hash chain** | Setiap entri menyimpan hash entri sebelumnya sehingga perubahan satu entri merusak seluruh rantai sesudahnya |
| **Compensating entry** | Entri pembalik untuk menetralkan entri salah tanpa menghapusnya |
| **Anchor** | Catatan ringkas (root hash + jumlah entri) per hari untuk mendeteksi penulisan ulang massal |
| **SSE** | Server-Sent Events, kanal satu arah server → browser |
| **Dummy adapter** | Implementasi tiruan integrasi pihak ketiga untuk pengembangan/demo |
| **Crypto-shredding** | Menghapus data dengan membuang kunci enkripsinya |

---

*Dokumen ini menggantikan PRD v1.0.0. Perubahan stack (MySQL, React, Node) dan penambahan rencana integrasi dummy disetujui pada v1.1.0. Pada v1.1.1, payment gateway dikunci dalam mode dummy untuk arsitektur awal (§13.5, D1). Pada v1.1.2, target rilis ditetapkan sebagai demo akademik (D4, §5.3) dan penanganan tanggal jatuh tempo ditetapkan Gregorian dengan konversi Hijriah sekali saat setup (D5, FR-03). Pada v1.1.3, denda keterlambatan dikeluarkan dari MVP (D6) dan multi-program per komunitas diizinkan (D7).*
