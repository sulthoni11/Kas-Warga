-- SCFF — inisialisasi database & akun aplikasi.
-- Dijalankan otomatis oleh image MySQL saat volume masih kosong
-- (lihat docker-compose.yml: ./db/init dipasang ke /docker-entrypoint-initdb.d).

CREATE DATABASE IF NOT EXISTS scff
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Akun aplikasi.
-- PENTING: image MySQL otomatis memberi GRANT ALL pada MYSQL_DATABASE kepada
-- MYSQL_USER, sehingga akun aplikasi akan bisa DROP/ALTER tanpa blok di bawah.
-- Karena itu haknya dicabut lalu diberikan ulang secara minimal.
-- DDL (CREATE/ALTER/DROP) hanya dijalankan oleh migration sebagai root, bukan runtime aplikasi.
CREATE USER IF NOT EXISTS 'scff_app'@'%' IDENTIFIED BY 'scff_dev_password';
REVOKE ALL PRIVILEGES ON scff.* FROM 'scff_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON scff.* TO 'scff_app'@'%';

-- Pembatasan lebih lanjut: tabel ledger hanya SELECT+INSERT, dilakukan SETELAH
-- migration M2 lewat db/privileges-ledger.sql (lihat catatan di file tersebut).

-- Akun baca-saja untuk pengujian verifikasi rantai / demo audit.
CREATE USER IF NOT EXISTS 'scff_auditor'@'%' IDENTIFIED BY 'scff_auditor_password';
GRANT SELECT ON scff.* TO 'scff_auditor'@'%';

FLUSH PRIVILEGES;
