/**
 * Menjalankan API dan web sekaligus, lintas shell (PowerShell, cmd, bash).
 *
 * Dipakai oleh: npm run dev
 * Tidak memakai "&" karena di PowerShell operator itu bukan pemisah perintah,
 * dan di cmd.exe "&" menjalankan perintah secara berurutan (bukan paralel).
 */
import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const tasks = [
  { name: 'api', args: ['run', 'dev:api'] },
  { name: 'web', args: ['run', 'dev:web'] },
];

const children = tasks.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    console.log(`[dev] proses "${name}" berhenti (kode ${code ?? signal})`);
  });

  child.on('error', (error) => {
    console.error(`[dev] gagal menjalankan "${name}":`, error.message);
  });

  return child;
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[dev] ${signal} diterima, menghentikan API dan web...`);
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  // Beri kesempatan proses anak menutup koneksi DB sebelum keluar.
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
