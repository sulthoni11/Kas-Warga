#!/usr/bin/env bash
# SCFF — smoke test API end-to-end (auth, RBAC, setoran, koreksi, publik, SSE, pengingat, CSV).
# Menjalankan server sendiri di PORT (default 4200) agar tidak bentrok dengan dev server.
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-4200}"
BASE="http://localhost:$PORT"
JAR="$(mktemp)"
KJAR="$(mktemp)"
BODY="$(mktemp)"
PASS=0
FAIL=0

pass() { printf 'PASS  %s\n' "$1"; PASS=$((PASS + 1)); }
flop() { printf 'FAIL  %s  — %s\n' "$1" "${2:-}"; FAIL=$((FAIL + 1)); }

# json <path.dotted> : ambil nilai dari BODY
json() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const v=process.argv[1].split('.').reduce((a,k)=>a?.[k],j);console.log(v===undefined?'':v)}catch(e){console.log('')}})" "$1" < "$BODY"
}

# sum_paid <packageId> : total paidAmount cicilan untuk satu paket dari BODY
sum_paid() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const pid=Number(process.argv[1]);const s=(j.items||[]).filter(x=>x.packageId===pid).reduce((n,x)=>n+Number(x.paidAmount||0),0);console.log(s)}catch(e){console.log('err')}})" "$1" < "$BODY"
}

req() { # method path [json] [jar]
  local method="$1" path="$2" data="${3:-}" jar="${4:-$JAR}"
  if [ -n "$data" ]; then
    curl -s -o "$BODY" -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" "$BASE$path" \
      -H 'Content-Type: application/json' -d "$data"
  else
    curl -s -o "$BODY" -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" "$BASE$path"
  fi
}

PORT="$PORT" node apps/api/src/index.js > /tmp/scff-smoke-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT

for _ in $(seq 1 40); do
  curl -s -o /dev/null --max-time 1 "$BASE/health" && break
  sleep 0.5
done

# 1. auth
code=$(req POST /api/auth/login '{"email":"bendahara@gmail.com","password":"12345678"}')
[ "$code" = "200" ] && pass "login bendahara" || flop "login bendahara" "$code $(cat "$BODY")"

code=$(req GET /api/auth/me)
role=$(json user.role)
[ "$code" = "200" ] && [ "$role" = "BENDAHARA" ] && pass "/auth/me mengembalikan peran" || flop "/auth/me" "$code $role"

code=$(req POST /api/auth/login '{"email":"bendahara@gmail.com","password":"salah"}')
[ "$code" = "401" ] && pass "password salah ditolak (401)" || flop "password salah" "$code"

# 2. bootstrap + summary
code=$(req GET /api/admin/bootstrap)
# Pilih komunitas seed (slug bukan "test-*") agar uji tidak mengenai data sisa uji ledger.
COMMUNITY_ID=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const cs=(j.communities||[]).filter(c=>!String(c.slug).startsWith('test-'));console.log(cs[0]?.id??'')}catch(e){console.log('')}})" < "$BODY")
[ "$code" = "200" ] && [ -n "$COMMUNITY_ID" ] && pass "bootstrap (komunitas seed $COMMUNITY_ID)" || flop "bootstrap" "$code"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
MEMBER_ID=$(json members.0.id)
PACKAGE_ID=$(json packages.0.id)
ENTRIES_BEFORE=$(json totals.entries)
[ "$code" = "200" ] && [ -n "$MEMBER_ID" ] && pass "summary komunitas ($ENTRIES_BEFORE entri)" || flop "summary" "$code"

