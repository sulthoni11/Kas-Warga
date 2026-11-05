# SCFF — Smart Community Festive Fund

Platform pengelolaan dana sosial komunitas dengan **ledger append-only berantai hash**, portal
transparansi publik, dan penagihan otomatis.

Status: **v0.3.2 — aplikasi berjalan (M1–M4 + alokasi cicilan)**. Dokumen acuan: [`PRD.md`](./PRD.md) v1.1.4.

Panduan pemakaian langkah-demi-langkah: [`PANDUAN.md`](./PANDUAN.md).

> Target rilis: **demo akademik** (D4). Payment gateway dan WhatsApp berjalan **mode dummy**
> (D1, D3). Tidak ada uang yang bergerak melalui sistem dan tidak ada pesan yang benar-benar
> dikirim.

## Prasyarat

- Node.js ≥ 20
- Docker (untuk MySQL 8) — atau MySQL 8 yang sudah terpasang

## Menjalankan

```bash
cp .env.example .env          # sesuaikan bila perlu
docker compose up -d          # MySQL 8 + akun scff_app / scff_auditor
npm install                   # workspace root (api + web)
npm run dev                   # API di :4000 dan web di :5173 (PowerShell, cmd, bash)
```

Cek API: <http://localhost:4000/health> · UI: <http://localhost:5173>

Migrasi skema + penguncian hak akses + seluruh uji ledger (rantai, konkurensi, tamper):

```bash
bash scripts/verify-ledger.sh
```

Skrip itu memakai bash — jalankan dari **Git Bash**, bukan PowerShell.

## Akun demo (seed)

| Email | Peran | Boleh |
|---|---|---|
| `bendahara@gmail.com` | BENDAHARA | catat setoran, koreksi, kelola anggota/paket, jalankan pengingat |
| `ketua@gmail.com` | KETUA | baca-saja, verifikasi rantai, ekspor CSV |
| `admin@gmail.com` | SUPER_ADMIN | kelola komunitas |

Password semua akun: `12345678` — **hanya untuk demo lokal**, wajib diganti sebelum dipakai di luar demo.

```bash
node apps/api/scripts/seed.js     # data demo, idempoten berdasarkan slug komunitas
bash scripts/smoke-api.sh         # 50+ pemeriksaan API end-to-end

# Setelah migrasi 007 pada database lama: selaraskan ulang cicilan dengan setoran.
node apps/api/scripts/reconcile-installments.js
```

## Alur singkat

1. `npm run dev` → buka <http://localhost:5173/admin>
2. Login `bendahara@gmail.com` → ringkasan **R2 09 Dukuh Tlobong** (6 anggota, 2 paket, 12 setoran). Tidak ada dropdown komunitas; aplikasi berjalan untuk satu komunitas.
3. Catat setoran → "Terkumpul" naik, entri baru muncul, badge rantai tetap VALID.
4. Klik **koreksi** pada entri → sistem membuat VOID + entri baru; entri lama tidak hilang.
5. **Buat link publik** → buka `/s/<token>` di jendela lain, lalu catat setoran lagi: halaman itu berubah tanpa reload (SSE).
6. Dashboard publik punya tombol **Verifikasi keaslian catatan**.

## Struktur

```
apps/
  api/                        Node.js 20 + Express (ESM)
    src/
      config.js               validasi env (zod), gagal cepat bila konfigurasi salah
      db.js                   pool mysql2
      auth/                   scrypt password, sesi cookie httpOnly, RBAC
      services/ledger.js      hash-chain: appendEntry (GET_LOCK) + verifyChain
      services/summary.js     ringkasan komunitas + kalkulator cicilan (FR-03)
      services/installments.js  alokasi setoran -> cicilan (FIFO, boleh sebagian)
      services/payments.js    settlement invoice idempoten -> entri ledger (FR-09)
      services/events.js      kanal SSE per komunitas
      integrations/
        whatsapp/             adapter: console (dummy) + stub fonnte
        payments/             adapter: dummy (QR/VA palsu + verifikasi HMAC)
      routes/                 auth, admin, public (SSE), health, webhooks, dev
      jobs/reminders.js       cron 08:00 pengingat + 23:59 anchor
    migrations/               001_init.sql … 007_installments_paid_amount.sql
    scripts/                  seed.js, reconcile-installments.js, ledger-smoke.js, ledger-verify.js
  web/                        React 18 + Vite + Tailwind
    src/pages/Landing.jsx
    src/pages/PublicDashboard.jsx   placeholder FR-06 (M3)
db/
  init/01-database.sql        database + akun aplikasi (dijalankan image MySQL)
  privileges-ledger.sql       lockdown tabel ledger — jalankan SETELAH migration M2
docker-compose.yml
```

