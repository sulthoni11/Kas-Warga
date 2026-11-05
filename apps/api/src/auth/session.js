import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '../db.js';

export const SESSION_COOKIE = 'scff_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function hashToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Token mentah hanya ada di cookie; database menyimpan hash-nya. */
export async function createSession(userId) {
  const raw = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getPool().query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, hashToken(raw), toSqlDateTime(expiresAt)],
  );

  return { raw, expiresAt };
}

export async function findSessionUser(rawToken) {
  if (!rawToken) return null;

  const [rows] = await getPool().query(
    `SELECT u.id, u.email, u.role, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = 1
      LIMIT 1`,
    [hashToken(rawToken)],
  );

  return rows[0] ?? null;
}

export async function destroySession(rawToken) {
  if (!rawToken) return;
  await getPool().query('DELETE FROM sessions WHERE token_hash = ?', [hashToken(rawToken)]);
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // aktifkan di produksi (HTTPS)
  path: '/',
  maxAge: SESSION_TTL_MS,
};