code=$(req GET "/api/dev/installments/$MEMBER_ID")
# Pilih paket dengan sisa cicilan terbesar agar uji alokasi tidak bergantung
# pada paket mana yang sudah lunas di database demo.
ALLOC_INFO=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const g=new Map();for(const x of j.items||[]){const o=Number(x.amount)-Number(x.paidAmount||0);const cur=g.get(x.packageId)||{pid:x.packageId,paid:0,outstanding:0};cur.paid+=Number(x.paidAmount||0);cur.outstanding+=Math.max(o,0);g.set(x.packageId,cur)}const best=[...g.values()].sort((a,b)=>b.outstanding-a.outstanding)[0];console.log(best?best.pid+'|'+best.paid+'|'+best.outstanding:'')}catch(e){console.log('')}})" < "$BODY")
ALLOC_PKG_ID=${ALLOC_INFO%%|*}
ALLOC_REST=${ALLOC_INFO#*|}
PAID_BEFORE=${ALLOC_REST%%|*}
OUTSTANDING_BEFORE=${ALLOC_REST##*|}
DEPOSIT_AMOUNT=$(( OUTSTANDING_BEFORE < 30000 ? OUTSTANDING_BEFORE : 30000 ))
CORRECTED_AMOUNT=$(( DEPOSIT_AMOUNT > 10000 ? DEPOSIT_AMOUNT - 10000 : DEPOSIT_AMOUNT - 1 ))
[ "$code" = "200" ] && [ -n "$ALLOC_PKG_ID" ] && [ "$OUTSTANDING_BEFORE" -gt 0 ] && pass "inspeksi cicilan anggota (paket $ALLOC_PKG_ID, sisa $OUTSTANDING_BEFORE)" || flop "inspeksi cicilan" "$code $ALLOC_INFO"

# 2b. tambah anggota: nomor telepon berformat harus diterima dan dinormalkan
code=$(req POST "/api/admin/communities/$COMMUNITY_ID/members" '{"name":"Anggota Uji Smoke","phone":"0812-3456-7890","rt":"3"}')
NEW_MEMBER_ID=$(json member.id)
PHONE=$(json member.phone)
MEMBER_RT=$(json member.rt)
[ "$code" = "201" ] && [ "$PHONE" = "+6281234567890" ] && pass "tambah anggota menerima telepon berformat (0812-3456-7890 -> $PHONE)" || flop "tambah anggota" "$code $PHONE $(cat "$BODY")"
[ "$MEMBER_RT" = "03" ] && pass "RT dinormalkan menjadi 2 digit (3 -> $MEMBER_RT)" || flop "RT anggota" "$MEMBER_RT"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
RT_GROUPS=$(json rtSummary.0.rt)
[ "$code" = "200" ] && [ -n "$RT_GROUPS" ] && pass "rekap per RT tersedia (RT pertama: $RT_GROUPS)" || flop "rekap RT" "$code $RT_GROUPS"

DETAIL_CHECK=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const sum=a=>(a||[]).reduce((n,x)=>n+x.installments,0);const mOk=(j.members||[]).every(m=>Array.isArray(m.arrearsDetail)&&sum(m.arrearsDetail)===m.arrears);const rOk=(j.rtSummary||[]).every(r=>Array.isArray(r.arrearsDetail)&&sum(r.arrearsDetail)===r.arrears);console.log(mOk&&rOk?'ok':'bad')}catch(e){console.log('err')}})" < "$BODY")
[ "$DETAIL_CHECK" = "ok" ] && pass "summary menyertakan rincian tunggakan per paket (anggota & RT)" || flop "rincian tunggakan" "$DETAIL_CHECK"

code=$(req POST "/api/admin/communities/$COMMUNITY_ID/installments/reconcile")
RECONCILED=$(json reconciled)
RECONCILE_FAILED=$(json failed)
[ "$code" = "200" ] && [ "$RECONCILED" -ge 1 ] && [ "$RECONCILE_FAILED" = "0" ] && pass "rekonsiliasi cicilan manual ($RECONCILED anggota)" || flop "rekonsiliasi cicilan" "$code $(cat "$BODY")"