## Sudah jalan

- Server Express + `/health` dan `/health/db`, header keamanan dasar, error handler.
- Validasi konfigurasi: memilih provider yang belum diimplementasikan **menghentikan**
  aplikasi dengan pesan jelas (FR-08 AC), bukan diam-diam berjalan setengah jadi.
- Payment adapter dummy: `createInvoice` (QR/VA palsu, TTL 15 menit), verifikasi signature
  webhook HMAC-SHA256 *timing-safe*, dan settlement idempoten ke ledger melalui
  `POST /api/webhooks/payment/dummy` (`providerRef` + `status` + `amount` opsional).
- WhatsApp adapter dummy: mencatat `[WA:DUMMY]` ke log tanpa panggilan jaringan.
- UI: landing status milestone, route `/s/:token` sebagai placeholder dashboard publik.
- Skema inti M2 di `apps/api/migrations/`: 11 tabel operasional + `ledger_entries` + `ledger_anchors`.
- `appendEntry` dengan `GET_LOCK` per komunitas, `verifyChain` (VALID/INVALID + `firstBrokenSeq`), dan CLI `ledger-verify.js`.
- Penguncian ledger 3 lapis: hak akses DB (`scff_app` hanya `SELECT`/`INSERT` pada tabel ledger), trigger `SIGNAL` yang menolak `UPDATE`/`DELETE` bahkan sebagai root, dan tidak ada kode yang menulis `UPDATE`.
- `scripts/verify-ledger.sh`: migration + privileges + 14 pemeriksaan otomatis (rantai, genesis, konkurensi 10 paralel, penolakan DML, trigger, deteksi tamper, pemulihan).
- `scripts/smoke-api.sh`: 50+ pemeriksaan API (login, RBAC 403, setoran, idempotensi, alokasi setoran ke cicilan, koreksi + VOID, verifikasi rantai, token publik, SSE, pembuatan paket + cicilan, tambah/hapus anggota dengan normalisasi telepon & RT, rekap per RT, pengingat dummy, CSV, anchor, webhook HMAC, settlement invoice dummy -> ledger idempoten).
- Alokasi setoran: setiap setoran CONFIRMED (tunai/admin maupun gateway) langsung melunasi cicilan tertua anggota. Setoran dengan paket hanya menyentuh paket itu; tanpa paket menyentuh semua paket. Pembayaran sebagian disimpan di `installments.paid_amount`, status menjadi `PAID` saat lunas. `scripts/reconcile-installments.js` menghitung ulang data lama.
- UI: login pengurus, panel admin (setoran, koreksi, anggota, paket, pengingat, link publik), dashboard warga dengan SSE.

## Belum diimplementasikan (sesuai milestone)

| Milestone | Isi |
|---|---|
| ~~M2~~ **selesai** | Skema, `appendEntry` + `GET_LOCK`, trigger append-only, hak akses DB, uji tamper & konkurensi |
| ~~M2b~~ **selesai** | Auth + RBAC, endpoint setoran & koreksi (compensating entry) |
| ~~M3~~ **selesai** | Dashboard publik ber-token, SSE, verifikasi rantai |
| ~~M4~~ **selesai** | Outbox pengingat + cron; webhook payment dummy → deposit CONFIRMED + tepat satu entri ledger (idempoten, tahan retry) |
| ~~M5~~ **sebagian** | Ekspor CSV & seed demo selesai; **belum**: enkripsi PII (crypto-shredding), rate limit auth, uji beban NFR |

`seq` pada `ledger_entries` adalah nomor urut **per komunitas** (PK memakai `id`), karena hash
memuat `seq` sementara nilai `id` baru diketahui setelah `INSERT` — dan baris ledger tidak boleh
di-`UPDATE`.

## Catatan keamanan & batasan

- Klaim anti-fraud dibatasi pada **integritas catatan**, bukan kebenaran arus dana (PRD §1, §13.5).
- Hash chain menjaga konsistensi internal; tanpa `ledger_anchors` harian (FR-11), pihak dengan
  akses tulis DB + kode aplikasi masih dapat menghitung ulang seluruh rantai (PRD §9).
- `.env` di-gitignore. Kredensial di `.env.example` hanya untuk pengembangan lokal.
