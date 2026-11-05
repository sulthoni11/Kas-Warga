-- SCFF — kolom RT pada anggota (M5: filter & rekap per RT).
-- Idempoten: kolom dan indeks hanya dibuat bila belum ada.

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'members' AND COLUMN_NAME = 'rt') = 0,
    'ALTER TABLE members ADD COLUMN rt VARCHAR(5) NULL AFTER name',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'scff' AND TABLE_NAME = 'members' AND INDEX_NAME = 'idx_members_rt') = 0,
    'ALTER TABLE members ADD INDEX idx_members_rt (community_id, rt)',
    'DO 0'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