# 2c. rincian cicilan admin (dipakai UI mobile) + analisis keuangan
code=$(req GET "/api/admin/communities/$COMMUNITY_ID/members/$MEMBER_ID/installments")
DETAIL_PKGS=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const ok=j.member?.id===Number('$MEMBER_ID')&&(j.installments||[]).length>0&&(j.installments||[]).every(x=>typeof x.packageId==='number'&&typeof x.packageName==='string'&&Number(x.amount)>=Number(x.paidAmount));console.log(ok?'ok':'bad')}catch(e){console.log('err')}})" < "$BODY")
[ "$code" = "200" ] && [ "$DETAIL_PKGS" = "ok" ] && pass "rincian cicilan admin (member $MEMBER_ID, paket+nama terisi)" || flop "rincian cicilan admin" "$code $DETAIL_PKGS"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/members/999999/installments")
[ "$code" = "404" ] && [ "$(json error)" = "MEMBER_NOT_FOUND" ] && pass "rincian cicilan anggota asing ditolak (404)" || flop "rincian anggota asing" "$code"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/analytics?months=6")
ANALYTICS_OK=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const ok=j.series?.length===6&&j.series.every(s=>/^\d{4}-\d{2}$/.test(s.month)&&typeof s.collected==='number'&&typeof s.dueRemaining==='number')&&typeof j.installmentStats?.total==='number'&&Array.isArray(j.packages)&&Array.isArray(j.rt);console.log(ok?'ok':'bad')}catch(e){console.log('err')}})" < "$BODY")
[ "$code" = "200" ] && [ "$ANALYTICS_OK" = "ok" ] && pass "analisis keuangan (6 bulan + stats cicilan)" || flop "analisis keuangan" "$code $ANALYTICS_OK $(cat "$BODY")"

code=$(req POST "/api/admin/communities/$COMMUNITY_ID/members" '{"name":"Anggota Uji Smoke","phone":"0812-abc"}')
PHONE_ERR=$(json error)
[ "$code" = "400" ] && [ "$PHONE_ERR" = "PHONE_INVALID" ] && pass "telepon tidak masuk akal ditolak (PHONE_INVALID)" || flop "validasi telepon" "$code $PHONE_ERR"

code=$(req PATCH "/api/admin/communities/$COMMUNITY_ID/members/$NEW_MEMBER_ID" '{"name":"Anggota Uji Smoke Edit","rt":"5"}')
EDITED_NAME=$(json member.name)
EDITED_RT=$(json member.rt)
[ "$code" = "200" ] && [ "$EDITED_NAME" = "Anggota Uji Smoke Edit" ] && [ "$EDITED_RT" = "05" ] && pass "edit anggota: nama & RT diperbarui (RT $EDITED_RT)" || flop "edit anggota" "$code $EDITED_NAME $EDITED_RT"

# Anggota baru belum terdaftar di paket yang dibuat sebelum ia ada.
code=$(req POST /api/admin/deposits "{\"communityId\":$COMMUNITY_ID,\"memberId\":$NEW_MEMBER_ID,\"packageId\":$PACKAGE_ID,\"amount\":10000,\"method\":\"CASH\"}")
PKG_ERR=$(json error)
[ "$code" = "400" ] && [ "$PKG_ERR" = "PACKAGE_NOT_ENROLLED" ] && pass "setoran ke paket yang belum diikuti ditolak (PACKAGE_NOT_ENROLLED)" || flop "validasi paket anggota" "$code $PKG_ERR"

code=$(req POST /api/admin/deposits "{\"communityId\":$COMMUNITY_ID,\"memberId\":$NEW_MEMBER_ID,\"packageId\":999999,\"amount\":10000,\"method\":\"CASH\"}")
PKG_ERR=$(json error)
[ "$code" = "404" ] && [ "$PKG_ERR" = "PACKAGE_NOT_FOUND" ] && pass "setoran ke paket asing ditolak (PACKAGE_NOT_FOUND)" || flop "validasi paket komunitas" "$code $PKG_ERR"

code=$(req POST /api/dev/payments/simulate "{\"communityId\":$COMMUNITY_ID,\"memberId\":$NEW_MEMBER_ID,\"packageId\":$PACKAGE_ID,\"amount\":10000}")
PKG_ERR=$(json error)
[ "$code" = "400" ] && [ "$PKG_ERR" = "PACKAGE_NOT_ENROLLED" ] && pass "invoice gateway ke paket yang belum diikuti ditolak" || flop "validasi paket gateway" "$code $PKG_ERR"

code=$(req DELETE "/api/admin/communities/$COMMUNITY_ID/members/$NEW_MEMBER_ID")
MODE=$(json mode)
[ "$code" = "200" ] && [ "$MODE" = "deleted" ] && pass "hapus anggota tanpa riwayat setoran (mode=$MODE)" || flop "hapus anggota" "$code $MODE $(cat "$BODY")"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
STILL_THERE=$(node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log((j.members||[]).some(m=>m.id==Number(process.argv[1])))}catch(e){console.log('err')}})" "$NEW_MEMBER_ID" < "$BODY")
[ "$STILL_THERE" = "false" ] && pass "anggota yang dihapus tidak lagi di daftar" || flop "hapus anggota dari daftar" "$STILL_THERE"

