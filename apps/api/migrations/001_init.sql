-- SCFF — skema inti (milestone M2).
-- Dijalankan sebagai ROOT (DDL tidak pernah diberikan ke akun runtime aplikasi).
--   bash scripts/verify-ledger.sh
SET NAMES utf8mb4;

-- ---------------------------------------------------------------- operasional

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('BENDAHARA', 'KETUA', 'SUPER_ADMIN') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  locked_until DATETIME NULL,
  consent_at DATETIME NULL,
  consent_version VARCHAR(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS communities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status ENUM('DRAFT', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_communities_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone_enc VARBINARY(255) NULL,
  phone_hash CHAR(64) NULL,
  address_enc VARBINARY(512) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  consent_at DATETIME NULL,
  consent_version VARCHAR(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_members_phone (community_id, phone_hash),
  CONSTRAINT fk_members_community FOREIGN KEY (community_id) REFERENCES communities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  target_amount BIGINT NOT NULL,
  due_date DATE NOT NULL,
  frequency ENUM('DAILY', 'WEEKLY') NOT NULL DEFAULT 'WEEKLY',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_packages_community (community_id),
  CONSTRAINT fk_packages_community FOREIGN KEY (community_id) REFERENCES communities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  package_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_package (member_id, package_id),
  CONSTRAINT fk_mp_member FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT fk_mp_package FOREIGN KEY (package_id) REFERENCES packages (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS installments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  member_package_id BIGINT UNSIGNED NOT NULL,
  seq INT UNSIGNED NOT NULL,
  amount BIGINT NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('DUE', 'PAID', 'WAIVED') NOT NULL DEFAULT 'DUE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_installments_seq (member_package_id, seq),
  CONSTRAINT fk_installments_mp FOREIGN KEY (member_package_id) REFERENCES member_packages (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deposits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  package_id BIGINT UNSIGNED NULL,
  amount BIGINT NOT NULL,
  method ENUM('CASH', 'TRANSFER', 'GATEWAY') NOT NULL,
  occurred_at DATETIME NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'VOIDED') NOT NULL DEFAULT 'PENDING',
  external_ref VARCHAR(120) NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  ledger_seq BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_deposits_idempotency (community_id, idempotency_key),
  KEY idx_deposits_member (member_id),
  CONSTRAINT fk_deposits_community FOREIGN KEY (community_id) REFERENCES communities (id),
  CONSTRAINT fk_deposits_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  deposit_id BIGINT UNSIGNED NULL,
  provider ENUM('dummy', 'midtrans', 'xendit') NOT NULL,
  provider_ref VARCHAR(120) NOT NULL,
  amount BIGINT NOT NULL,
  status ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_ref (provider, provider_ref),
  CONSTRAINT fk_invoices_deposit FOREIGN KEY (deposit_id) REFERENCES deposits (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reminder_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  template_key VARCHAR(60) NOT NULL,
  payload_json JSON NULL,
  status ENUM('QUEUED', 'SENT', 'FAILED') NOT NULL DEFAULT 'QUEUED',
  scheduled_date DATE NOT NULL,
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  provider_ref VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reminder_daily (member_id, template_key, scheduled_date),
  CONSTRAINT fk_reminder_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS public_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NULL,
  token_hash CHAR(64) NOT NULL,
  scope ENUM('COMMUNITY', 'MEMBER') NOT NULL DEFAULT 'COMMUNITY',
  expires_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_public_tokens_hash (token_hash),
  CONSTRAINT fk_tokens_community FOREIGN KEY (community_id) REFERENCES communities (id),
  CONSTRAINT fk_tokens_member FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------- append-only

-- `id`  : PK global auto-increment (bukan bagian dari hash).
-- `seq` : nomor urut PER KOMUNITAS, dipakai di dalam hash. Dipilih demikian karena
--         hash memuat seq, sedangkan auto-increment baru diketahui SETELAH insert —
--         sementara tabel ini tidak boleh di-UPDATE.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  seq BIGINT UNSIGNED NOT NULL,
  entry_type ENUM('DEPOSIT', 'VOID', 'ADJUSTMENT') NOT NULL,
  member_id BIGINT UNSIGNED NULL,
  amount BIGINT NOT NULL,
  occurred_at DATETIME NOT NULL,
  ref_type VARCHAR(32) NULL,
  ref_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  prev_hash CHAR(64) NOT NULL,
  hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ledger_seq (community_id, seq),
  -- Anti-fork: dua entri tidak boleh menunjuk hash sebelumnya yang sama.
  UNIQUE KEY uq_ledger_prev (community_id, prev_hash),
  KEY idx_ledger_hash (hash),
  CONSTRAINT fk_ledger_community FOREIGN KEY (community_id) REFERENCES communities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ledger_anchors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  community_id BIGINT UNSIGNED NOT NULL,
  anchor_date DATE NOT NULL,
  total_entries BIGINT UNSIGNED NOT NULL,
  root_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_anchor_day (community_id, anchor_date),
  CONSTRAINT fk_anchor_community FOREIGN KEY (community_id) REFERENCES communities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
