-- SCFF — invoice mencatat hasil settlement webhook (M4, FR-09).
-- Idempoten: kolom hanya ditambahkan bila belum ada.

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'invoices'
        AND COLUMN_NAME = 'ledger_seq') = 0,
    'ALTER TABLE invoices ADD COLUMN ledger_seq BIGINT UNSIGNED NULL AFTER status',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'invoices'
        AND COLUMN_NAME = 'paid_at') = 0,
    'ALTER TABLE invoices ADD COLUMN paid_at DATETIME NULL AFTER expires_at',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
