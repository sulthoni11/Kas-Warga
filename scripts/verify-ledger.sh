#!/usr/bin/env bash
# SCFF — migration + penguncian + uji ledger (M2).
# Prasyarat: Docker jalan, container MySQL hidup (docker compose up -d).
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

echo "== 0/6 pastikan MySQL hidup =="
if ! docker compose ps --status running --format '{{.Name}}' | grep -q scff-mysql; then
  echo "   container belum jalan, menjalankan docker compose up -d"
  docker compose up -d >/dev/null
  for _ in $(seq 1 40); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' scff-mysql 2>/dev/null || echo missing)" = "healthy" ] && break
    sleep 3
  done
fi
echo "   status: $(docker inspect --format '{{.State.Health.Status}}' scff-mysql)"

echo "== 1/6 migration (sebagai root) =="
for file in apps/api/migrations/*.sql; do
  echo "   apply $file"
  mysql_root scff < "$file"
done

echo "== 2/6 kunci hak akses tabel ledger =="
mysql_root scff < db/privileges-ledger.sql

echo "== 3/6 smoke test ledger (akun aplikasi) =="
SMOKE_OUT="$(node apps/api/scripts/ledger-smoke.js)"
echo "$SMOKE_OUT" | sed 's/^/   /'
CID="$(echo "$SMOKE_OUT" | grep -o 'SMOKE_COMMUNITY_ID=[0-9]*' | cut -d= -f2)"

echo "== 4/6 trigger menolak UPDATE walau sebagai root =="
if mysql_root scff -e "UPDATE ledger_entries SET amount = 123456 WHERE community_id = $CID AND seq = 2" 2>/dev/null; then
  echo "   FAIL trigger tidak memblokir UPDATE"
  exit 1
else
  echo "   PASS UPDATE ditolak trigger SIGNAL (SQLSTATE 45000)"
fi

echo "== 5/6 deteksi tampering saat trigger dilepas =="
ORIG_AMOUNT="$(mysql_root -N -B scff -e "SELECT amount FROM ledger_entries WHERE community_id = $CID AND seq = 2")"
mysql_root scff -e "DROP TRIGGER IF EXISTS trg_ledger_entries_no_update"
mysql_root scff -e "UPDATE ledger_entries SET amount = 123456 WHERE community_id = $CID AND seq = 2"

if node apps/api/scripts/ledger-verify.js "$CID" > /tmp/scff-verify-tampered.json 2>&1; then
  echo "   FAIL verifyChain tidak mendeteksi perubahan"
  cat /tmp/scff-verify-tampered.json
  exit 1
else
  echo "   PASS verifyChain INVALID: $(cat /tmp/scff-verify-tampered.json)"
fi

# Kembalikan nilai asli lalu pasang lagi trigger-nya.
mysql_root scff -e "UPDATE ledger_entries SET amount = $ORIG_AMOUNT WHERE community_id = $CID AND seq = 2"
mysql_root scff < apps/api/migrations/002_ledger_triggers.sql

if node apps/api/scripts/ledger-verify.js "$CID" > /tmp/scff-verify-restored.json 2>&1; then
  echo "   PASS setelah data dipulihkan, rantai kembali VALID: $(cat /tmp/scff-verify-restored.json)"
else
  echo "   FAIL rantai tidak kembali VALID setelah pemulihan"
  cat /tmp/scff-verify-restored.json
  exit 1
fi

echo "== 6/6 hak akses akhir =="
mysql_root -N -B -e "SHOW GRANTS FOR 'scff_app'@'%'" | sed 's/^/   /'

echo
echo "SELESAI: migration, penguncian, dan uji ledger lolos."
