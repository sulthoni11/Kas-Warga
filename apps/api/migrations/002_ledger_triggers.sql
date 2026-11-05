-- SCFF — lapis 2 penguncian ledger: trigger penjaga (PRD §8.3).
-- Idempoten: aman dijalankan berulang.
--
-- Trigger ini bekerja bahkan untuk akun pemilik database (root), sehingga
-- menutup celah yang tidak bisa ditutup oleh GRANT/REVOKE saja.
-- Hapus trigger ini hanya untuk keperluan uji deteksi tampering
-- (lihat scripts/verify-ledger.sh).

DROP TRIGGER IF EXISTS trg_ledger_entries_no_update;
DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete;
DROP TRIGGER IF EXISTS trg_ledger_anchors_no_update;
DROP TRIGGER IF EXISTS trg_ledger_anchors_no_delete;

DELIMITER $$

CREATE TRIGGER trg_ledger_entries_no_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'ledger_entries bersifat append-only: UPDATE ditolak';
END$$

CREATE TRIGGER trg_ledger_entries_no_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'ledger_entries bersifat append-only: DELETE ditolak';
END$$

CREATE TRIGGER trg_ledger_anchors_no_update
BEFORE UPDATE ON ledger_anchors
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'ledger_anchors bersifat append-only: UPDATE ditolak';
END$$

CREATE TRIGGER trg_ledger_anchors_no_delete
BEFORE DELETE ON ledger_anchors
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'ledger_anchors bersifat append-only: DELETE ditolak';
END$$

DELIMITER ;
