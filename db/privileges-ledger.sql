-- SCFF — lapis 1 penguncian ledger: hak akses DB (PRD §8.3).
-- Jalankan sebagai ROOT, SETELAH migration tabel (kalau tabel belum ada,
-- GRANT/REVOKE tingkat tabel akan gagal).
--
-- MySQL TIDAK punya negative privilege, jadi strateginya dibalik:
--   1) cabut UPDATE/DELETE di level database,
--   2) berikan kembali UPDATE/DELETE hanya pada tabel operasional.
-- Hasilnya ledger_entries & ledger_anchors tinggal SELECT + INSERT.
--
-- DDL (CREATE/ALTER/DROP) tidak pernah diberikan ke akun runtime; migration
-- dijalankan sebagai root oleh scripts/verify-ledger.sh.

REVOKE UPDATE, DELETE ON scff.* FROM 'scff_app'@'%';
GRANT SELECT, INSERT ON scff.* TO 'scff_app'@'%';

GRANT UPDATE, DELETE ON scff.users TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.sessions TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.communities TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.members TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.packages TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.member_packages TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.installments TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.deposits TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.invoices TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.reminder_outbox TO 'scff_app'@'%';
GRANT UPDATE, DELETE ON scff.public_tokens TO 'scff_app'@'%';

FLUSH PRIVILEGES;
