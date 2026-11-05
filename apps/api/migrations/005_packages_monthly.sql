-- SCFF — frekuensi cicilan bulanan (MONTHLY).
-- Idempoten: enum hanya diubah bila MONTHLY belum ada.

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'packages'
        AND COLUMN_NAME = 'frequency' AND COLUMN_TYPE LIKE '%MONTHLY%') = 0,
    "ALTER TABLE packages MODIFY COLUMN frequency ENUM('DAILY','WEEKLY','MONTHLY') NOT NULL DEFAULT 'WEEKLY'",
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