# 3. setoran + idempotensi
IDEM="smoke-$(date +%s)"
code=$(req POST /api/admin/deposits "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"packageId\":$ALLOC_PKG_ID,\"amount\":$DEPOSIT_AMOUNT,\"method\":\"CASH\",\"idempotencyKey\":\"$IDEM\"}")
DEPOSIT_ID=$(json deposit.id)
DEPOSIT_SEQ=$(json deposit.ledgerSeq)
[ "$code" = "201" ] && [ -n "$DEPOSIT_SEQ" ] && pass "setoran tercatat (entri #$DEPOSIT_SEQ)" || flop "setoran" "$code $(cat "$BODY")"

code=$(req GET "/api/dev/installments/$MEMBER_ID")
PAID_AFTER=$(sum_paid "$ALLOC_PKG_ID")
[ "$code" = "200" ] && [ "$PAID_AFTER" = "$((PAID_BEFORE + DEPOSIT_AMOUNT))" ] && pass "setoran langsung melunasi cicilan paket terkait (+$DEPOSIT_AMOUNT)" || flop "alokasi setoran" "$PAID_BEFORE -> $PAID_AFTER"

code=$(req POST /api/admin/deposits "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"amount\":30000,\"method\":\"CASH\",\"idempotencyKey\":\"$IDEM\"}")
IDEMPOTENT=$(json idempotent)
[ "$code" = "200" ] && [ "$IDEMPOTENT" = "true" ] && pass "idempotency key duplikat tidak membuat entri ganda" || flop "idempotensi" "$code $IDEMPOTENT"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
ENTRIES_AFTER=$(json totals.entries)
[ "$ENTRIES_AFTER" = "$((ENTRIES_BEFORE + 1))" ] && pass "jumlah entri bertambah tepat 1" || flop "hitung entri" "$ENTRIES_BEFORE -> $ENTRIES_AFTER"

# 4. koreksi (compensating entry)
code=$(req POST "/api/admin/deposits/$DEPOSIT_ID/correct" "{\"correctedAmount\":$CORRECTED_AMOUNT,\"reason\":\"Salah input nominal setoran tunai\"}")
VOID_SEQ=$(json voidEntry.seq)
NEW_SEQ=$(json newEntry.seq)
[ "$code" = "200" ] && [ -n "$VOID_SEQ" ] && [ -n "$NEW_SEQ" ] && pass "koreksi: VOID #$VOID_SEQ + entri baru #$NEW_SEQ" || flop "koreksi" "$code $(cat "$BODY")"

code=$(req GET "/api/dev/installments/$MEMBER_ID")
PAID_CORRECTED=$(sum_paid "$ALLOC_PKG_ID")
[ "$code" = "200" ] && [ "$PAID_CORRECTED" = "$((PAID_BEFORE + CORRECTED_AMOUNT))" ] && pass "koreksi menyesuaikan alokasi cicilan (+$CORRECTED_AMOUNT)" || flop "alokasi koreksi" "$PAID_AFTER -> $PAID_CORRECTED"

code=$(req POST "/api/admin/deposits/$DEPOSIT_ID/correct" '{"correctedAmount":20000,"reason":"Salah input nominal setoran tunai"}')
[ "$code" = "409" ] && pass "koreksi ganda ditolak (409)" || flop "koreksi ganda" "$code"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/verify")
OK=$(json ok)
[ "$OK" = "true" ] && pass "rantai tetap VALID setelah koreksi" || flop "verify rantai" "$(cat "$BODY")"

# 5. RBAC
code=$(req POST /api/auth/login '{"email":"ketua@gmail.com","password":"12345678"}' "$KJAR")
code=$(req POST /api/admin/deposits "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"amount\":10000,\"method\":\"CASH\"}" "$KJAR")
[ "$code" = "403" ] && pass "peran KETUA ditolak saat menulis setoran (403)" || flop "RBAC ketua" "$code"

code=$(req POST "/api/admin/communities/$COMMUNITY_ID/installments/reconcile" "" "$KJAR")
[ "$code" = "403" ] && pass "peran KETUA ditolak menyinkronkan cicilan (403)" || flop "RBAC rekonsiliasi" "$code"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/verify" "" "$KJAR")
[ "$code" = "200" ] && pass "peran KETUA boleh membaca verifikasi" || flop "RBAC ketua baca" "$code"

