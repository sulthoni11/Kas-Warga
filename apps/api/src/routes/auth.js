import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db.js';
import { verifyPassword } from '../auth/passwords.js';
import {
  createSession,
  destroySession,
  findSessionUser,
  readCookie,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../auth/session.js';

export const authRouter = Router();

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
    }

    const { email, password } = parsed.data;
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT id, email, role, password_hash, is_active, failed_attempts, locked_until
         FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()],
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const [lockRows] = await pool.query(
      'SELECT (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS locked FROM users WHERE id = ?',
      [user.id],
    );
    if (Number(lockRows[0]?.locked) === 1) {
      return res.status(423).json({ error: 'ACCOUNT_LOCKED', minutes: LOCK_MINUTES });
    }

    if (!verifyPassword(password, user.password_hash)) {
      const failed = Number(user.failed_attempts) + 1;
      if (failed >= MAX_FAILED) {
        await pool.query(
          'UPDATE users SET failed_attempts = 0, locked_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE) WHERE id = ?',
          [LOCK_MINUTES, user.id],
        );
        return res.status(423).json({ error: 'ACCOUNT_LOCKED', minutes: LOCK_MINUTES });
      }
      await pool.query('UPDATE users SET failed_attempts = ? WHERE id = ?', [failed, user.id]);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', remaining: MAX_FAILED - failed });
    }

    await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [
      user.id,
    ]);

    const session = await createSession(user.id);
    res.cookie(SESSION_COOKIE, session.raw, sessionCookieOptions);

    return res.json({ user: { id: Number(user.id), email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await destroySession(readCookie(req, SESSION_COOKIE));
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await findSessionUser(readCookie(req, SESSION_COOKIE));
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    return res.json({ user: { id: Number(user.id), email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});
