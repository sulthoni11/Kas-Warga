-- SCFF — tambahan untuk aplikasi (M2b).
-- Idempoten: kolom hanya ditambahkan bila belum ada.

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'failed_attempts') = 0,
    'ALTER TABLE users ADD COLUMN failed_attempts INT UNSIGNED NOT NULL DEFAULT 0',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'members' AND COLUMN_NAME = 'phone_e164') = 0,
    'ALTER TABLE members ADD COLUMN phone_e164 VARCHAR(20) NULL',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
