#!/usr/bin/env bash
# SCFF — runner migrasi (sekali jalan per file) dengan pencatatan schema_migrations.
# Prasyarat: Docker jalan, container MySQL hidup.
# Database lama tanpa tabel schema_migrations: semua file akan dicoba sekali lagi;
# file migrasi SCFF dibuat idempoten sehingga aman.
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT_PW="${DB_ROOT_PASSWORD:-scff_root_password}"
if [ -f .env ]; then
  ENV_PW="$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d= -f2- || true)"
  [ -n "${ENV_PW:-}" ] && ROOT_PW="$ENV_PW"
fi

mysql_root() {
  docker compose exec -T -e MYSQL_PWD="$ROOT_PW" mysql mysql -u root "$@"
}

echo "== pastikan MySQL hidup =="
if ! docker compose ps --status running --format '{{.Name}}' | grep -q scff-mysql; then
  echo "   container belum jalan, menjalankan docker compose up -d"
  docker compose up -d >/dev/null
  for _ in $(seq 1 40); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' scff-mysql 2>/dev/null || echo missing)" = "healthy" ] && break
    sleep 3
  done
fi
echo "   status: $(docker inspect --format '{{.State.Health.Status}}' scff-mysql)"

mysql_root scff <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(190) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

APPLIED="$(mysql_root -N -B scff -e 'SELECT version FROM schema_migrations' || true)"
APPLIED_COUNT=0
SKIPPED=0

for file in apps/api/migrations/*.sql; do
  version="$(basename "$file")"
  if printf '%s\n' "$APPLIED" | grep -Fxq "$version"; then
    echo "   skip  $version"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "   apply $version"
  mysql_root scff < "$file"
  mysql_root scff -e "INSERT INTO schema_migrations (version) VALUES ('$version')"
  APPLIED_COUNT=$((APPLIED_COUNT + 1))
done

echo "   selesai: $APPLIED_COUNT diterapkan, $SKIPPED dilewati"
