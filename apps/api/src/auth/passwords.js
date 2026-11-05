import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * scrypt (bawaan Node) dipakai agar tidak perlu modul native Argon2id di Windows.
 * scrypt tetap memory-hard; format penyimpanan menyertakan parameter agar bisa
 * dimigrasikan ke Argon2id tanpa memutus hash lama.
 */
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

export function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, n, r, p, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(plain, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEM,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
