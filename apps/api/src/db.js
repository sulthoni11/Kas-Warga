import mysql from 'mysql2/promise';
import { config } from './config.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: config.DB_POOL_MAX,
      namedPlaceholders: true,
      timezone: 'Z',
      // DATETIME/DATE dikembalikan sebagai string apa adanya agar hash rantai
      // bisa dihitung ulang tanpa konversi zona waktu yang bisa bergeser.
      dateStrings: ['DATE', 'DATETIME'],
    });
  }
  return pool;
}

/** Dipakai endpoint /health/db — tidak melempar error, hanya mengembalikan boolean. */
export async function ping() {
  const [rows] = await getPool().query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
