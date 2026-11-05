-- SCFF — alokasi setoran ke cicilan (M5).
-- `paid_amount` adalah cache dari jumlah setoran terkonfirmasi yang sudah
-- dialokasikan ke cicilan; status PAID bila paid_amount >= amount.
-- Idempoten: kolom hanya ditambahkan bila belum ada.

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'installments'
        AND COLUMN_NAME = 'paid_amount') = 0,
    'ALTER TABLE installments ADD COLUMN paid_amount BIGINT NOT NULL DEFAULT 0 AFTER amount',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