# RBAC khusus SUPER_ADMIN
code=$(req GET /api/admin/users "" "$KJAR")
[ "$code" = "403" ] && pass "peran KETUA ditolak melihat daftar akun (403)" || flop "users ketua" "$code"

AJAR="$(mktemp)"
req POST /api/auth/login '{"email":"admin@gmail.com","password":"12345678"}' "$AJAR" > /dev/null
code=$(req GET /api/admin/users "" "$AJAR")
FIRST_ACCOUNT=$(json items.0.email)
[ "$code" = "200" ] && [ -n "$FIRST_ACCOUNT" ] && pass "SUPER_ADMIN melihat daftar akun ($FIRST_ACCOUNT)" || flop "users admin" "$code"

# 6. portal publik
code=$(req POST "/api/admin/communities/$COMMUNITY_ID/public-token")
TOKEN=$(json token)
[ "$code" = "201" ] && [ -n "$TOKEN" ] && pass "token publik dibuat" || flop "token publik" "$code"

code=$(curl -s -o "$BODY" -w '%{http_code}' "$BASE/api/public/$TOKEN")
PUBLIC_TOTAL=$(json totals.collected)
[ "$code" = "200" ] && [ -n "$PUBLIC_TOTAL" ] && pass "dashboard publik tanpa login (terkumpul $PUBLIC_TOTAL)" || flop "dashboard publik" "$code"
PUBLIC_RT=$(json recentEntries.0.memberRt)
[ -n "$PUBLIC_RT" ] && pass "portal publik menampilkan RT pada mutasi (RT $PUBLIC_RT)" || flop "RT di portal publik" "${PUBLIC_RT:-kosong}"

code=$(curl -s -o "$BODY" -w '%{http_code}' "$BASE/api/public/token-palsu-yang-tidak-ada-1234567890")
[ "$code" = "410" ] && pass "token tidak valid ditolak (410)" || flop "token invalid" "$code"

SSE=$(curl -s -N --max-time 2 "$BASE/api/public/$TOKEN/stream" 2>/dev/null | head -3)
case "$SSE" in
  *"event: ready"*) pass "SSE mengirim event ready" ;;
  *) flop "SSE" "${SSE:-tidak ada data}" ;;
esac

# 7. paket baru -> jadwal cicilan otomatis (FR-03)
DUE=$(date -d '+3 days' +%Y-%m-%d 2>/dev/null || date -v+3d +%Y-%m-%d)
code=$(req POST "/api/admin/communities/$COMMUNITY_ID/packages" "{\"name\":\"Uji Harian\",\"targetAmount\":30000,\"dueDate\":\"$DUE\",\"frequency\":\"DAILY\"}")
PERIODS=$(json plan.periods)
REGULAR=$(json plan.regular)
PKG_ID=$(json package.id)
[ "$code" = "201" ] && [ "$PERIODS" = "3" ] && pass "paket harian -> $PERIODS cicilan @ $REGULAR untuk semua anggota" || flop "buat paket" "$code $(cat "$BODY")"

DUE_M=$(node -e "console.log(new Date(Date.now()+95*864e5).toISOString().slice(0,10))")
code=$(req POST "/api/admin/communities/$COMMUNITY_ID/packages" "{\"name\":\"Uji Bulanan\",\"targetAmount\":300000,\"dueDate\":\"$DUE_M\",\"frequency\":\"MONTHLY\"}")
PERIODS_M=$(json plan.periods)
PKG_M=$(json package.id)
[ "$code" = "201" ] && [ "$PERIODS_M" = "3" ] && pass "paket bulanan -> $PERIODS_M cicilan (frekuensi MONTHLY)" || flop "paket bulanan" "$code $PERIODS_M $(cat "$BODY")"

code=$(req DELETE "/api/admin/packages/$PKG_M")
[ "$code" = "204" ] && pass "paket bulanan uji dihapus (204)" || flop "hapus paket bulanan" "$code"

# 8. pengingat dummy + CSV + anchor
code=$(req POST "/api/admin/communities/$COMMUNITY_ID/reminders/run")
SENT=$(json sent)
[ "$code" = "200" ] && pass "pengingat dummy dijalankan (terkirim: ${SENT:-0})" || flop "pengingat" "$code $(cat "$BODY")"

