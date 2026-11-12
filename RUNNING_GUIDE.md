# Panduan Menjalankan KasWarga di Emulator Android

_File ini disimpan di `RUNNING_GUIDE.md` di root proyek._

---

## 1. Prasyarat

| Komponen | Versi / Catatan |
|---|---|
| **OS** | Windows 10/11 (tested) |
| **Java** | OpenJDK 25 via Android Studio `jbr`: `C:\Program Files\Android\Android Studio\jbr` |
| **Android SDK** | `cmdline-tools` versi terbaru (13114758) |
| **Flutter** | `flutter` di PATH, `flutter doctor` tanpa error |
| **Git** | untuk checkout branch `main` |

> **Penting**: Semua perintah PowerShell 5.1 tidak mendukung `&&` dan redirect `2>nul`. Gunakan `;` atau `cmd /c "command"`.

---

## 2. Instal Android SDK & Licenses

```powershell
# 1. Unduh zip commandlinetools-win-13114758_latest.zip
# 2. Ekstrak ke folder sementara, lalu pindahkan:
mkdir "%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest"
Expand-Archive -Path "commandlinetools-win-13114758_latest.zip" -DestinationPath "%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\"

# 3. Set PATH (satu kali di PowerShell baru)
$env:PATH += ";%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin"

# 4. Terima lisensi (tidak bisa pakai redirect `<` di PowerShell)
@"
y
y
y
y
y
y
y
y
y
y
" | Set-Content "$env:TEMP\ys.txt"
& "$env:TEMP\ys.txt" | % { & "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager" --install "platforms;android-37" --accept-license}
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager" --install "platform-tools" --accept-license
```

> *Jika `sdkmanager` menanyakan komponen lain, teruskan saja — butuh minimal `platform-tools` dan `platforms;android-37`.*

---

## 3. Konfigurasi JAVA_HOME (harus setiap sesi PowerShell)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
# Contoh pakai di sesi selanjutnya:
& "C:\flutter\bin\flutter.bat" doctor
```

---

## 4. Atasi konflik ADB (double adb)

Ada adb lama di `C:\adb\adb.exe` (v1.0.32) yang selalu membunuh server baru.

```powershell
# Nonaktifkan adb lama dengan cara rename
rename "C:\adb\adb.exe" "C:\adb\adb-OLD-1.0.32.exe"

# Selalu pakai path penuh ke platform-tools
# Contoh perintah di bawah:
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" version
```

---

## 5. Luncurkan Emulator AVD `KasWarga`

```powershell
# Cek daftar AVD yang tersedia
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" emulators --list

# Luncurkan (tanpa audio biar cepat, tanpa snapshot)
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd KasWarga -no-snapshot -no-audio

# Tunggu device ready (bisa di shell terpisah)
# Perintah polling di PowerShell:
while (-not ("C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" shell getprop sys.boot_completed")) { Start-Sleep 1 }
echo "Emulator boot complete"
```

*Emulator specs: API 37, 1080×2400 @420dpi, `emulator-5554`.*

---

## 6. Jalankan API Server (Node.js)

```powershell
# 1. Masuk ke folder API
cd D:\S1 TRANSFER\INOVASI PEMBAYARAN DIGITAL\KasWarga\apps\api

# 2. Install dependensi (jika belum)
npm install

# 3. Jalankan server (port 4000)
#   Catatan: jangan pakai `start -Process` karena akan tertukar dengan adb;
#   cukup jalankan di terminal ini: node src/index.js
npm run dev   # atau: node src/index.js
```

*Server akan cetak `[api] ready` dan `/health` mengembalikan `{"status":"ok",...}`.*

---

## 7. Build & Install APK di Emulator

```powershell
# 1. Build APK debug (dari folder mobile)
cd D:\S1 TRANSFER\INOVASI PEMBAYARAN DIGITAL\KasWarga\apps\mobile
flutter build apk --debug

# 2. Install ke emulator (pastikan emulator sudah boot)
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" install -r build\app\outputs\flutter-apk\app-debug.apk

# 3. Jalankan activity
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" shell am start -n id.kaswarga.kaswarga_mobile/.MainActivity
```

*Jika muncul peringatan "Activity not started, intent delivered to current top-most instance", tutup dan jalankan ulang perintah `adb shell am force-stop id.kaswarga.kaswarga_mobile` lalu start lagi.*

---

## 8. Login pertama

| Kredensial | Email | Password |
|---|---|---|
| **Bendahara** | bendahara@gmail.com | 12345678 |
| **Super Admin** | admin@gmail.com | 12345678 |

Setelah login, aplikasi akan langsung masuk ke **Dashboard** menampilkan:

- Komunitas **R2 09 Dukuh Tlobong** (6 anggota, kas Rp 4.700.000, tunggakan Rp 233.000)
- Tab **Anggota** menampilkan 6 nama dengan status Lunas/Tunggakan
- Tab **Paket** dan **Cicilan** sesuai data

> *Catapan login pertama bisa memerlukan klik **"Masuk"** setelah form muncul. Jika kotak keyboard menutup sendiri, tekan tombol Back (keyevent 4) lalu coba lagi.*

---

## 9. (Opsional) Verifikasi login otomatis via ADB (jika ingin otomatis)

```powershell
# Pastikan TalkBack aktif (sudah terinstall di image API 37)
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" shell settings put secure accessibility_enabled 1

# Koordinat tap (dari dump uiautomator) — tap ganda (double-tap activate di TalkBack)
# Email
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" shell input tap 540 615; input tap 540 615
input text "bendahara@gmail.com"; keyevent 4   # tutup keyboard
# Password
input tap 540 785; input tap 540 785
input text "12345678"; keyevent 4
# Masuk
input tap 540 968; input tap 540 968
Start-Sleep 12

# Cek log
"C:\Users\acer_\AppData\Local\Android\sdk\platform-tools\adb.exe" logcat -d -s flutter | Select-String "api\]"
```

> *Jika muncul `[api] GET http://10.0.2.2:4000/api/auth/me → 400 :: {"error":"INVALID_JSON"}`, itu **bug lama** sudah diedit di `api_client.dart` (commit `a9dcfe0`). Restart APK setelah edit.*

---

## 10. catatan tambahan

- **Base URL**: Aplikasi mobile secara default ke `http://10.0.2.2:4000` (LAN emulator ke host). Jika IP fisik berbeda, ubah di `apps/mobile/lib/api_client.dart` (field `defaultBase`).
- **Rate limit API publik**: `?community=3` tanpa token terbatas 20 request/menit per IP.
- **Hapus data lama**: `docker compose down -v` di root akan menghapus token publik & data seed; jalankan `npm run dev` lagi setelah itu.
- **Jalankan ulang server**: Jika `npm run dev` sebelumnya terakhir diaborts, pastikan port 4000 tidak dipakai proses lain: `netstat -ano | findstr :4000`.

---

## 11. Struktur commit terkini (branch `main`)

```
44539cb feat: aplikasi mobile Flutter (tema orange clean, charts) + endpoint analytics
a9dcfe0 fix(mobile): kirim body hanya bila ada (GET tanpa body) - API mem-parse 'null' sebagai INVALID_JSON
7ace6f1 fix: bootstrap kirim memberCount per komunitas; mobile default pilih komunitas beranggota terbanyak
77d80d8 chore: buang file sampah IDE dari git (folder KasWarga/, devtools_options)
```

Jika ada kendala langkah demi langkah, cek log `flutter analyze`, `adb logcat -s flutter`, dan `npm run dev` output untuk diagnosis. Selamat mencoba!