code=$(curl -s -o "$BODY" -w '%{http_code}' -b "$JAR" "$BASE/api/admin/communities/$COMMUNITY_ID/arrears.csv")
[ "$code" = "200" ] && grep -q 'nama;rt;telepon' "$BODY" && pass "ekspor CSV tunggakan (termasuk kolom RT)" || flop "CSV" "$code"

code=$(req POST "/api/admin/communities/$COMMUNITY_ID/anchor")
case "$code" in
  200|201) pass "anchor harian dibuat/idempoten (HTTP $code)" ;;
  *) flop "anchor" "$code $(cat "$BODY")" ;;
esac

# 9a. bersihkan paket uji agar data demo tetap dua paket
code=$(req DELETE "/api/admin/packages/$PKG_ID")
[ "$code" = "204" ] && pass "paket uji dihapus kembali (204)" || flop "hapus paket" "$code $(cat "$BODY")"

# 9. payment gateway dummy -> ledger (FR-09)
sign_body() {
  node -e "const c=require('node:crypto');process.stdout.write(c.createHmac('sha256','dev-only-secret-change-me').update(process.argv[1]).digest('hex'))" "$1"
}

post_signed() { # body -> http code, respons di BODY
  local body="$1" sig
  sig=$(sign_body "$body")
  curl -s -o "$BODY" -w '%{http_code}' -X POST "$BASE/api/webhooks/payment/dummy" \
    -H 'Content-Type: application/json' -H "X-Dummy-Signature: $sig" -d "$body"
}

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
GW_ENTRIES_BEFORE=$(json totals.entries)
GW_COLLECTED_BEFORE=$(json totals.collected)

code=$(req POST /api/dev/payments/simulate "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"amount\":15000,\"method\":\"QRIS\"}")
GW_REF=$(json invoice.providerRef)
GW_DEPOSIT=$(json deposit.id)
GW_PENDING=$(json deposit.status)
[ "$code" = "201" ] && [ -n "$GW_REF" ] && [ "$GW_PENDING" = "PENDING" ] && pass "invoice dummy + deposit PENDING dibuat ($GW_REF)" || flop "invoice dummy" "$code $(cat "$BODY")"

GW_BODY=$(printf '{"providerRef":"%s","status":"PAID","amount":15000}' "$GW_REF")
code=$(post_signed "$GW_BODY")
GW_OUTCOME=$(json outcome)
GW_SEQ=$(json ledgerSeq)
[ "$code" = "200" ] && [ "$GW_OUTCOME" = "PAID" ] && [ -n "$GW_SEQ" ] && pass "webhook PAID menulis entri ledger #$GW_SEQ" || flop "webhook PAID" "$code $(cat "$BODY")"

code=$(post_signed "$GW_BODY")
GW_OUTCOME=$(json outcome)
GW_SEQ_AGAIN=$(json ledgerSeq)
[ "$code" = "200" ] && [ "$GW_OUTCOME" = "ALREADY_PAID" ] && [ "$GW_SEQ_AGAIN" = "$GW_SEQ" ] && pass "webhook PAID ulang idempoten (entri #$GW_SEQ_AGAIN tidak bertambah)" || flop "webhook idempoten" "$code $GW_OUTCOME $GW_SEQ_AGAIN"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
GW_ENTRIES_AFTER=$(json totals.entries)
GW_COLLECTED_AFTER=$(json totals.collected)
[ "$GW_ENTRIES_AFTER" = "$((GW_ENTRIES_BEFORE + 1))" ] && pass "webhook 3x hanya menambah 1 entri" || flop "hitung entri gateway" "$GW_ENTRIES_BEFORE -> $GW_ENTRIES_AFTER"
[ "$GW_COLLECTED_AFTER" = "$((GW_COLLECTED_BEFORE + 15000))" ] && pass "total terkumpul naik sesuai nominal gateway (15000)" || flop "total gateway" "$GW_COLLECTED_BEFORE -> $GW_COLLECTED_AFTER"

code=$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$BASE/api/webhooks/payment/dummy" \
  -H 'Content-Type: application/json' -H 'X-Dummy-Signature: deadbeef' -d "$GW_BODY")
[ "$code" = "401" ] && pass "webhook dengan signature salah ditolak (401)" || flop "webhook invalid" "$code"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
[ "$(json totals.entries)" = "$GW_ENTRIES_AFTER" ] && pass "webhook signature salah tidak menulis ledger" || flop "ledger bocor" "$(json totals.entries)"

code=$(post_signed '{"providerRef":"DUMMY-TIDAK-ADA","status":"PAID"}')
[ "$code" = "404" ] && pass "webhook invoice tak dikenal ditolak (404)" || flop "webhook unknown" "$code"

code=$(req POST /api/dev/payments/simulate "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"amount\":20000,\"method\":\"VA\"}")
GW_REF_MISMATCH=$(json invoice.providerRef)
MISMATCH_BODY=$(printf '{"providerRef":"%s","status":"PAID","amount":15000}' "$GW_REF_MISMATCH")
code=$(post_signed "$MISMATCH_BODY")
[ "$code" = "400" ] && [ "$(json error)" = "AMOUNT_MISMATCH" ] && pass "webhook dengan nominal tidak cocok ditolak (AMOUNT_MISMATCH)" || flop "nominal webhook" "$code $(cat "$BODY")"

code=$(req POST /api/dev/payments/simulate "{\"providerRef\":\"$GW_REF_MISMATCH\",\"status\":\"FAILED\"}")
GW_FAILED=$(json outcome)
[ "$code" = "200" ] && [ "$GW_FAILED" = "FAILED" ] && pass "invoice dummy bisa ditandai FAILED lewat dev endpoint" || flop "invoice FAILED" "$code $GW_FAILED"

# 9b. konkurensi: 5 webhook PAID bersamaan untuk invoice yang sama -> 1 entri
code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
CONC_BEFORE=$(json totals.entries)
code=$(req POST /api/dev/payments/simulate "{\"communityId\":$COMMUNITY_ID,\"memberId\":$MEMBER_ID,\"amount\":12000,\"method\":\"QRIS\"}")
CONC_REF=$(json invoice.providerRef)
CONC_BODY=$(printf '{"providerRef":"%s","status":"PAID","amount":12000}' "$CONC_REF")
CONC_SIG=$(sign_body "$CONC_BODY")
rm -f /tmp/gw-conc-*.code /tmp/gw-conc-*.json
CONC_PIDS=()
for i in 1 2 3 4 5; do
  curl -s -o "/tmp/gw-conc-$i.json" -w '%{http_code}' -X POST "$BASE/api/webhooks/payment/dummy" \
    -H 'Content-Type: application/json' -H "X-Dummy-Signature: $CONC_SIG" -d "$CONC_BODY" \
    > "/tmp/gw-conc-$i.code" &
  CONC_PIDS+=($!)
done
wait "${CONC_PIDS[@]}"
CONC_OK=0
for f in /tmp/gw-conc-*.code; do
  [ "$(cat "$f")" = "200" ] && CONC_OK=$((CONC_OK + 1))
done
[ "$CONC_OK" = "5" ] && pass "5 webhook paralel untuk satu invoice semuanya 200" || flop "webhook paralel" "$CONC_OK/5"

code=$(req GET "/api/dev/payments/$CONC_REF")
CONC_STATUS=$(json invoice.status)
CONC_SEQ=$(json invoice.ledgerSeq)
[ "$code" = "200" ] && [ "$CONC_STATUS" = "PAID" ] && [ -n "$CONC_SEQ" ] && pass "invoice paralel PAID dengan entri #$CONC_SEQ" || flop "invoice paralel" "$code $CONC_STATUS $CONC_SEQ"

code=$(req GET "/api/admin/communities/$COMMUNITY_ID/summary")
CONC_AFTER=$(json totals.entries)
[ "$CONC_AFTER" = "$((CONC_BEFORE + 1))" ] && pass "5 webhook paralel hanya menambah 1 entri" || flop "entri paralel" "$CONC_BEFORE -> $CONC_AFTER"

echo
echo "HASIL: $PASS lolos, $FAIL gagal"
if [ "$FAIL" -ne 0 ]; then
  echo "--- 10 baris terakhir log API ---"
  tail -10 /tmp/scff-smoke-api.log
  exit 1
fi
